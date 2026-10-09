
(function () {
  "use strict";

  const panel = document.getElementById("mexaQuickMenuPanel");
  const toggle = document.getElementById("mexaMenuToggle");

  function setMenu(open) {
    if (!panel || !toggle) return;
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  }

  toggle?.addEventListener("click", function () {
    setMenu(panel.hidden);
  });

  document.addEventListener("click", function (event) {
    if (!panel || panel.hidden) return;
    if (panel.contains(event.target) || toggle?.contains(event.target)) return;
    setMenu(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setMenu(false);
  });

  panel?.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button) return;

    const page = button.dataset.page;
    const action = button.dataset.action;

    setMenu(false);

    if (page === "home") location.href = "./index.html";
    if (page === "profile") location.href = "./Profil.html";
    if (page === "reels") location.href = "./Reels.html";

    if (action === "settings") {
      if (typeof window.mexaQuickSettings === "function") {
        window.mexaQuickSettings();
      } else {
        notify("Pengaturan belum terhubung.");
      }
    }

    if (action === "core") {
      if (typeof window.mexaToggleCore === "function") {
        window.mexaToggleCore();
      } else {
        notify("MEXA Core belum terhubung.");
      }
    }

    if (action === "logout") {
      if (typeof window.mexaConfirmLogout === "function") {
        window.mexaConfirmLogout();
      } else {
        notify("Fitur keluar akun belum terhubung.");
      }
    }
  });

  document.getElementById("mexaOpenComposer")
    ?.addEventListener("click", function () {
      if (typeof window.openCreateModal === "function") {
        window.openCreateModal();
      } else {
        notify("Form postingan belum terhubung.");
      }
    });

  document.getElementById("mexaMobileCreate")
    ?.addEventListener("click", function () {
      if (typeof window.openCreateModal === "function") {
        window.openCreateModal();
      } else {
        notify("Form postingan belum terhubung.");
      }
    });

  function notify(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    } else {
      alert(message);
    }
  }

  console.log("MEXA Home shell siap.");
})();
