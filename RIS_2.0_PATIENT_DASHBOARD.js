const STORAGE_KEY = "lghMedicationOrdersV1";
const MAIN_MENU_PAGE = "RIS_2.0_Reference_Print_Updated.html";

let sourceOrders = [];
let activeRoomFilter = "";

/* Mirrors HGB_FREQUENCY_USAGE / normalizeHgbFrequency from the main
   Medication Order app so the dashboard shows the same CBG frequency
   without needing to load that whole script. */
const HGB_FREQUENCY_USAGE = {
    "OD":  { defaultPerShift: 1 },
    "TID": { defaultPerShift: 1 },
    "Q6":  { defaultPerShift: 1 },
    "Q4":  { defaultPerShift: 2 }
};

function normalizeHgbFrequency(order) {
    const saved = String(order?.hgbFrequency || "").toUpperCase();
    if (HGB_FREQUENCY_USAGE[saved]) return saved;

    if (order?.hgbSelected) {
        const oldQuantity = Number(order.hgbStripsPerShift || 0);
        if (oldQuantity === 6) return "Q4";
        if (oldQuantity === 4) return "Q6";
        if (oldQuantity === 3) return "TID";
        return "OD";
    }
    return "";
}

const ACUITY_LEVELS = [
    { value: "", label: "Not set" },
    { value: "I", label: "Level I \u2013 Minimal / self-care" },
    { value: "II", label: "Level II \u2013 Moderate care" },
    { value: "III", label: "Level III \u2013 Highly dependent" },
    { value: "IV", label: "Level IV \u2013 Highly critical / intensive" }
];

const ROOM_ORDER = ["901", "902", "903", "904", "905", "906"];

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
}

function getMedicationOrders() {
    try { return JSON.parse(RISStore.getItem(STORAGE_KEY)) || []; }
    catch (_) { return []; }
}

function levelClass(value) {
    const normalized = String(value || "").toUpperCase();
    if (normalized === "I") return "level-i";
    if (normalized === "II") return "level-ii";
    if (normalized === "III") return "level-iii";
    if (normalized === "IV") return "level-iv";
    return "";
}

function roomKey(order) {
    return String(order?.roomNumber || "").trim();
}

/* ---------- Load data ---------- */

function populateFromOrders(orders) {
    sourceOrders = Array.isArray(orders) ? orders : [];
    renderDashboardTable();
}

function reloadDashboardPatients() {
    populateFromOrders(getMedicationOrders());
}

// Keep the dashboard in sync if a patient is edited in another tab.
window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) reloadDashboardPatients();
});

// Keep the dashboard fresh whenever the user comes back to this tab
// (e.g. after saving a patient on the Medication Order page and then
// clicking back / re-opening the dashboard tab).
window.addEventListener("focus", reloadDashboardPatients);
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") reloadDashboardPatients();
});

/* ---------- Render ---------- */

function filterDashboardRoom(room) {
    activeRoomFilter = room || "";
    renderDashboardTable();
}

function matchesSearch(order, search) {
    if (!search) return true;
    return String(order.patientName || "").toLowerCase().includes(search) ||
        String(order.hospitalNo || "").toLowerCase().includes(search) ||
        String(order.roomNumber || "").toLowerCase().includes(search);
}

function sortOrders(orders, sortBy) {
    const sorted = [...orders];
    if (sortBy === "name") {
        sorted.sort((a, b) => String(a.patientName || "").localeCompare(String(b.patientName || ""), undefined, { sensitivity: "base" }));
    } else if (sortBy === "level") {
        const rank = { "IV": 0, "III": 1, "II": 2, "I": 3, "": 4 };
        sorted.sort((a, b) => (rank[String(a.acuityLevel || "").toUpperCase()] ?? 4) - (rank[String(b.acuityLevel || "").toUpperCase()] ?? 4));
    } else if (sortBy === "cbg") {
        sorted.sort((a, b) => Number(Boolean(normalizeHgbFrequency(b))) - Number(Boolean(normalizeHgbFrequency(a))));
    } else {
        // room (default): known rooms in fixed order, then any other room, then name
        sorted.sort((a, b) => {
            const roomA = roomKey(a), roomB = roomKey(b);
            const idxA = ROOM_ORDER.includes(roomA) ? ROOM_ORDER.indexOf(roomA) : ROOM_ORDER.length;
            const idxB = ROOM_ORDER.includes(roomB) ? ROOM_ORDER.indexOf(roomB) : ROOM_ORDER.length;
            if (idxA !== idxB) return idxA - idxB;
            if (roomA !== roomB) return roomA.localeCompare(roomB, undefined, { numeric: true });
            return String(a.patientName || "").localeCompare(String(b.patientName || ""), undefined, { sensitivity: "base" });
        });
    }
    return sorted;
}

