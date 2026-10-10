
/* =========================================
   MEXA CONTROL JS
   MENU UTAMA + NAVIGASI + TEMA
========================================= */

(function () {
  "use strict";

  function $(selector) {
    return document.querySelector(selector);
  }

  function openMenu() {
    const menu = $("#mx-control-panel");
    const trigger = $("#mx-main-menu");

    if (!menu || !trigger) return;

    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    const menu = $("#mx-control-panel");
    const trigger = $("#mx-main-menu");

    if (menu) menu.hidden = true;

    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
    }
  }

  function toggleMenu() {
    const menu = $("#mx-control-panel");

    if (!menu) return;

    if (menu.hidden) {
      openMenu();
    } else {
      closeMenu();
    }
  }

  function openTheme() {
    // Tutup menu utama terlebih dahulu.
    closeMenu();

    // Gunakan pengendali tema dari themes.js.
    if (window.MEXA_THEME && typeof window.MEXA_THEME.open === "function") {
      window.MEXA_THEME.open();
      return;
    }

    // Dukungan untuk versi themes.js yang membuat panel
    // di dalam #mexa-theme-container.
    const panel = $("#mexa-theme-panel");

    if (panel) {
      panel.hidden = false;
      return;
    }

    console.error(
      "Panel tema belum tersedia. Periksa themes.js."
    );
  }

  function handleMenuClick(event) {
    const button = event.target.closest(
      "#mx-control-panel button"
    );

    if (!button) return;

    event.preventDefault();

    const label = button.textContent.trim();

    if (label.includes("Tema")) {
      event.stopPropagation();
      openTheme();
      return;
    }

    const destinations = [
      { name: "Beranda", url: "index.html" },
      { name: "Reels", url: "Reels.html" },
      { name: "Grup", url: "Grup.html" },
      { name: "Profil", url: "Profil.html" },
      { name: "Pengaturan", url: "Pengaturan.html" }
    ];

    const destination = destinations.find(function (item) {
      return label.includes(item.name);
    });

    if (destination) {
      window.location.href = destination.url;
      return;
    }

    closeMenu();
  }

  function handleOutsideClick(event) {
    const menu = $("#mx-control-panel");
    const trigger = $("#mx-main-menu");
    const themePanel = $("#mexa-theme-panel");

    if (
      menu &&
      !menu.hidden &&
      !menu.contains(event.target) &&
      trigger &&
      !trigger.contains(event.target)
    ) {
      closeMenu();
    }

    // Tutup panel tema jika mengeklik di luar panel
    // dan bukan tombol Tema.
    if (
      themePanel &&
      !themePanel.hidden &&
      !themePanel.contains(event.target) &&
      !event.target.closest("#mx-theme-button") &&
      !event.target.closest("#mx-control-panel button")
    ) {
      themePanel.hidden = true;
    }
  }

  function handleEscape(event) {
    if (event.key !== "Escape") return;

    closeMenu();

    const themePanel = $("#mexa-theme-panel");

    if (themePanel) {
      themePanel.hidden = true;
    }
  }

  function init() {
    const trigger = $("#mx-main-menu");
    const menu = $("#mx-control-panel");

    if (trigger && menu) {
      trigger.setAttribute("aria-expanded", "false");

      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        toggleMenu();
      });

      menu.addEventListener("click", handleMenuClick);
    }

    const themeButton = $("#mx-theme-button");

    if (themeButton) {
      themeButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        openTheme();
      });
    }

    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    // Tombol Buat menggulir ke formulir posting.
    const createButton = $("#mx-create");
    const composer = $("#mexa-composer");
    const textarea = $("#mexaPostContent");

    if (createButton && composer) {
      createButton.addEventListener("click", function () {
        composer.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

        if (textarea) {
          setTimeout(function () {
            textarea.focus();
          }, 300);
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }

  window.MEXAControl = {
    openMenu: openMenu,
    closeMenu: closeMenu,
    toggleMenu: toggleMenu,
    openTheme: openTheme
  };
})();
