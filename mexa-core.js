
/* =====================================================
   MEXA CORE
   File: mexa-core.js
   Fungsi: menu navigasi, Pengaturan, dan System
   Tidak mengganti sistem login yang sudah ada.
   ===================================================== */

(function () {
  "use strict";

  if (window.MEXACoreLoaded) return;
  window.MEXACoreLoaded = true;

  // Pesan MEXA
  function mexaCoreMessage(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    } else {
      alert(message);
    }
  }

  // Buka atau tutup menu navigasi.
  window.mexaToggleQuickMenu = function (force) {
    const panel = document.getElementById("mexaQuickMenuPanel");
    const trigger = document.getElementById("mexaMenuToggle");

    if (!panel) {
      console.error("MEXA: panel navigasi tidak ditemukan.");
      return;
    }

    const open = typeof force === "boolean"
      ? force
      : panel.hidden;

    panel.hidden = !open;

    if (trigger) {
      trigger.setAttribute("aria-expanded", String(open));
    }
  };

  // Pengaturan
  window.mexaQuickSettings = function () {
    window.mexaToggleQuickMenu(false);
    mexaCoreMessage("Pengaturan segera hadir.");
  };

  // System
  window.mexaOpenSystem = function () {
    window.mexaToggleQuickMenu(false);
    mexaCoreMessage("MEXA System belum terhubung.");
  };

  // Alias untuk kompatibilitas dengan menu Home.
  window.mexaToggleCore = function () {
    window.mexaToggleQuickMenu(false);
    mexaCoreMessage("MEXA Core siap.");
  };

  // Tutup menu dengan tombol Escape.
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      window.mexaToggleQuickMenu(false);
    }
  });

  // Tutup menu jika pengguna menekan area di luar panel.
  document.addEventListener("click", function (event) {
    const panel = document.getElementById("mexaQuickMenuPanel");
    const trigger = document.getElementById("mexaMenuToggle");

    if (!panel || panel.hidden) return;

    if (
      !panel.contains(event.target) &&
      (!trigger || !trigger.contains(event.target))
    ) {
      window.mexaToggleQuickMenu(false);
    }
  });

  console.log("MEXA Core berhasil dimuat.");
})();
