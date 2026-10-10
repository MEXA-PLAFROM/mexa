/* =====================================================
MEXA PLATFORM — AUTH CLIENT
Koneksi bersama ke Supabase MEXA SOSIAL
===================================================== */

(function () {
"use strict";

if (window.mexaSupabase?.auth) {
console.log("MEXA: Auth client sudah aktif.");
return;
}

const SUPABASE_URL =
"https://yozylignolfvkemuhfse.supabase.co";

const SUPABASE_KEY =
"sb_publishable_XTj3R7a5ItH0lo3pVLomrQ_-mZ-I-Uo";

if (!window.supabase?.createClient) {
console.error(
"MEXA: Supabase SDK belum dimuat. Periksa urutan script."
);
return;
}

window.mexaSupabase = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);

console.log("MEXA: Koneksi Supabase siap.");
})();
