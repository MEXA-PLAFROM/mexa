
/* =====================================================
   MEXA — LOGOUT FIX
   File: logout.js
   Menggunakan klien autentikasi Home yang sudah ada.
   ===================================================== */

(function () {
  "use strict";

  if (window.MEXALogoutFixLoaded) return;
  window.MEXALogoutFixLoaded = true;

  async function logout() {
    if (!confirm("Yakin ingin keluar dari akun MEXA?")) {
      return;
    }

    const client = window.mexaSupabase;

    if (!client || !client.auth || !client.auth.signOut) {
      console.error(
        "MEXA: klien autentikasi belum tersedia."
      );

      alert(
        "Logout gagal: klien Supabase belum tersedia. " +
        "Periksa urutan script di index.html."
      );

      return;
    }

    try {
      const { error } = await client.auth.signOut({
        scope: "local"
      });

      if (error) {
        throw error;
      }

      // Bersihkan data pengguna lokal MEXA.
      [
        "mexa_user",
        "currentUser",
        "mexaCurrentUser"
      ].forEach(function (key) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      window.currentUser = null;
      window.mexaCurrentUser = null;

      // Kembali ke halaman Login.
      window.location.replace(
        new URL("./Login.html", window.location.href).href
      );

    } catch (error) {
      console.error("MEXA logout error:", error);

      alert(
        "Logout gagal: " +
        (error.message || "Terjadi kesalahan.")
      );
    }
  }

  // Daftarkan fungsi agar bisa dipanggil modul lain.
  window.MEXALogoutFix = logout;
  window.MEXALogout = logout;

  // Hubungkan dengan tombol Keluar Akun di Home.
  document.addEventListener("click", function (event) {
    const target = event.target;

    if (!(target instanceof Element)) return;

    const button = target.closest(
      '[data-action="logout"], #mexaLogout'
    );

    if (!button) return;

    event.preventDefault();
    logout();
  });

  console.log("MEXA: logout.js berhasil dimuat.");

})();
