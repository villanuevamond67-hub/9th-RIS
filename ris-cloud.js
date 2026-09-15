(function () {
    "use strict";

    const APP_KEYS = [
        "lghMedicationOrdersV1",
        "lghMedicationDatabaseV1",
        "lghDietListV1",
        "lghDietOptionsV1",
        "lghDietPrintPaperV1",
        "lghKardexExtrasV1",
        "lghVitalSignsSheetV1"
    ];
    const LAST_USER_KEY = "risLastUserId";
    const pendingWrites = new Map();
    const writeTimers = new Map();
    let client = null;
    let user = null;
    let channel = null;

    function configured() {
        const config = window.RIS_SUPABASE_CONFIG || {};
        return /^https:\/\/.+\.supabase\.co\/?$/.test(config.url || "") &&
            config.anonKey && !config.anonKey.startsWith("YOUR_");
    }

    function configurationError() {
        return new Error("Supabase is not configured. Add the project URL and anon key in supabase-config.js.");
    }

    function rawGet(key) {
        try { return localStorage.getItem(key); } catch (_) { return null; }
    }

    function rawSet(key, value) {
        try { localStorage.setItem(key, String(value)); } catch (_) {}
    }

    function rawRemove(key) {
        try { localStorage.removeItem(key); } catch (_) {}
    }

    function clearAppCache() {
        APP_KEYS.forEach(rawRemove);
    }

    async function writeNow(key) {
        if (!client || !user || !pendingWrites.has(key)) return;
        const value = pendingWrites.get(key);
        pendingWrites.delete(key);
        const { error } = await client.from("ris_user_data").upsert({
            user_id: user.id,
            storage_key: key,
            value: value,
            updated_at: new Date().toISOString()
        }, { onConflict: "user_id,storage_key" });
        if (error) {
            pendingWrites.set(key, value);
            console.error("RIS cloud save failed:", error.message);
            window.dispatchEvent(new CustomEvent("ris-cloud-error", { detail: error.message }));
        } else {
            window.dispatchEvent(new CustomEvent("ris-cloud-saved", { detail: key }));
        }
    }

    function queueWrite(key, value) {
        if (!APP_KEYS.includes(key) || !client || !user) return;
        pendingWrites.set(key, String(value));
        clearTimeout(writeTimers.get(key));
        writeTimers.set(key, setTimeout(() => {
            writeTimers.delete(key);
            writeNow(key);
        }, 400));
    }

    async function removeCloudValue(key) {
        if (!APP_KEYS.includes(key) || !client || !user) return;
        const { error } = await client.from("ris_user_data")
            .delete()
            .eq("user_id", user.id)
            .eq("storage_key", key);
        if (error) console.error("RIS cloud delete failed:", error.message);
    }

    window.RISStore = {
        getItem: rawGet,
        setItem(key, value) {
            rawSet(key, value);
            queueWrite(key, value);
        },
        removeItem(key) {
            rawRemove(key);
            removeCloudValue(key);
        },
        async flush() {
            writeTimers.forEach(timer => clearTimeout(timer));
            writeTimers.clear();
            await Promise.all([...pendingWrites.keys()].map(writeNow));
        }
    };

    function dispatchStorageChange(key, newValue) {
        window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
        window.dispatchEvent(new CustomEvent("ris-cloud-change", { detail: { key, newValue } }));
    }

    async function hydrate() {
        const previousUser = rawGet(LAST_USER_KEY);
        const { data, error } = await client.from("ris_user_data")
            .select("storage_key,value")
            .eq("user_id", user.id);
        if (error) throw error;

        const rows = Array.isArray(data) ? data : [];
        if (rows.length) {
            clearAppCache();
            rows.forEach(row => {
                if (APP_KEYS.includes(row.storage_key)) rawSet(row.storage_key, row.value);
            });
        } else if (!previousUser || previousUser === user.id) {
            const localRows = APP_KEYS
                .map(key => ({ key, value: rawGet(key) }))
                .filter(row => row.value !== null);
            await Promise.all(localRows.map(row => {
                pendingWrites.set(row.key, row.value);
                return writeNow(row.key);
            }));
        } else {
            clearAppCache();
        }
        rawSet(LAST_USER_KEY, user.id);
    }

    function subscribe() {
        channel = client.channel("ris-user-data-" + user.id)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "ris_user_data",
                filter: "user_id=eq." + user.id
            }, payload => {
                const key = payload.new?.storage_key || payload.old?.storage_key;
                if (!APP_KEYS.includes(key)) return;
                const value = payload.eventType === "DELETE" ? null : payload.new.value;
                if (value === null) rawRemove(key); else rawSet(key, value);
                dispatchStorageChange(key, value);
            })
            .subscribe();
    }

    function addAccountBar() {
        const bar = document.createElement("div");
        bar.className = "ris-account-bar no-print";
        bar.innerHTML = `<span class="ris-sync-dot" aria-hidden="true"></span><span class="ris-account-email"></span><button type="button" class="ris-signout">SIGN OUT</button>`;
        bar.querySelector(".ris-account-email").textContent = user.email || "Signed in";
        bar.querySelector(".ris-signout").addEventListener("click", async () => {
            await window.RISStore.flush();
            if (channel) await client.removeChannel(channel);
            await client.auth.signOut();
            clearAppCache();
            location.replace("login.html");
        });
        document.body.appendChild(bar);

        window.addEventListener("ris-cloud-error", () => bar.classList.add("has-error"));
        window.addEventListener("ris-cloud-saved", () => bar.classList.remove("has-error"));
    }

    async function initialize(options) {
        if (!configured()) throw configurationError();
        if (!window.supabase?.createClient) throw new Error("Unable to load the Supabase client.");

        const config = window.RIS_SUPABASE_CONFIG;
        client = window.supabase.createClient(config.url, config.anonKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        window.RISSupabase = client;

        client.auth.onAuthStateChange(event => {
            if (event === "SIGNED_OUT" && !location.pathname.endsWith("login.html")) {
                clearAppCache();
                location.replace("login.html");
            }
        });

        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        user = data.session?.user || null;

        if (!user && options?.requireAuth !== false) {
            const next = encodeURIComponent(location.pathname.split("/").pop() + location.search);
            location.replace("login.html?next=" + next);
            return new Promise(() => {});
        }
        if (!user) return { client, user: null };

        await hydrate();
        subscribe();
        addAccountBar();
        document.documentElement.classList.add("ris-ready");
        return { client, user };
    }

    window.RISCloud = { initialize, configured, get client() { return client; }, get user() { return user; } };
    window.addEventListener("pagehide", () => window.RISStore.flush());
})();
