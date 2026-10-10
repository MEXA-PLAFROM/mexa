/* ==================================================
   MEXA THEMES — PENGELOLA TEMA
   File: themes.js
   ================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "mexa-theme";
  const DEFAULT_THEME = "midnight";

  const THEMES = [
    { id: "midnight", name: "Midnight Neon", color: "#8b5cf6" },
    { id: "arctic", name: "Arctic Light", color: "#0891b2" },
    { id: "emerald", name: "Emerald", color: "#10b981" },
    { id: "sunset", name: "Sunset", color: "#f97316" },
    { id: "cyberpunk", name: "Cyberpunk", color: "#ec4899" }
  ];

  let panel = null;
  let initialized = false;

  function getTheme(id) {
    return THEMES.find(function (theme) {
      return theme.id === id;
    }) || null;
  }

  function getCurrent() {
    return document.documentElement.dataset.theme
      || document.body.dataset.theme
      || DEFAULT_THEME;
  }

  function saveTheme(id) {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch (error) {
      console.warn("MEXA: tema tidak dapat disimpan.", error);
    }
  }

  function refreshButtons() {
    if (!panel) return;

    const current = getCurrent();

    panel.querySelectorAll("[data-mexa-theme]").forEach(function (button) {
      const active = button.dataset.mexaTheme === current;

      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);

      const check = button.querySelector(".mx-theme-check");
      if (check) check.textContent = active ? "✓" : "";
    });
  }

  function setTheme(id) {
    const theme = getTheme(id);

    if (!theme) {
      console.warn("MEXA: tema tidak dikenal:", id);
      return false;
    }

    document.documentElement.dataset.theme = theme.id;
    document.body.dataset.theme = theme.id;

    saveTheme(theme.id);
    refreshButtons();

    document.dispatchEvent(new CustomEvent("mexa:themechange", {
      detail: {
        theme: theme.id,
        name: theme.name
      }
    }));

    return true;
  }

  function close() {
    if (panel) panel.hidden = true;
  }

  function open() {
    ensurePanel();

    if (!panel) {
      console.error("MEXA: panel tema gagal dibuat.");
      return false;
    }

    panel.hidden = false;
    refreshButtons();
    return true;
  }

  function toggle() {
    if (!panel || panel.hidden) {
      return open();
    }

    close();
    return true;
  }

  function ensurePanel() {
    if (panel && panel.isConnected) return;

    const container =
      document.getElementById("mexa-theme-container") || document.body;

    panel = document.getElementById("mexa-theme-panel");

    if (panel) {
      refreshButtons();
      return;
    }

    panel = document.createElement("section");
    panel.id = "mexa-theme-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Pilihan tema MEXA");

    const header = document.createElement("div");
    header.className = "mx-theme-header";

    const title = document.createElement("h3");
    title.textContent = "Tema MEXA";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "mx-theme-close";
    closeButton.textContent = "✕";
    closeButton.setAttribute("aria-label", "Tutup pilihan tema");
    closeButton.addEventListener("click", close);

    header.append(title, closeButton);
    panel.appendChild(header);

    const description = document.createElement("p");
    description.className = "mx-theme-description";
    description.textContent = "Pilih tampilan MEXA yang kamu suka.";
    panel.appendChild(description);

    const list = document.createElement("div");
    list.className = "mx-theme-list";

    THEMES.forEach(function (theme) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.mexaTheme = theme.id;
      button.className = "mx-theme-option";
      button.setAttribute("aria-pressed", "false");

      const dot = document.createElement("span");
      dot.className = "mx-theme-dot";
      dot.style.backgroundColor = theme.color;
      dot.setAttribute("aria-hidden", "true");

      const name = document.createElement("span");
      name.className = "mx-theme-name";
      name.textContent = theme.name;

      const check = document.createElement("span");
      check.className = "mx-theme-check";
      check.setAttribute("aria-hidden", "true");

      button.append(dot, name, check);

      button.addEventListener("click", function () {
        if (setTheme(theme.id)) {
          close();
        }
      });

      list.appendChild(button);
    });

    panel.appendChild(list);
    container.appendChild(panel);

    refreshButtons();
  }

  function init() {
    if (initialized) return;
    initialized = true;

    ensurePanel();

    let savedTheme = DEFAULT_THEME;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && getTheme(stored)) {
        savedTheme = stored;
      }
    } catch (error) {
      console.warn("MEXA: tidak dapat membaca tema tersimpan.", error);
    }

    setTheme(savedTheme);
  }

  // API yang digunakan mexa-control.js
  window.MEXA_THEME = {
    open: open,
    close: close,
    toggle: toggle,
    set: setTheme,
    current: getCurrent,
    available: function () {
      return THEMES.map(function (theme) {
        return {
          id: theme.id,
          name: theme.name,
          color: theme.color
        };
      });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

