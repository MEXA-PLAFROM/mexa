/* MEXA — LOGOUT FIX */
(function () {
  "use strict";

  if (window.MEXALogoutFixLoaded) return;
  window.MEXALogoutFixLoaded = true;
  
async function logout() {
  if (!confirm("Yakin ingin keluar dari akun MEXA?")) return;

  try {
    // Gunakan client Supabase milik MEXA.
    const client =
      window.mexaSupabase ||
      window.supabaseClient ||
      window.supabase;

    if (!client?.auth?.signOut) {
      throw new Error("Client autentikasi Supabase tidak ditemukan.");
    }

    // Akhiri sesi Supabase.
    const { error } = await client.auth.signOut({
      scope: "local"
    });

    if (error) throw error;

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

    // Kembali ke Login.
    window.location.replace(
      new URL("./Login.html", window.location.href).href
    );
  } catch (error) {
    console.error("MEXA logout error:", error);
    alert("Logout gagal: " + error.message);
  }
  window.MEXALogoutFix = logout;
window.MEXALogout = logout;
}
}
