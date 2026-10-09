/* MEXA — LOGOUT FIX */
(function () {
  "use strict";

  if (window.MEXALogoutFixLoaded) return;
  window.MEXALogoutFixLoaded = true;

  async function logout() {
    if (!confirm("Yakin ingin keluar dari akun MEXA?")) return;

    try {
      // Keluar dari sesi Supabase jika client tersedia.
      const client =
        window.supabaseClient ||
        window.mexaSupabase ||
        window.supabase;

      if (client?.auth?.signOut) {
        const { error } = await client.auth.signOut();
        if (error) throw error;
      } else if (typeof window.mexaLogout === "function") {
        await window.mexaLogout();
      }

      // Hapus data sesi lokal MEXA.
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

      // Pindah ke Login dengan URL absolut.
      window.location.replace(
        new URL("./Login.html", window.location.href).href
      );
    } catch (error) {
      console.error("MEXA logout error:", error);
      alert("Logout gagal. Periksa Console untuk detail error.");
    }
  }

  window.MEXALogoutFix = logout;

  document.addEventListener("click", function (event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest(
      '#mexaLogout, [data-mexa-logout], [data-action="logout"]'
    );

    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    logout();
  }, true);

  console.log("MEXA Logout Fix aktif.");
})();
