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

  // Membuka atau menutup panel MEXA Core
  window.mexaToggleCore = function () {
    let panel = document.getElementById("mexa-core-panel");

    if (panel) {
      panel.remove();
      return;
    }

    panel = document.createElement("div");
    panel.id = "mexa-core-panel";

    panel.innerHTML = `
      <div class="mexa-core-backdrop"
           onclick="mexaToggleCore()"></div>

      <section class="mexa-core-window"
               role="dialog"
               aria-modal="true"
               aria-labelledby="mexa-core-title">

        <header class="mexa-core-header">
          <div>
            <div class="mexa-core-eyebrow">MEXA SYSTEM</div>
            <h2 id="mexa-core-title">☰ MEXA Core</h2>
            <p>Pusat akses dan informasi MEXA</p>
          </div>

          <button type="button"
                  class="mexa-core-close"
                  onclick="mexaToggleCore()"
                  aria-label="Tutup">×</button>
        </header>

        <div class="mexa-core-content">

          <button type="button" class="mexa-core-item"
                  onclick="mexaCoreInfo('Pusat bantuan segera tersedia.')">
            <span class="mexa-core-symbol">?</span>
            <span>
              <strong>Pusat Bantuan</strong>
              <small>Bantuan penggunaan MEXA</small>
            </span>
            <span class="mexa-core-arrow">›</span>
          </button>

          <button type="button" class="mexa-core-item"
                  onclick="mexaCoreInfo('Informasi MEXA segera tersedia.')">
            <span class="mexa-core-symbol">M</span>
            <span>
              <strong>Tentang MEXA</strong>
              <small>Informasi platform MEXA</small>
            </span>
            <span class="mexa-core-arrow">›</span>
          </button>

          <button type="button" class="mexa-core-item"
                  onclick="mexaCoreInfo('Pengaturan lanjutan segera tersedia.')">
            <span class="mexa-core-symbol">⚙</span>
            <span>
              <strong>Akses Lanjutan</strong>
              <small>Pusat fitur tambahan</small>
            </span>
            <span class="mexa-core-arrow">›</span>
          </button>

        </div>

        <footer class="mexa-core-footer">
          MEXA Core · Pusat akses platform
        </footer>
      </section>
    `;

    document.body.appendChild(panel);

    const closeOnEscape = function (event) {
      if (event.key === "Escape") {
        panel.remove();
        document.removeEventListener("keydown", closeOnEscape);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
  };

  // Pesan informasi panel
  window.mexaCoreInfo = function (message) {
    mexaCoreMessage(message);
  };

  // Keluar dari akun menggunakan sesi Supabase yang ada
  window.mexaConfirmLogout = async function () {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin keluar dari akun MEXA?"
    );

    if (!confirmed) return;

    try {
      const getClient = window.MEXA_GET_SUPABASE_CLIENT;

      const client =
        typeof getClient === "function" ? getClient() : null;

      if (!client || !client.auth) {
        mexaCoreMessage(
          "Sistem sesi belum terhubung. Akun belum dikeluarkan."
        );
        console.error("MEXA: Supabase client belum terhubung.");
        return;
      }

      const { error } = await client.auth.signOut();

      if (error) throw error;

      window.location.href = "Login.html";
    } catch (error) {
      console.error("MEXA logout:", error);
      mexaCoreMessage("Gagal keluar akun. Silakan coba lagi.");
    }
  };

  console.log("MEXA Core siap dimuat.");
   window.mexaToggleQuickMenu = function (force) {
const panel = document.getElementById("mexaQuickMenuPanel");
const trigger = document.querySelector(".mx-quick-menu-trigger");

if (!panel) return;

const shouldOpen =
typeof force === "boolean" ? force : panel.hidden;

panel.hidden = !shouldOpen;

if (trigger) {
trigger.setAttribute("aria-expanded", String(shouldOpen));
}
};

window.mexaQuickSettings = function () {
window.mexaToggleQuickMenu(false);

if (typeof window.showToast === "function") {
window.showToast("Pengaturan segera hadir.");
} else {
alert("Pengaturan segera hadir.");
}
};
         
})();
