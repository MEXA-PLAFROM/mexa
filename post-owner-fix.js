
/* =========================================================
   MEXA — POST OWNER FIX
   File: post-owner-fix.js

   Penghubung event edit dan hapus postingan.
   Tidak menggantikan post-menu.js atau fungsi backend.
   ========================================================= */

(function () {
  "use strict";

  if (window.MEXA_POST_OWNER_FIX_LOADED) return;
  window.MEXA_POST_OWNER_FIX_LOADED = true;

  function getPostId(post) {
    if (!post) return null;

    if (typeof post === "string") {
      return post;
    }

    return post.id || post.post_id || post.postId || null;
  }

  function showMessage(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    } else {
      console.info("MEXA:", message);
    }
  }

  // EDIT POST
  window.addEventListener("mexa:edit-post", async function (event) {
    const post = event.detail && event.detail.post;

    if (!post) {
      showMessage("Data postingan tidak ditemukan.");
      return;
    }

    if (typeof window.editPost !== "function") {
      showMessage("Fungsi edit postingan belum terhubung.");
      console.error("MEXA: editPost() tidak tersedia.");
      return;
    }

    try {
      await window.editPost(post);
    } catch (error) {
      console.error("MEXA edit post:", error);
      showMessage("Gagal membuka edit postingan.");
    }
  });

  // DELETE POST
  window.addEventListener("mexa:delete-post", async function (event) {
    const post = event.detail && event.detail.post;
    const postId = getPostId(post);

    if (!postId) {
      showMessage("ID postingan tidak ditemukan.");
      return;
    }

    if (typeof window.deletePost !== "function") {
      showMessage("Fungsi hapus postingan belum terhubung.");
      console.error("MEXA: deletePost() tidak tersedia.");
      return;
    }

    try {
      await window.deletePost(postId);
    } catch (error) {
      console.error("MEXA delete post:", error);
      showMessage("Gagal menghapus postingan.");
    }
  });

  console.log("MEXA Post Owner Fix siap.");
})();
