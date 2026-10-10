/* =====================================================
   MEXA — POST CREATE
   File: post-create.js
   Membuat postingan melalui Edge Function mexa-api
   ===================================================== */

(function () {
  "use strict";

  if (window.MEXAPostCreateLoaded) return;
  window.MEXAPostCreateLoaded = true;

  // URL harus berupa string dan memakai tanda kutip.
  const API_URL =
    "https://mzcobvfvmhpleonncyrr.supabase.co/functions/v1/mexa-api";

  let isSubmitting = false;

  async function getCurrentUser() {
    const client = window.mexaSupabase;

    if (client && client.auth && client.auth.getSession) {
      try {
        const { data, error } = await client.auth.getSession();

        if (!error && data && data.session && data.session.user) {
          window.currentUser = data.session.user;
          window.mexaCurrentUser = data.session.user;
          return data.session.user;
        }
      } catch (error) {
        console.error("MEXA: gagal membaca sesi:", error);
      }
    }

    if (window.currentUser && window.currentUser.id) {
      return window.currentUser;
    }

    if (window.mexaCurrentUser && window.mexaCurrentUser.id) {
      return window.mexaCurrentUser;
    }

    return null;
  }

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
      (composer || document.body).appendChild(status);
    }

    status.textContent = message;
    status.style.color = isError ? "#ff6b6b" : "inherit";
  }

  async function callAPI(action, body) {
    let response;

    try {
      response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: action,
          ...body
        })
      });
    } catch (error) {
      console.error("MEXA API tidak dapat dijangkau:", error);

      throw new Error(
        "Gagal terhubung ke server. Periksa URL API, " +
        statusCORSHint()
      );
    }

    const result = await response.json().catch(function () {
      return {};
    });

    if (!response.ok || result.success === false || result.error) {
      throw new Error(
        result.message ||
        result.error ||
        ("Server mengembalikan HTTP " + response.status)
      );
    }

    return result;
  }

  function statusCORSHint() {
    return "CORS atau koneksi jaringan Supabase.";
  }

  async function createPost() {
    if (isSubmitting) return;

    const user = await getCurrentUser();

    if (!user || !user.id) {
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

    const buttons = Array.from(
      document.querySelectorAll(
        "#mexaPublishPost, #mexaSubmitPost, " +
        "#mexaOpenComposer, #mexaMobileCreate, " +
        "[data-create-post]"
      )
    );

    buttons.forEach(function (button) {
      button.dataset.previousDisabled = button.disabled
        ? "true"
        : "false";
      button.disabled = true;
    });

    try {
      const result = await callAPI("create_post", {
        user_id: user.id,
        content: content
      });

      if (!result || result.success !== true) {
        throw new Error(
          (result && (result.message || result.error)) ||
          "Server belum mengonfirmasi keberhasilan postingan."
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

      // Muat ulang feed tanpa mengubah sistem login.
      if (typeof window.MEXA_LOAD_FEED === "function") {
        await window.MEXA_LOAD_FEED();
      } else if (typeof window.loadFeed === "function") {
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
        (error.message || "Terjadi kesalahan."),
        true
      );
    } finally {
      isSubmitting = false;

      buttons.forEach(function (button) {
        button.disabled =
          button.dataset.previousDisabled === "true";
        delete button.dataset.previousDisabled;
      });
    }
  }

  window.MEXACreatePost = createPost;

  // Tombol posting.
  document.addEventListener("click", function (event) {
    const target = event.target;

    if (!(target instanceof Element)) return;

    const button = target.closest(
      "#mexaPublishPost, #mexaSubmitPost, [data-create-post]"
    );

    if (!button) return;

    event.preventDefault();
    createPost();
  });

  // Form posting, jika digunakan.
  document.addEventListener("submit", function (event) {
    const form = event.target;

    if (!(form instanceof HTMLFormElement)) return;

    if (!form.matches("#mexaPostForm, #mexaPostFormHome")) {
      return;
    }

    event.preventDefault();
    createPost();
  });

  document.addEventListener("mexa:refresh-feed", function () {
    if (typeof window.MEXA_LOAD_FEED === "function") {
      window.MEXA_LOAD_FEED();
    } else if (typeof window.loadFeed === "function") {
      window.loadFeed();
    } else if (typeof window.loadPosts === "function") {
      window.loadPosts();
    }
  });

  console.log("MEXA post-create.js siap.");
})();
