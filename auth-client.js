
/* MEXA — SHARED AUTH CLIENT */
(function () {
  "use strict";

  if (window.mexaSupabase?.auth) return;

  const SUPABASE_URL =
    "https://yozylignolfvkemuhfse.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_XTj3R7a5ItH0lo3pVLomrQ_-mZ-I-Uo";

  if (!window.supabase?.createClient) {
    console.error("MEXA: Supabase SDK belum dimuat.");
    return;
  }

  window.mexaSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  console.log("MEXA: klien autentikasi siap.");
})();
