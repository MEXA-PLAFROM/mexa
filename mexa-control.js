/* MEXA CONTROL */
(function () {
  "use strict";

  const THEME_LIST = [
    { id: "midnight", name: "Midnight Neon", icon: "🌙" },
    { id: "arctic", name: "Arctic Light", icon: "❄️" },
    { id: "emerald", name: "Emerald", icon: "🌿" },
    { id: "sunset", name: "Sunset", icon: "🌅" },
    { id: "cyberpunk", name: "Cyberpunk", icon: "⚡" }
  ];

  const $ = (selector) => document.querySelector(selector);

  function getCurrentTheme() {
    if (window.MEXA_THEME) {
      return window.MEXA_THEME.current();
    }

    return document.body.dataset.theme || "midnight";
  }

  function closeControlMenu() {
    const menu = $("#mx-control-panel");
    const trigger = $("#mx-main-menu");

    if (menu) menu.hidden = true;

    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
    }
  }

  function closeThemePanel() {
    const panel = $("#mexa-theme-panel");

    if (panel) {
      panel.remove();
    }

    document.removeEventListener("click", handleOutsideClick);
    document.removeEventListener("keydown", handleEscape);
  }

  function updateThemeButtons() {
    const current = getCurrentTheme();
    const panel = $("#mexa-theme-panel");

    if (!panel) return;

    panel.querySelectorAll("[data-mexa-theme]").forEach((button) => {
      const active = button.dataset.mexaTheme === current;

      button.setAttribute("aria-pressed", String(active));
      button.dataset.active = active ? "true" : "false";
    });
  }

  function applyTheme(theme) {
    if (!THEME_LIST.some((item) => item.id === theme)) {
      return;
    }

    if (window.MEXA_THEME && typeof window.MEXA_THEME.set === "function") {
      window.MEXA_THEME.set(theme);
    } else {
      document.documentElement.dataset.theme = theme;
      document.body.dataset.theme = theme;

      try {
        localStorage.setItem("mexa-theme", theme);
      } catch (error) {}
    }

    updateThemeButtons();
  }

  function handleOutsideClick(event) {
    const panel = $("#mexa-theme-panel");

    if (panel && !panel.contains(event.target)) {
      closeThemePanel();
    }
  }

  function handleEscape(event) {
    if (event.key === "Escape") {
      closeThemePanel();
    }
  }

  function openThemePanel() {
    closeThemePanel();

    const panel = document.createElement("section");
    panel.id = "mexa-theme-panel";
    panel.setAttribute("aria-label", "Pilihan tema MEXA");

    const heading = document.createElement("h3");
    heading.textContent = "Tema MEXA";
    panel.appendChild(heading);

    THEME_LIST.forEach((theme) => {
      const button = document.createElement("button");

      button.type = "button";
      button.dataset.mexaTheme = theme.id;
      button.setAttribute("aria-pressed", "false");

      const icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = theme.icon;

      const name = document.createElement("span");
      name.textContent = theme.name;

      const check = document.createElement("span");
      check.className = "mx-theme-check";
      check.setAttribute("aria-hidden", "true");
      check.textContent = "✓";

      button.append(icon, name, check);

      button.addEventListener("click", (event) => {
        event.stopPropagation();
        applyTheme(theme.id);
        closeThemePanel();
      });

      panel.appendChild(button);
    });

    document.body.appendChild(panel);
    updateThemeButtons();

    setTimeout(() => {
      document.addEventListener("click", handleOutsideClick);
      document.addEventListener("keydown", handleEscape);
    }, 0);
  }

  function handleMenuClick(event) {
    const button = event.target.closest("#mx-control-panel button");

    if (!button) return;

    const label = button.textContent.trim();

    if (label.includes("Tema")) {
      event.preventDefault();
      event.stopPropagation();

      closeControlMenu();
      openThemePanel();
      return;
    }

    const destinations = [
      { match: "Beranda", url: "index.html" },
      { match: "Reels", url: "Reels.html" },
      { match: "Grup", url: "Grup.html" },
      { match: "Profil", url: "Profil.html" },
      { match: "Pengaturan", url: "Pengaturan.html" }
    ];

    const destination = destinations.find((item) =>
      label.includes(item.match)
    );

    if (destination) {
      window.location.href = destination.url;
      return;
    }

    closeControlMenu();
  }

  function initControl() {
    const menu = $("#mx-control-panel");
    const trigger = $("#mx-main-menu");

    if (menu && trigger) {
      trigger.setAttribute("aria-expanded", "false");

      trigger.addEventListener("click", (event) => {
        event.stopPropagation();

        const willOpen = menu.hidden;

        closeThemePanel();
        menu.hidden = !willOpen;

        trigger.setAttribute(
          "aria-expanded",
          String(willOpen)
        );
      });

      menu.addEventListener("click", handleMenuClick);

      document.addEventListener("click", (event) => {
        if (
          !menu.hidden &&
          !menu.contains(event.target) &&
          !trigger.contains(event.target)
        ) {
          closeControlMenu();
        }
      });
    }

    const createButton = $("#mx-create");
    const composer = $("#mexa-composer");
    const textarea = $("#mexaPostContent");

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

  window.MEXAControl = {
    openThemePanel,
    closeThemePanel,
    applyTheme,
    getCurrentTheme
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initControl, {
      once: true
    });
  } else {
    initControl();
  }
})();
