
/* =====================================================
   MEXA PLATFORM — POST CREATE
   File: post-create.js
   Membuat postingan melalui functions-post.js
   Supabase utama: MEXA SOSIAL
   ===================================================== */

(function () {
  "use strict";

  if (window.MEXAPostCreateLoaded) return;
  window.MEXAPostCreateLoaded = true;

  let isSubmitting = false;

  function getComposer() {
    return document.querySelector(
      "#mexaPostContent, #postContent, #postText, " +
      "#mexaComposerInput, textarea[name='content'], " +
      "[contenteditable='true'][data-post-content]"
    );
  }

  function getContent(input) {
    if (!input) return "";

    if (input.isContentEditable) {
      return String(input.innerText || "").trim();
    }

    return String(input.value || "").trim();
  }

  function setStatus(message, isError) {
    let status = document.getElementById("mexaPostCreateStatus");

    if (!status) {
      status = document.createElement("div");
      status.id = "mexaPostCreateStatus";
      status.setAttribute("role", "status");
      status.style.cssText =
        "margin:8px 0;padding:10px;border-radius:10px;" +
        "font-size:14px;";

      const composer = document.getElementById("mexa-composer");
      (composer || document.body).appendChild(status);
    }

    status.textContent = message;
    status.style.color = isError ? "#ff667a" : "";
  }

  async function createPost() {
    if (isSubmitting) return;

    const input = getComposer();
    const content = getContent(input);

    if (!content) {
      setStatus("Tulis sesuatu sebelum memposting.", true);
      if (input) input.focus();
      return false;
    }

    isSubmitting = true;

    const buttons = Array.from(
      document.querySelectorAll(
        "#mexaPublishPost, #mexaSubmitPost, " +
        "#mexaOpenComposer, #mexaMobileCreate, " +
        "[data-create-post]"
      )
    );

    buttons.forEach(function (button) {
      button.dataset.previousDisabled = String(button.disabled);
      button.disabled = true;
    });

    try {
      setStatus("Sedang menyimpan postingan...", false);

      // Gunakan fungsi posting bersama dari functions-post.js.
      if (
        !window.MEXAPosts ||
        typeof window.MEXAPosts.create !== "function"
      ) {
        throw new Error(
          "Fungsi posting belum siap. Pastikan functions-post.js " +
          "dimuat sebelum post-create.js."
        );
      }

      const result = await window.MEXAPosts.create(content);

      if (!result || !result.id) {
        throw new Error(
          "Server belum mengonfirmasi penyimpanan postingan."
        );
      }

      if (input.isContentEditable) {
        input.innerText = "";
      } else {
        input.value = "";
      }

      setStatus("Postingan berhasil disimpan!", false);

      // Muat ulang feed agar postingan baru terlihat.
      if (typeof window.MEXA_LOAD_FEED === "function") {
        await window.MEXA_LOAD_FEED();
      } else if (typeof window.MEXAPosts.load === "function") {
        await window.MEXAPosts.load();
      }

      return true;
    } catch (error) {
      console.error("MEXA gagal membuat postingan:", error);

      setStatus(
        "Postingan gagal: " +
        (error.message || "Terjadi kesalahan."),
        true
      );

      return false;
    } finally {
      isSubmitting = false;

      buttons.forEach(function (button) {
        button.disabled =
          button.dataset.previousDisabled === "true";

        delete button.dataset.previousDisabled;
      });
    }
  }

  // API untuk digunakan oleh file MEXA lainnya.
  window.MEXACreatePost = createPost;

  // Menangani klik tombol Posting.
  document.addEventListener("click", function (event) {
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest(
      "#mexaPublishPost, #mexaSubmitPost, [data-create-post]"
    );

    if (!button) return;

    event.preventDefault();
    createPost();
  });

  // Menangani form posting.
  document.addEventListener("submit", function (event) {
    const form = event.target;

    if (
      !(form instanceof HTMLFormElement) ||
      !form.matches("#mexaPostForm, #mexaPostFormHome")
    ) {
      return;
    }

    event.preventDefault();
    createPost();
  });

  console.log("MEXA PLATFORM: post-create.js siap.");
})();