function renderDashboardTable() {
    const tbody = document.getElementById("dashRows");
    const search = (document.getElementById("dashSearch")?.value || "").trim().toLowerCase();
    const sortBy = document.getElementById("dashSort")?.value || "room";

    document.querySelectorAll(".dash-room-chip").forEach(chip => {
        chip.classList.toggle("is-active", activeRoomFilter && chip.classList.contains("dash-room-" + activeRoomFilter));
    });

    let filtered = sourceOrders.filter(order => {
        if (!order || (!order.patientName && !order.hospitalNo && !order.roomNumber)) return false;
        if (activeRoomFilter && roomKey(order) !== activeRoomFilter) return false;
        return matchesSearch(order, search);
    });

    filtered = sortOrders(filtered, sortBy);

    document.getElementById("dashCount").textContent =
        `Showing ${filtered.length} of ${sourceOrders.length}`;

    if (!filtered.length) {
        tbody.innerHTML = `<tr class="dash-empty-row"><td colspan="5">No patients match this search.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(order => {
        const room = roomKey(order);
        const isKnownRoom = ROOM_ORDER.includes(room);
        const frequency = normalizeHgbFrequency(order);
        const cbgHtml = frequency
            ? `<span class="dash-cbg has-cbg">${escapeHtml(frequency)}</span>`
            : `<span class="dash-cbg no-cbg">&mdash;</span>`;
        const roomBadgeClass = isKnownRoom ? "dash-room-" + room : "";
        const level = String(order.acuityLevel || "").toUpperCase();

        return `
        <tr ${isKnownRoom ? `data-room="${escapeHtml(room)}"` : (room ? `data-room-other="1"` : "")}>
            <td class="dash-col-name">
                <button type="button" class="dash-name-link" onclick="openInMedicationForm('${escapeHtml(order.id)}')">
                    ${escapeHtml(order.patientName || "Unnamed Patient")}
                </button>
            </td>
            <td class="dash-col-hosp"><span class="dash-hosp">${escapeHtml(order.hospitalNo || "&mdash;")}</span></td>
            <td class="dash-col-room">
                <span class="dash-room-badge ${roomBadgeClass}">${escapeHtml(room || "&mdash;")}</span>
            </td>
            <td class="dash-col-cbg">${cbgHtml}</td>
            <td class="dash-col-level">
                <select class="dash-level-select ${levelClass(level)}"
                        aria-label="Acuity level for ${escapeHtml(order.patientName || 'patient')}"
                        onchange="updateAcuityLevel('${escapeHtml(order.id)}', this.value, this)">
                    ${ACUITY_LEVELS.map(opt =>
                        `<option value="${opt.value}" ${opt.value === level ? "selected" : ""}>${escapeHtml(opt.label)}</option>`
                    ).join("")}
                </select>
            </td>
        </tr>`;
    }).join("");
}

/* ---------- Actions ---------- */

function updateAcuityLevel(id, value, selectEl) {
    if (selectEl) {
        selectEl.className = "dash-level-select " + levelClass(value);
    }

    const index = sourceOrders.findIndex(order => order.id === id);
    if (index >= 0) sourceOrders[index].acuityLevel = value;

    const orders = getMedicationOrders();
    const storedIndex = orders.findIndex(order => order.id === id);
    if (storedIndex >= 0) {
        orders[storedIndex].acuityLevel = value;
        orders[storedIndex].updatedAt = new Date().toISOString();
        try { RISStore.setItem(STORAGE_KEY, JSON.stringify(orders)); } catch (_) {}
    }
}

function openInMedicationForm(id) {
    window.location.href = MAIN_MENU_PAGE + "?openOrder=" + encodeURIComponent(id);
}

/* ---------- Init ---------- */

populateFromOrders(getMedicationOrders());
