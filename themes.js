
/* MEXA THEMES — FIX */
(function () {
  "use strict";

  const KEY = "mexa-theme";
  const THEMES = ["midnight", "arctic", "emerald", "sunset", "cyberpunk"];

  function setTheme(theme) {
    if (!THEMES.includes(theme)) return false;
    if (!document.body) return false;

    document.body.dataset.theme = theme;
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem(KEY, theme);
    } catch (_) {}

    window.dispatchEvent(
      new CustomEvent("mexa:themechange", {
        detail: { theme }
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
    let saved = null;

    try {
      saved = localStorage.getItem(KEY);
    } catch (_) {}

    setTheme(THEMES.includes(saved) ? saved : getAutoTheme());
  }

  window.MEXA_THEME = {
    set: setTheme,
    auto: function () {
      return setTheme(getAutoTheme());
    },
    current: function () {
      return document.body?.dataset.theme || "midnight";
    },
    available: function () {
      return THEMES.slice();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadTheme, { once: true });
  } else {
    loadTheme();
  }
})();
