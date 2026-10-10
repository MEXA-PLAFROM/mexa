
/* =====================================================
   MEXA CONTROL CENTER
   Versi 1.0 — Panel kontrol dan tema
   Tidak mengubah sistem login atau Supabase
   ===================================================== */

(function () {
  "use strict";

  if (window.MEXAControl) return;

  const themes = [
    { id: "midnight", name: "Midnight Neon", color: "#8b5cf6" },
    { id: "arctic", name: "Arctic Light", color: "#087ff5" },
    { id: "ocean", name: "Ocean Pulse", color: "#38f0d0" },
    { id: "violet", name: "Cyber Violet", color: "#f06cff" },
    { id: "sunset", name: "Sunset Ember", color: "#ffb45e" }
  ];

  let panel = null;
  let backdrop = null;
  let previousFocus = null;

  function addStyles() {
    if (document.getElementById("mexa-control-styles")) return;

    const style = document.createElement("style");
    style.id = "mexa-control-styles";

    style.textContent = `
      #mexa-control-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9998;
        background: rgba(0,0,0,.58);
        backdrop-filter: blur(4px);
      }

      #mexa-control-panel {
        position: fixed;
        z-index: 9999;
        top: 0;
        right: 0;
        width: min(370px, 90vw);
        height: 100dvh;
        overflow-y: auto;
        padding: 22px 18px 32px;
        color: var(--mx-text, #f6f3ff);
        background: var(--mx-panel, #141027);
        border-left: 1px solid var(--mx-border, #30284d);
        box-shadow: -15px 0 50px rgba(0,0,0,.3);
        transform: translateX(105%);
        visibility: hidden;
        transition: transform .25s ease, visibility .25s;
      }

      #mexa-control-panel.mx-control-open {
        transform: translateX(0);
        visibility: visible;
      }

      #mexa-control-panel .mxcp-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 22px;
      }

      #mexa-control-panel .mxcp-title {
        margin: 0;
        font-size: 22px;
        font-weight: 850;
      }

      #mexa-control-panel .mxcp-close,
      #mexa-control-panel .mxcp-auto,
      #mexa-control-panel .mxcp-theme {
        color: inherit;
        font: inherit;
        cursor: pointer;
        border: 1px solid var(--mx-border, #30284d);
        background: var(--mx-card, #17132b);
        border-radius: 13px;
      }

      #mexa-control-panel .mxcp-close {
        width: 42px;
        height: 42px;
        font-size: 23px;
      }

      #mexa-control-panel .mxcp-section {
        margin: 20px 0 10px;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: .8px;
        opacity: .72;
        text-transform: uppercase;
      }

      #mexa-control-panel .mxcp-auto {
        width: 100%;
        padding: 14px;
        text-align: left;
        margin-bottom: 12px;
      }

      #mexa-control-panel .mxcp-themes {
        display: grid;
        gap: 10px;
      }

      #mexa-control-panel .mxcp-theme {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 13px;
        text-align: left;
      }

      #mexa-control-panel .mxcp-theme[aria-pressed="true"] {
        border-color: var(--mx-cyan, #00e5ff);
        box-shadow: 0 0 0 1px var(--mx-cyan, #00e5ff);
      }

      #mexa-control-panel .mxcp-dot {
        width: 17px;
        height: 17px;
        flex: 0 0 17px;
        border-radius: 50%;
        background: var(--theme-color);
        box-shadow: 0 0 12px var(--theme-color);
      }

      #mexa-control-panel .mxcp-note {
        margin-top: 18px;
        font-size: 12px;
        line-height: 1.6;
        opacity: .72;
      }

      @media (prefers-reduced-motion: reduce) {
        #mexa-control-panel {
          transition: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function buildPanel() {
    if (panel) return;

    addStyles();

    backdrop = document.createElement("div");
    backdrop.id = "mexa-control-backdrop";
    backdrop.hidden = true;

    panel = document.createElement("aside");
    panel.id = "mexa-control-panel";
    panel.setAttribute("aria-label", "MEXA Control Center");
    panel.setAttribute("aria-hidden", "true");

    panel.innerHTML = `
      <div class="mxcp-top">
        <h2 class="mxcp-title">MEXA Control</h2>
        <button type="button" class="mxcp-close"
          aria-label="Tutup menu">×</button>
      </div>

      <div class="mxcp-section">Tampilan MEXA</div>

      <button type="button" class="mxcp-auto">
        🕒 Tema otomatis siang / malam
      </button>

      <div class="mxcp-section">Pilih tema</div>
      <div class="mxcp-themes"></div>

      <p class="mxcp-note">
        Pilihan tema manual disimpan pada perangkat ini.
        Mode otomatis mengikuti waktu perangkat.
      </p>
    `;

    const themeList = panel.querySelector(".mxcp-themes");

    themes.forEach(function (theme) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mxcp-theme";
      button.dataset.theme = theme.id;
      button.setAttribute("aria-pressed", "false");

      const dot = document.createElement("span");
      dot.className = "mxcp-dot";
      dot.style.setProperty("--theme-color", theme.color);

      const label = document.createElement("span");
      label.textContent = theme.name;

      button.append(dot, label);
      themeList.appendChild(button);
    });

    document.body.append(backdrop, panel);

    panel.querySelector(".mxcp-close")
      .addEventListener("click", close);

    backdrop.addEventListener("click", close);

    panel.querySelector(".mxcp-auto")
      .addEventListener("click", function () {
        if (!window.MEXATheme) {
          alert("themes.js belum berhasil dimuat.");
          return;
        }

        try {
          window.MEXATheme.auto();
          localStorage.setItem("mexa-theme-mode", "auto");
          updateSelected();
        } catch (error) {
          console.error("MEXA tema otomatis:", error);
          alert("Tema otomatis gagal diaktifkan.");
        }
      });

    themeList.addEventListener("click", function (event) {
      const button = event.target.closest("[data-theme]");
      if (!button) return;

      if (!window.MEXATheme) {
        alert("themes.js belum berhasil dimuat.");
        return;
      }

      try {
        window.MEXATheme.set(button.dataset.theme);
        localStorage.setItem("mexa-theme-mode", "manual");
        updateSelected();
      } catch (error) {
        console.error("MEXA ganti tema:", error);
        alert("Tema gagal diganti.");
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close();
    });
  }

  function updateSelected() {
    if (!panel) return;

    const current = window.MEXATheme &&
      window.MEXATheme.current();

    panel.querySelectorAll("[data-theme]").forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.theme === current)
      );
    });
  }

  function open() {
    buildPanel();

    previousFocus = document.activeElement;
    backdrop.hidden = false;
    panel.classList.add("mx-control-open");
    panel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    updateSelected();
    panel.querySelector(".mxcp-close").focus();
  }

  function close() {
    if (!panel) return;

    panel.classList.remove("mx-control-open");
    panel.setAttribute("aria-hidden", "true");
    backdrop.hidden = true;
    document.body.style.overflow = "";

    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    }
  }

  function toggle() {
    if (panel && panel.classList.contains("mx-control-open")) {
      close();
    } else {
      open();
    }
  }

  function bindButtons() {
    const selectors = [
      "#mx-main-menu",
      "#mexaMenuToggle",
      "[data-action='control-center']"
    ].join(",");

    document.querySelectorAll(selectors).forEach(function (button) {
      if (button.dataset.mexaControlBound === "true") return;

      button.dataset.mexaControlBound = "true";
      button.addEventListener("click", function (event) {
        event.preventDefault();
        toggle();
      });
    });
  }

  window.MEXAControl = {
    open: open,
    close: close,
    toggle: toggle
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindButtons);
  } else {
    bindButtons();
  }

  console.log("MEXA Control Center siap.");
})();
