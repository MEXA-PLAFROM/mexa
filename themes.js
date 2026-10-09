
/* =====================================================
   MEXA THEMES — ROTASI HARIAN
   Mulai dari Tema 1 pada hari pertama dijalankan.
   Berganti setiap hari dan berulang setelah Tema 5.
   ===================================================== */

(function () {
  "use strict";

  const THEMES = [
    "theme-1",
    "theme-2",
    "theme-3",
    "theme-4",
    "theme-5"
  ];

  const DAY_MS = 24 * 60 * 60 * 1000;
  const STORAGE_KEY = "mexa_theme_start_date";

  function applyDailyTheme() {
    const app = document.getElementById("mexa-app");
    if (!app) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate = localStorage.getItem(STORAGE_KEY);

    if (!startDate) {
      startDate = String(today.getTime());
      localStorage.setItem(STORAGE_KEY, startDate);
    }

    const elapsedDays = Math.max(
      0,
      Math.floor((today.getTime() - Number(startDate)) / DAY_MS)
    );

    const themeIndex = elapsedDays % THEMES.length;
    app.dataset.theme = THEMES[themeIndex];
  }

  function init() {
    applyDailyTheme();

    // Periksa pergantian tanggal setiap menit.
    setInterval(applyDailyTheme, 60 * 1000);

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) applyDailyTheme();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

