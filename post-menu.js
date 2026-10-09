
/* =========================================================
   MEXA — POST OWNER FIX
   Menghubungkan menu titik tiga dengan Edit dan Hapus.
   ========================================================= */

(function () {
  "use strict";

  function getPostId(post) {
    if (!post) return null;
    if (typeof post === "string") return post;
    return post.id || post.post_id || post.postId || null;
  }

  function showMessage(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    } else {
      alert(message);
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
      console.error("MEXA: fungsi editPost tidak tersedia.");
      showMessage("Fitur Edit belum terhubung.");
      return;
    }

    try {
      await window.editPost(post);
    } catch (error) {
      console.error("MEXA Edit Error:", error);
      showMessage("Gagal mengedit postingan.");
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
      console.error("MEXA: fungsi deletePost tidak tersedia.");
      showMessage("Fitur Hapus belum terhubung.");
      return;
    }

    try {
      await window.deletePost(postId);
    } catch (error) {
      console.error("MEXA Delete Error:", error);
      showMessage("Gagal menghapus postingan.");
    }
  });

  console.log("MEXA Post Owner Fix aktif.");
})();
```
