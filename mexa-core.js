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
}

// Buka/tutup menu navigasi.
// Fungsi garis tiga hanya mengatur panel menu.
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

// Aksi Pengaturan terpisah.
window.mexaQuickSettings = function () {
  window.mexaToggleQuickMenu(false);

  if (typeof window.showToast === "function") {
    window.showToast("Pengaturan segera hadir.");
  } else {
    alert("Pengaturan segera hadir.");
  }
};

// Aksi System tetap terpisah dari MEXA Core.
// Hubungkan ke fungsi System yang sebenarnya jika sudah tersedia.
window.mexaOpenSystem = function () {
  window.mexaToggleQuickMenu(false);

  if (typeof window.showToast === "function") {
    window.showToast("MEXA System belum terhubung.");
  } else {
    alert("MEXA System belum terhubung.");
  }
};

// Tutup menu dengan Escape atau klik di luar panel.
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

  });
})();
