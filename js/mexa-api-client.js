
(function () {
  "use strict";

  if (window.MEXAApi) {
    console.info("MEXA API Client sudah aktif.");
    return;
  }

  const API_URL =
    "https://yozylignolfvkemuhfse.supabase.co/functions/v1/mexa-api";

  let activeRequests = 0;

  async function getAccessToken() {
    const client = window.mexaSupabase;

    if (!client?.auth) {
      throw new Error(
        "Koneksi autentikasi MEXA belum siap."
      );
    }

    const { data, error } = await client.auth.getSession();

    if (error) {
      throw new Error(
        "Sesi MEXA gagal diperiksa. Silakan login kembali."
      );
    }

    const session = data?.session;

    if (!session?.access_token) {
      throw new Error(
        "Sesi login tidak ditemukan. Silakan login kembali."
      );
    }

    return session.access_token;
  }

  async function request(action, payload = {}) {
    if (!action || typeof action !== "string") {
      throw new Error("Aksi MEXA tidak valid.");
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      throw new Error("Data permintaan MEXA tidak valid.");
    }

    const token = await getAccessToken();

    activeRequests++;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
          action,
          ...payload
        })
      });

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          "Server MEXA mengirim respons yang tidak valid."
        );
      }

      if (!response.ok || result?.success !== true) {
        throw new Error(
          result?.error ||
          result?.message ||
          "Permintaan MEXA gagal (" +
            response.status +
            ")."
        );
      }

      return result;
    } finally {
      activeRequests--;
    }
  }

  async function currentUser() {
    const client = window.mexaSupabase;

    if (!client?.auth) {
      return null;
    }

    const { data, error } = await client.auth.getUser();

    if (error || !data?.user) {
      return null;
    }

    return data.user;
  }

  window.MEXAApi = Object.freeze({
    request,
    currentUser,
    getAccessToken,
    getActiveRequests: function () {
      return activeRequests;
    }
  });

  console.info("MEXA API Client siap.");
})();
