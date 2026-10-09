/* =====================================================
   MEXA CORE
   File: mexa-core.js
   Fungsi: panel MEXA Core dan Keluar Akun
   Tidak mengganti sistem login yang sudah ada.
   ===================================================== */

(function () {
  "use strict";

  // Pesan MEXA
  function mexaCoreMessage(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    } else {
      alert(message);
    }
  }
  // MENU NAVIGASI LIPAT MEXA
  // Garis tiga hanya membuka/menutup menu.
  window.mexaToggleQuickMenu = function (force) {
    const panel = document.getElementById("mexaQuickMenuPanel");
    const trigger = document.getElementById("mexaMenuToggle");

    if (!panel) {
      console.warn("MEXA: elemen mexaQuickMenuPanel tidak ditemukan.");
      return;
    }

    const isOpen =
      typeof force === "boolean" ? force : panel.hidden;

    panel.hidden = !isOpen;

    if (trigger) {
      trigger.setAttribute("aria-expanded", String(isOpen));
    }
  };

  // Pengaturan adalah aksi terpisah dari tombol garis tiga.
  window.mexaQuickSettings = function () {
    window.mexaToggleQuickMenu(false);

    if (typeof window.showToast === "function") {
      window.showToast("Pengaturan segera hadir.");
    } else {
      alert("Pengaturan segera hadir.");
    }
  };

  // Tutup menu jika pengguna menekan Escape atau klik di luar menu.
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      window.mexaToggleQuickMenu(false);
    }
  });

  document.addEventListener("click", function (event) {
    const panel = document.getElementById("mexaQuickMenuPanel");
    const trigger = document.getElementById("mexaMenuToggle");

    if (!panel || panel.hidden) return;

    if (
      !panel.contains(event.target) &&
      trigger &&
      !trigger.contains(event.target)
    ) {
      window.mexaToggleQuickMenu(false);
    }
  });
})();
