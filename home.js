/* =====================================================
   MEXA HOME JS
   Tugas: Tombol Home dan form postingan
   ===================================================== */

(function (window, document) {
  "use strict";

  if (window.MEXA_HOME_LOADED) return;
  window.MEXA_HOME_LOADED = true;

  function $(id) {
    return document.getElementById(id);
  }

  // BUKA AREA BUAT POSTINGAN
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

      if (textarea) textarea.focus();
    });
  }

  // TOMBOL FOTO, VIDEO, DAN PERASAAN
  function initMediaButtons() {
    const buttons = document.querySelectorAll(
      ".mx-create-buttons button"
    );

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        const label = button.textContent.trim();

        if (label.includes("Foto")) {
          alert("Fitur foto belum dihubungkan.");
        } else if (label.includes("Video")) {
          alert("Fitur video belum dihubungkan.");
        } else if (label.includes("Perasaan")) {
          alert("Fitur perasaan belum dihubungkan.");
        }
      });
    });
  }

  // TOMBOL SEGARKAN CERITA
  function initRefreshStory() {
    const buttons = document.querySelectorAll(
      ".mx-title button"
    );

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

  // KIRIM POSTINGAN KE FUNCTIONS-POST.JS
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

      if (
        !window.MEXAPosts ||
        typeof window.MEXAPosts.create !== "function"
      ) {
        console.error("MEXA POSTS API belum aktif.");

        alert(
          "Sistem postingan belum aktif. Periksa urutan file JavaScript."
        );

        return;
      }

      button.disabled = true;

      const originalText = button.textContent;
      button.textContent = "Mengirim...";

      try {
        await window.MEXAPosts.create(content);

        textarea.value = "";

        const status = $("mexaFeedStatus");

        if (status) {
          status.textContent = "Postingan berhasil diterbitkan.";
          status.style.color = "#34d399";
        } else {
          alert("Postingan berhasil diterbitkan.");
        }
      } catch (error) {
        console.error("MEXA gagal membuat postingan:", error);

        alert(
          "Postingan gagal dikirim: " + error.message
        );
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    });
  }

  function init() {
    initCreateButton();
    initMediaButtons();
    initRefreshStory();
    initPostButton();

    console.log("MEXA HOME siap.");
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})(window, document);
