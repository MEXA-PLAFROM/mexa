
/* =====================================================
   MEXA — LOGOUT
   File: logout.js

   Fungsi:
   - Keluar dari akun
   - Menggunakan sistem logout Supabase jika tersedia
   - Membersihkan sesi lokal MEXA
   - Mengarahkan pengguna ke halaman Login
   ===================================================== */

(function () {
  "use strict";

  if (window.MEXALogoutLoaded) return;
  window.MEXALogoutLoaded = true;

  function showMessage(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    } else {
      alert(message);
    }
  }

  async function logout() {
    const confirmed = window.confirm(
      "Yakin ingin keluar dari akun MEXA?"
    );

    if (!confirmed) return;

    try {
      // Gunakan fungsi logout aplikasi jika tersedia.
      if (typeof window.mexaLogout === "function") {
        await window.mexaLogout();
      } else if (
        window.supabaseClient &&
        typeof window.supabaseClient.auth?.signOut === "function"
      ) {
        const { error } =
          await window.supabaseClient.auth.signOut();

        if (error) throw error;
      }

      // Bersihkan sesi lokal MEXA yang dikenal.
      const sessionKeys = [
        "mexa_user",
        "currentUser",
        "mexaCurrentUser"
      ];

      sessionKeys.forEach(function (key) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // Kosongkan variabel sesi jika tersedia.
      window.currentUser = null;
      window.mexaCurrentUser = null;

      // Arahkan ke halaman Login.
      window.location.href = "./Login.html";
    } catch (error) {
      console.error("MEXA logout:", error);

      showMessage(
        "Gagal keluar akun. Silakan coba kembali."
      );
    }
  }

  // Fungsi publik agar dapat dipanggil dari menu mana pun.
  window.MEXALogout = logout;

  // Hubungkan tombol yang menggunakan selector berikut.
  document.addEventListener("click", function (event) {
    const target = event.target;

    if (!(target instanceof Element)) return;

    const button = target.closest(
      "#mexaLogout, [data-mexa-logout]"
    );

    if (!button) return;

    event.preventDefault();
    logout();
  });

  console.log("MEXA logout.js siap.");
})();
