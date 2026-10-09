/* =====================================================
   MEXA — POST CREATE
   File: post-create.js

   Fungsi:
   - Membuat postingan
   - Mengirim postingan ke Supabase melalui mexa-api
   - Memuat ulang feed setelah berhasil
   - Tidak mengganti sistem login atau backend
   ===================================================== */

(function () {
  "use strict";

  if (window.MEXAPostCreateLoaded) return;
  window.MEXAPostCreateLoaded = true;

  const API_URL =
    "https://mzcobvfvmhpleonncyrr.supabase.co/functions/v1/mexa-api";

  let isSubmitting = false;

  function getCurrentUser() {
    if (window.currentUser) return window.currentUser;
    if (window.mexaCurrentUser) return window.mexaCurrentUser;

    try {
      const keys = [
        "mexa_user",
        "currentUser",
        "mexaCurrentUser"
      ];

      for (const key of keys) {
        const value = localStorage.getItem(key);
        if (!value) continue;

        const user = JSON.parse(value);
        if (user && (user.id || user.user_id)) return user;
      }
    } catch (error) {
      console.warn("MEXA: sesi pengguna tidak terbaca.", error);
    }

    return null;
  }

  function getUserId(user) {
    return user && (
      user.id ||
      user.user_id ||
      user.userId
    );
  }

  function getComposer() {
    return document.querySelector(
      "#mexaPostContent, #postContent, " +
      "#postText, #mexaComposerInput, " +
      "textarea[name='content'], " +
      "[contenteditable='true'][data-post-content]"
    );
  }

  function getContent(input) {
    if (!input) return "";

    if (input.isContentEditable) {
      return (input.innerText || "").trim();
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

      if (composer) {
        composer.appendChild(status);
      } else {
        document.body.appendChild(status);
      }
    }

    status.textContent = message;
    status.style.color = isError ? "#ff6b6b" : "inherit";
  }

  async function callAPI(action, body) {
    // Gunakan helper API MEXA yang sudah tersedia bila ada.
    if (typeof window.mexaAPI === "function") {
      return await window.mexaAPI(action, body);
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: action,
        ...body
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false || result.error) {
      throw new Error(
        result.message ||
        result.error ||
        "Permintaan postingan gagal."
      );
    }

    return result;
  }

  async function createPost() {
    if (isSubmitting) return;

    const user = getCurrentUser();
    const userId = getUserId(user);

    if (!userId) {
      setStatus(
        "Sesi login tidak ditemukan. Silakan login kembali.",
        true
      );
      return;
    }

    const input = getComposer();
    const content = getContent(input);

    if (!content) {
      setStatus("Tulis sesuatu sebelum membuat postingan.", true);
      if (input) input.focus();
      return;
    }

    isSubmitting = true;
    setStatus("Sedang mengirim postingan...", false);

    const submitButtons = Array.from(
      document.querySelectorAll(
        "#mexaOpenComposer, #mexaMobileCreate, " +
        "[data-create-post], #mexaSubmitPost"
      )
    );

    submitButtons.forEach(function (button) {
      button.dataset.previousDisabled = button.disabled
        ? "true"
        : "false";
      button.disabled = true;
    });

    try {
      /*
       * Nama action "create_post" harus didukung oleh
       * handler action di Edge Function mexa-api.
       */
      const result = await callAPI("create_post", {
        user_id: userId,
        content: content
      });

      if (!result || result.success === false || result.error) {
        throw new Error(
          result?.message ||
          result?.error ||
          "Server belum menerima postingan."
        );
      }

      if (input) {
        if (input.isContentEditable) {
          input.innerText = "";
        } else {
          input.value = "";
        }
      }

      setStatus("Postingan berhasil dikirim!", false);

      // Beri kesempatan modul feed yang sudah ada memuat ulang.
      if (typeof window.loadFeed === "function") {
        await window.loadFeed();
      } else if (typeof window.loadPosts === "function") {
        await window.loadPosts();
      } else if (typeof window.mexaLoadFeed === "function") {
        await window.mexaLoadFeed();
      } else {
        document.dispatchEvent(
          new CustomEvent("mexa:refresh-feed")
        );
      }
    } catch (error) {
      console.error("MEXA create post:", error);

      setStatus(
        "Postingan gagal dikirim: " +
        (error.message || "Periksa koneksi dan action API."),
        true
      );
    } finally {
      isSubmitting = false;

      submitButtons.forEach(function (button) {
        button.disabled =
          button.dataset.previousDisabled === "true";
        delete button.dataset.previousDisabled;
      });
    }
  }

  // API publik untuk dipanggil dari tombol atau modul lain.
  window.MEXACreatePost = createPost;

  // Tombol submit dengan selector khusus.
  document.addEventListener("click", function (event) {
    const button = event.target.closest(
      "#mexaSubmitPost, [data-create-post]"
    );

    if (!button) return;

    event.preventDefault();
    createPost();
  });

  // Form postingan jika memakai form HTML.
  document.addEventListener("submit", function (event) {
    if (!event.target.matches("#mexaPostForm")) return;

    event.preventDefault();
    createPost();
  });

  // Modul feed boleh mendengarkan event ini untuk refresh.
  document.addEventListener("mexa:refresh-feed", function () {
    if (typeof window.loadFeed === "function") {
      window.loadFeed();
    } else if (typeof window.loadPosts === "function") {
      window.loadPosts();
    } else if (typeof window.mexaLoadFeed === "function") {
      window.mexaLoadFeed();
    }
  });

  console.log("MEXA post-create.js siap.");
})();
