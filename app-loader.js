(function () {
    "use strict";
    const loader = document.currentScript;
    const appScript = loader?.dataset.appScript;

    function showFatal(error) {
        const panel = document.createElement("div");
        panel.className = "ris-fatal-error";
        panel.innerHTML = "<strong>RIS could not start.</strong><p></p><a href=\"login.html\">Return to sign in</a>";
        panel.querySelector("p").textContent = error?.message || "Unknown startup error.";
        document.body.appendChild(panel);
    }

    window.RIS_BOOTSTRAP = window.RISCloud.initialize({ requireAuth: true });
    window.RIS_BOOTSTRAP.then(() => {
        if (!appScript) return;
        const script = document.createElement("script");
        script.src = appScript;
        script.onerror = () => showFatal(new Error("Unable to load " + appScript));
        document.body.appendChild(script);
    }).catch(showFatal);
})();
