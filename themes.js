/* MEXA THEMES */
(function () {
  "use strict";

  const STORAGE_KEY = "mexa-theme";

  const THEMES = [
    "midnight",
    "arctic",
    "emerald",
    "sunset",
    "cyberpunk"
  ];

  function setTheme(theme) {
    if (!THEMES.includes(theme)) return false;

    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      console.warn("Tema tidak dapat disimpan:", error);
    }

    window.dispatchEvent(
      new CustomEvent("mexa:themechange", {
        detail: { theme: theme }
      })
    );

    return true;
  }

  function getAutoTheme() {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 10) return "arctic";
    if (hour >= 10 && hour < 16) return "emerald";
    if (hour >= 16 && hour < 19) return "sunset";
    if (hour >= 19 || hour < 5) return "midnight";

    return "cyberpunk";
  }

  function loadTheme() {
    let savedTheme = null;

    try {
      savedTheme = localStorage.getItem(STORAGE_KEY);
    } catch (error) {}

    setTheme(
      THEMES.includes(savedTheme)
        ? savedTheme
        : getAutoTheme()
    );
  }

  window.MEXA_THEME = {
    set: setTheme,

    auto: function () {
      return setTheme(getAutoTheme());
    },

    current: function () {
      return document.body.dataset.theme || "midnight";
    },

    available: function () {
      return THEMES.slice();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      loadTheme,
      { once: true }
    );
  } else {
    loadTheme();
  }
})();
