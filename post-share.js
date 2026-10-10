
(function () {
  "use strict";

  if (window.MEXAPostShare) {
    console.info("MEXA Post Share sudah aktif.");
    return;
  }

  function notify(message, isError = false) {
    if (typeof window.showToast === "function") {
      window.showToast(message, isError ? "error" : "success");
      return;
    }

    if (isError) {
      console.error("MEXA Share:", message);
    } else {
      console.info("MEXA Share:", message);
    }
  }

  function getPostId(post) {
    if (typeof post === "string" || typeof post === "number") {
      return String(post);
    }

    return String(
      post?.id ||
      post?.post_id ||
      post?.postId ||
      ""
    );
  }

  async function sharePost(post) {
    const postId = getPostId(post);

    if (!postId) {
      notify("Postingan tidak ditemukan.", true);
      return null;
    }

    try {
      if (!window.MEXAApi) {
        throw new Error(
          "MEXA API Client belum dimuat. Periksa urutan file."
        );
      }

      const user = await window.MEXAApi.currentUser();

      if (!user) {
        throw new Error(
          "Sesi login tidak ditemukan. Silakan login kembali."
        );
      }

      const result = await window.MEXAApi.request("share_post", {
        post_id: postId,
        postId: postId,
        user_id: user.id,
        userId: user.id
      });

      window.dispatchEvent(
        new CustomEvent("mexa:post-share-updated", {
          detail: {
            postId,
            count: result.count ?? null
          }
        })
      );

      notify("Postingan berhasil dibagikan.");
      return result;
    } catch (error) {
      console.error("MEXA Share gagal:", error);
      notify(error.message || "Gagal membagikan postingan.", true);
      return null;
    }
  }

  async function getShareCount(post) {
    const postId = getPostId(post);

    if (!postId) {
      return 0;
    }

    try {
      if (!window.MEXAApi) {
        throw new Error("MEXA API Client belum dimuat.");
      }

      const result = await window.MEXAApi.request(
        "get_share_count",
        {
          post_id: postId,
          postId: postId
        }
      );

      return Number(result.count || 0);
    } catch (error) {
      console.error("MEXA Share Count:", error);
      return 0;
    }
  }

  window.mexaSharePost = sharePost;
  window.mexaGetShareCount = getShareCount;

  window.MEXAPostShare = Object.freeze({
    share: sharePost,
    getCount: getShareCount
  });

  console.info("MEXA Post Share siap.");
})();
