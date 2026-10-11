
(() => {
  "use strict";

  const root = document.documentElement;

  const themes = {
    dark: {
      bg: "#080612", panel: "#130d23", line: "#382253",
      purple: "#a855f7", blue: "#36cfff",
      text: "#f8f5ff", muted: "#b4a7ca"
    },
    light: {
      bg: "#f4f2fa", panel: "#ffffff", line: "#ded6eb",
      purple: "#853be8", blue: "#087ea4",
      text: "#211832", muted: "#6d637d"
    },
    neon: {
      bg: "#05070d", panel: "#101321", line: "#17464d",
      purple: "#d946ef", blue: "#00f5ff",
      text: "#f4ffff", muted: "#a2c8d0"
    }
  };

  function normalize(value) {
    if (!value) return null;

    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "string") value = parsed;
      else if (parsed && typeof parsed === "object") {
        value = parsed.theme || parsed.mode || parsed.name || parsed.value;
      }
    } catch (_) {}

    const text = String(value || "").toLowerCase();

    if (/light|terang|putih/.test(text)) return "light";
    if (/neon|cyber/.test(text)) return "neon";
    if (/dark|gelap|hitam|ungu|purple/.test(text)) return "dark";

    return null;
  }

  function getTheme() {
    const keys = [
      "mexa-theme", "mexaTheme", "theme",
      "themeMode", "mexa_theme", "selectedTheme"
    ];

    for (const key of keys) {
      try {
        const theme = normalize(localStorage.getItem(key));
        if (theme) return theme;
      } catch (_) {}
    }

    return normalize(root.dataset.theme) ||
      normalize(document.body?.dataset.theme);
  }

  function apply(themeName) {
    const theme = themes[themeName];
    if (!theme) return;

    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty("--" + key, value);
    });

    root.dataset.mexaProfileTheme = themeName;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme.bg;

    document.dispatchEvent(new CustomEvent("mexa:profile-theme-applied", {
      detail: { theme: themeName }
    }));
  }

  function sync() {
    const theme = getTheme();
    if (theme) apply(theme);
  }

  sync();

  window.addEventListener("storage", event => {
    if (!event.key || /theme/i.test(event.key)) sync();
  });

  [
    "mexa:theme-change",
    "mexa-theme-change",
    "themechange"
  ].forEach(name => {
    window.addEventListener(name, sync);
    document.addEventListener(name, sync);
  });

  const observer = new MutationObserver(sync);
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "data-mode"]
  });

  window.MEXAProfileTheme = { sync, apply };
})();
