/* =========================================================
   MEXA — POST SHARE
   File: post-share.js
   Fungsi:
   - Membagikan postingan
   - Menampilkan hasil share
   - Mengambil jumlah share
   - Tidak menyimpan Supabase key
   - Tidak mengatur menu titik tiga
   ========================================================= */

(function () {
  "use strict";

  /* =======================================================
     KONFIGURASI
     ======================================================= */

  const MEXA_API =
    "https://mzcobvfvmhpleonncyrr.supabase.co/functions/v1/mexa-api";


  /* =======================================================
     API MEXA
     ======================================================= */

  async function mexaShareAPI(action, body = {}) {
    try {
      const response = await fetch(MEXA_API, {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          action,
          ...body
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
          data?.message ||
          "Server MEXA mengalami masalah."
        );
      }

      return data;

    } catch (error) {
      console.error("MEXA SHARE ERROR:", error);

      return {
        success: false,
        error: error?.message || "Gagal menghubungi server MEXA."
      };
    }
  }


  /* =======================================================
     AMBIL POST ID
     ======================================================= */

  function getPostId(post) {
    if (!post) return null;

    return (
      post.id ||
      post.post_id ||
      post.postId ||
      null
    );
  }


  /* =======================================================
     BAGIKAN POSTINGAN
     ======================================================= */

  async function sharePost(post) {

    const postId = getPostId(post);

    if (!postId) {
      showShareToast(
        "Postingan tidak ditemukan."
      );

      return {
        success: false
      };
    }


    /*
      User ID sengaja tidak dipaksakan di sini.

      Identitas user akan mengikuti sistem login/profil
      MEXA yang nanti sudah kita rapikan.
    */

    const result = await mexaShareAPI(
      "share_post",
      {
        post_id: postId
      }
    );


    if (!result?.success) {

      showShareToast(
        result?.error ||
        "Postingan gagal dibagikan."
      );

      return result;
    }


    const count =
      Number(
        result.share_count ??
        result.count ??
        0
      );


    showShareToast(
      result.shared === false
        ? "Postingan sudah pernah kamu bagikan."
        : "Postingan berhasil dibagikan."
    );


    /*
      Beritahu Home bahwa jumlah share berubah.
    */

    window.dispatchEvent(
      new CustomEvent(
        "mexa:post-share-updated",
        {
          detail: {
            post,
            postId,
            shareCount: count
          }
        }
      )
    );


    return result;
  }


  /* =======================================================
     AMBIL JUMLAH SHARE
     ======================================================= */

  async function getShareCount(post) {

    const postId = getPostId(post);

    if (!postId) {
      return 0;
    }


    const result = await mexaShareAPI(
      "get_share_count",
      {
        post_id: postId
      }
    );


    if (!result?.success) {
      return 0;
    }


    return Number(
      result.share_count ??
      result.count ??
      0
    );
  }


  /* =======================================================
     TOAST
     ======================================================= */

  function showShareToast(message) {

    let toast =
      document.getElementById(
        "mexaShareToast"
      );


    if (!toast) {

      toast =
        document.createElement("div");

      toast.id =
        "mexaShareToast";

      toast.innerHTML =
        `<span id="mexaShareToastText"></span>`;

      document.body.appendChild(toast);


      const style =
        document.createElement("style");

      style.id =
        "mexaShareToastStyle";

      style.textContent = `
        #mexaShareToast {
          position: fixed;
          left: 50%;
          bottom: 28px;
          transform: translate(-50%, 20px);
          z-index: 999999;

          min-width: 220px;
          max-width: calc(100vw - 32px);

          padding: 13px 18px;

          border-radius: 16px;

          background:
            rgba(20,20,24,.94);

          color: #fff;

          font-family:
            Arial,
            sans-serif;

          font-size: 14px;
          font-weight: 600;

          text-align: center;

          box-shadow:
            0 12px 35px
            rgba(0,0,0,.30);

          opacity: 0;

          pointer-events: none;

          transition:
            opacity .22s ease,
            transform .22s ease;

          backdrop-filter:
            blur(16px);
        }

        #mexaShareToast.show {
          opacity: 1;
          transform:
            translate(-50%, 0);
        }
      `;

      document.head.appendChild(style);
    }


    const text =
      document.getElementById(
        "mexaShareToastText"
      );


    if (text) {
      text.textContent = message;
    }


    toast.classList.add("show");


    clearTimeout(
      toast._mexaTimer
    );


    toast._mexaTimer =
      setTimeout(() => {

        toast.classList.remove(
          "show"
        );

      }, 2400);
  }


  /* =======================================================
     HUBUNGKAN KE POST-MENU.JS
     ======================================================= */

  window.mexaSharePost =
    sharePost;


  window.mexaGetShareCount =
    getShareCount;


  window.MEXAPostShare = {

    sharePost,

    getShareCount,

    showShareToast

  };


  console.log(
    "MEXA POST SHARE: aktif."
  );

})();
