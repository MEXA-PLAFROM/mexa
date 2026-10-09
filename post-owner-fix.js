/* =========================================================
   MEXA — POST OWNER FIX
   File: post-owner-fix.js

   Menghubungkan menu titik tiga dengan fungsi
   editPost() dan deletePost() yang sudah ada.
   ========================================================= */

(function () {
  "use strict";

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
      showMessage("Fungsi edit belum terhubung.");
      console.error("MEXA: editPost() tidak tersedia di window.");
      return;
    }

    try {
      await window.editPost(post);
    } catch (error) {
      console.error("MEXA edit post:", error);
      showMessage("Gagal membuka fitur edit postingan.");
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
      showMessage("Fungsi hapus belum terhubung.");
      console.error("MEXA: deletePost() tidak tersedia di window.");
      return;
    }

    try {
  await window.editPost(post);
} catch (error) {
  });

  console.log("MEXA Post Owner Fix siap.");

})();
```
