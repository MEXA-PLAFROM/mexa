
/* =========================================
   MEXA HOME JS
   Fungsi halaman utama
   Terhubung ke functions-post.js
========================================= */

(function () {
  "use strict";

  if (window.MEXA_HOME_JS_LOADED) return;
  window.MEXA_HOME_JS_LOADED = true;

  function $(id) {
    return document.getElementById(id);
  }

  // ==============================
  // TOMBOL BUAT POSTINGAN
  // ==============================

  function initCreateButton() {
    const button = $("mx-create");
    const composer = $("mexa-composer");
    const textarea = $("mexaPostContent");

    if (!button || !composer) return;

    button.addEventListener("click", function () {
      composer.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      if (textarea) {
        textarea.focus({ preventScroll: true });
      }
    });
  }

  // ==============================
  // TOMBOL MEDIA
  // ==============================

  function initMediaButtons() {
    const buttons = document.querySelectorAll(
      ".mx-create-buttons button"
    );

    buttons.forEach(function (button) {
      if (button.id === "mexaPostButton") return;

      button.addEventListener("click", function () {
        const text = button.textContent.trim();

        if (text.includes("Foto")) {
          alert("MEXA: fitur foto akan kita hubungkan berikutnya.");
        } else if (text.includes("Video")) {
          alert("MEXA: fitur video akan kita hubungkan berikutnya.");
        } else if (text.includes("Perasaan")) {
          alert("MEXA: fitur perasaan akan kita hubungkan berikutnya.");
        }
      });
    });
  }

  // ==============================
  // SEGARKAN CERITA
  // ==============================

  function initRefreshStory() {
    const buttons = document.querySelectorAll(".mx-title button");

    buttons.forEach(function (button) {
      if (!button.textContent.includes("Segarkan")) return;

      button.addEventListener("click", function () {
        const list = $("mexa-story-list");
        if (!list) return;

        list.textContent = "Memuat cerita MEXA...";

        window.setTimeout(function () {
          list.textContent = "Belum ada cerita terbaru.";
        }, 800);
      });
    });
  }

  // ==============================
  // KIRIM POSTING KE SUPABASE
  // ==============================

  function initPostButton() {
    const button = $("mexaPostButton");
    const textarea = $("mexaPostContent");

    if (!button || !textarea) return;

    button.addEventListener("click", async function () {
      const content = textarea.value.trim();

      if (!content) {
        alert("Tulis sesuatu sebelum posting.");
        textarea.focus();
        return;
      }

      if (button.disabled) return;

      // Pastikan mesin posting sudah dimuat.
      if (
        !window.MEXAPosts ||
        typeof window.MEXAPosts.create !== "function"
      ) {
        console.error("MEXA: window.MEXAPosts.create belum tersedia.");

        alert(
          "Mesin posting belum siap. Periksa urutan script functions-post.js di halaman MEXA."
        );
        return;
      }

      const originalText = button.textContent;

      button.disabled = true;
      button.textContent = "Mengirim...";

      try {
        // Simpan melalui fungsi Supabase yang sudah tersedia.
        await window.MEXAPosts.create(content);

        textarea.value = "";

        // Muat ulang feed bila fungsi tersedia.
        if (typeof window.MEXA_LOAD_FEED === "function") {
          await window.MEXA_LOAD_FEED();
        } else if (
          window.MEXAPosts &&
          typeof window.MEXAPosts.load === "function"
        ) {
          await window.MEXAPosts.load();
        }

        alert("Postingan berhasil disimpan ke MEXA!");
      } catch (error) {
        console.error("MEXA: posting gagal.", error);

        alert(
          "Posting gagal: " +
          (error && error.message
            ? error.message
            : "Terjadi kesalahan.")
        );
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    });
  }

  // ==============================
  // JALANKAN FUNGSI HOME
  // ==============================

  function init() {
    initCreateButton();
    initMediaButtons();
    initRefreshStory();
    initPostButton();

    console.log("MEXA HOME JS berhasil dimuat.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }
})();
