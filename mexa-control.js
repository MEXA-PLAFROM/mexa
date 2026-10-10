
/* ==========================================
   MEXA CONTROL
   Cocok dengan home.css,
   home-themes.css, dan themes.js
========================================== */

(function () {
  "use strict";

  const THEME_LIST = [
    { id: "midnight", name: "Midnight Neon", icon: "🌙" },
    { id: "arctic", name: "Arctic Light", icon: "❄️" },
    { id: "emerald", name: "Emerald", icon: "🌿" },
    { id: "sunset", name: "Sunset", icon: "🌅" },
    { id: "cyberpunk", name: "Cyberpunk", icon: "⚡" }
  ];

  function getThemeController() {
    return window.MEXA_THEME || window.MEXATheme || null;
  }

  function getCurrentTheme() {
    const controller = getThemeController();

    if (controller && typeof controller.current === "function") {
      const current = controller.current();
      if (current) return current;
    }

    return (
      document.body.dataset.theme ||
      document.documentElement.dataset.theme ||
      localStorage.getItem("mexa-theme") ||
      "midnight"
    );
  }

  function applyTheme(theme) {
    const valid = THEME_LIST.some(item => item.id === theme);
    if (!valid) return;

    const controller = getThemeController();

    if (controller && typeof controller.set === "function") {
      controller.set(theme);
    } else {
      document.body.dataset.theme = theme;
      document.documentElement.dataset.theme = theme;
      localStorage.setItem("mexa-theme", theme);
    }

    updateThemeButtons();
  }

  function closeThemePanel() {
    document.getElementById("mexa-theme-panel")?.remove();
  }

  function updateThemeButtons() {
    const panel = document.getElementById("mexa-theme-panel");
    if (!panel) return;

    const current = getCurrentTheme();

    panel.querySelectorAll("[data-mexa-theme]").forEach(button => {
      const active = button.dataset.mexaTheme === current;

      button.setAttribute("aria-pressed", String(active));

      if (active) {
        button.dataset.active = "true";
      } else {
        delete button.dataset.active;
      }
    });
  }

  function openThemePanel() {
    const existing = document.getElementById("mexa-theme-panel");

    if (existing) {
      existing.remove();
      return;
    }

    const panel = document.createElement("section");
    panel.id = "mexa-theme-panel";
    panel.setAttribute("aria-label", "Pilihan tema MEXA");

    const heading = document.createElement("h3");
    heading.textContent = "Tema MEXA";
    panel.appendChild(heading);

    THEME_LIST.forEach(theme => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.mexaTheme = theme.id;
      button.innerHTML =
        `<span aria-hidden="true">${theme.icon}</span>` +
        `<span>${theme.name}</span>` +
        `<span class="mx-theme-check" aria-hidden="true">✓</span>`;

      button.addEventListener("click", () => {
        applyTheme(theme.id);
        closeThemePanel();
      });

      panel.appendChild(button);
    });

    document.body.appendChild(panel);
    updateThemeButtons();

    // Tutup panel ketika klik di luar panel.
    setTimeout(() => {
      function outsideClick(event) {
        const currentPanel = document.getElementById("mexa-theme-panel");
        const themeButton = event.target.closest(
          '#mx-control-panel button, [data-action="mexa-theme"]'
        );

        if (
          currentPanel &&
          !currentPanel.contains(event.target) &&
          !themeButton
        ) {
          closeThemePanel();
          document.removeEventListener("click", outsideClick);
        }
      }

      document.addEventListener("click", outsideClick);
      panel._outsideClick = outsideClick;
    }, 0);
  }

  function closeControlMenu() {
    const menu = document.getElementById("mx-control-panel");
    const trigger = document.getElementById("mx-main-menu");

    if (menu) menu.hidden = true;
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }

  function initControl() {
    const menu = document.getElementById("mx-control-panel");
    const trigger = document.getElementById("mx-main-menu");

    if (trigger && menu) {
      trigger.setAttribute("aria-expanded", "false");

      trigger.addEventListener("click", event => {
        event.stopPropagation();

        menu.hidden = !menu.hidden;
        trigger.setAttribute("aria-expanded", String(!menu.hidden));
      });

      menu.addEventListener("click", event => {
        const button = event.target.closest("button");
        if (!button) return;

        const label = button.textContent.trim();

        if (label.includes("Tema")) {
          event.stopPropagation();
          openThemePanel();
          return;
        }

        const destinations = [
          { match: "Beranda", url: "index.html" },
          { match: "Reels", url: "Reels.html" },
          { match: "Grup", url: "Grup.html" },
          { match: "Profil", url: "Profil.html" }
        ];

        const destination = destinations.find(item =>
          label.includes(item.match)
        );

        if (destination) {
          window.location.href = destination.url;
          return;
        }

        if (label.includes("Pengaturan")) {
          window.location.href = "Pengaturan.html";
          return;
        }

        closeControlMenu();
      });

      document.addEventListener("click", event => {
        if (
          !menu.hidden &&
          !menu.contains(event.target) &&
          !trigger.contains(event.target)
        ) {
          closeControlMenu();
        }
      });
    }

    // Tombol buat diarahkan ke kolom postingan.
    const createButton = document.getElementById("mx-create");
    const composer = document.getElementById("mexa-composer");
    const textarea = document.getElementById("mexaPostContent");

    if (createButton && composer) {
      createButton.addEventListener("click", () => {
        composer.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

        if (textarea) {
          setTimeout(() => textarea.focus(), 300);
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initControl);
  } else {
    initControl();
  }

  window.MEXAControl = {
    openThemePanel,
    closeThemePanel,
    applyTheme,
    getCurrentTheme
  };
})();
