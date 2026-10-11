
/* ==================================================
   MEXA SHARED THEME
   Mengikuti tema Home untuk Profil dan Login
   Sumber tema tunggal: localStorage "mexa-theme"
   ================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "mexa-theme";
  const DEFAULT_THEME = "midnight";

  const THEMES = {
    midnight: {
      bg: "#090615",
      card: "#151025",
      panel: "#211a35",
      text: "#ffffff",
      muted: "#aaa4c2",
      primary: "#00e5ff",
      secondary: "#8b5cf6",
      border: "#34294d"
    },

    arctic: {
      bg: "#edf6ff",
      card: "#ffffff",
      panel: "#e5f0fa",
      text: "#142033",
      muted: "#64748b",
      primary: "#0284c7",
      secondary: "#2563eb",
      border: "#cbd5e1"
    },

    emerald: {
      bg: "#06150f",
      card: "#10271d",
      panel: "#173a29",
      text: "#eafff3",
      muted: "#9bd2b0",
      primary: "#34d399",
      secondary: "#22c55e",
      border: "#24563e"
    },

    sunset: {
      bg: "#241019",
      card: "#351925",
      panel: "#492333",
      text: "#fff3ed",
      muted: "#dfb6ad",
      primary: "#ff9966",
      secondary: "#ff4d8d",
      border: "#6e3b4a"
    },

    cyberpunk: {
      bg: "#10051c",
      card: "#1d0b31",
      panel: "#2b1045",
      text: "#fff2ff",
      muted: "#d4a8e9",
      primary: "#ff2bd6",
      secondary: "#00f6ff",
      border: "#702a8a"
    }
  };

  function readTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved && THEMES[saved]) {
        return saved;
      }
    } catch (error) {
      console.warn("MEXA: tidak dapat membaca tema.", error);
    }

    return DEFAULT_THEME;
  }

  function applyTheme(themeId) {
    const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
    const id = THEMES[themeId] ? themeId : DEFAULT_THEME;
    const root = document.documentElement;
    const body = document.body;

    // Samakan penanda tema dengan Home MEXA.
    root.dataset.theme = id;

    if (body) {
      body.dataset.theme = id;
    }

    // Variabel warna utama Home.
    const variables = {
      "--mx-bg": theme.bg,
      "--mx-card": theme.card,
      "--mx-panel": theme.panel,
      "--mx-text": theme.text,
      "--mx-muted": theme.muted,
      "--mx-primary": theme.primary,
      "--mx-secondary": theme.secondary,
      "--mx-border": theme.border,

      // Alias untuk profile.css.
      "--bg": theme.bg,
      "--card": theme.card,
      "--panel": theme.card,
      "--panel2": theme.panel,
      "--line": theme.border,
      "--border": theme.border,
      "--text": theme.text,
      "--muted": theme.muted,
      "--primary": theme.primary,
      "--primary2": theme.secondary,
      "--accent": theme.primary,
      "--purple": theme.secondary,
      "--blue": theme.primary,

      // Variabel tambahan yang mungkin digunakan halaman.
      "--success": theme.primary,
      "--danger": "#ef4444"
    };

    Object.keys(variables).forEach(function (name) {
      root.style.setProperty(name, variables[name]);
    });

    // Beri tahu komponen halaman bahwa tema sudah diterapkan.
    document.dispatchEvent(
      new CustomEvent("mexa:shared-theme-applied", {
        detail: { theme: id }
      })
    );
  }

  function syncTheme() {
    applyTheme(readTheme());
  }

  // Terapkan tema saat halaman siap.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncTheme, {
      once: true
    });
  } else {
    syncTheme();
  }

  // Jika tema diubah di Home pada tab lain,
  // halaman Profil/Login ikut berubah otomatis.
  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY || event.key === null) {
      syncTheme();
    }
  });

  // Mendukung event tema Home jika skrip digunakan
  // bersama halaman yang sama.
  document.addEventListener("mexa:themechange", function (event) {
    const themeId = event.detail && event.detail.theme;

    if (themeId && THEMES[themeId]) {
      applyTheme(themeId);
    } else {
      syncTheme();
    }
  });

  // API kecil untuk pemeriksaan atau penerapan manual.
  window.MEXA_SHARED_THEME = {
    current: readTheme,
    apply: applyTheme,
    available: function () {
      return Object.keys(THEMES);
    }
  };
})();
