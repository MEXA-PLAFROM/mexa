/* =========================================================
   MEXA - POST MENU
   Titik tiga postingan
   ========================================================= */

(function () {
  "use strict";

  let activePost = null;

  function getCurrentUserId() {
    if (typeof currentUser !== "undefined" && currentUser?.id) {
      return currentUser.id;
    }

    if (
      typeof supabaseClient !== "undefined" &&
      supabaseClient.auth
    ) {
      return supabaseClient.auth
        .getUser()
        .then(({ data }) => data?.user?.id || null)
        .catch(() => null);
    }

    return null;
  }

  function closePostMenu() {
    const oldMenu = document.getElementById("mexaPostMenu");
    if (oldMenu) oldMenu.remove();

    activePost = null;
  }

  function createMenu(post, isOwner) {
    closePostMenu();

    activePost = post;

    const menu = document.createElement("div");
    menu.id = "mexaPostMenu";

    menu.innerHTML = `
      <div class="mexa-post-menu-backdrop"></div>

      <div class="mexa-post-menu-box">
        <div class="mexa-post-menu-title">
          ${isOwner ? "Kelola Postingan" : "Bagikan Postingan"}
        </div>

        ${
          isOwner
            ? `
              <button type="button" data-action="edit">
                <span>✏️</span>
                <span>Edit postingan</span>
              </button>

              <button type="button" data-action="delete">
                <span>🗑️</span>
                <span>Hapus postingan</span>
              </button>
            `
            : `
              <button type="button" data-action="friend">
                <span>👥</span>
                <span>Bagikan ke teman MEXA</span>
              </button>

              <button type="button" data-action="group">
                <span>👨‍👩‍👧‍👦</span>
                <span>Bagikan ke grup MEXA</span>
              </button>

              <button type="button" data-action="other">
                <span>↗️</span>
                <span>Bagikan ke aplikasi lain</span>
              </button>

              <button type="button" data-action="copy">
                <span>🔗</span>
                <span>Salin tautan</span>
              </button>
            `
        }

        <button type="button" data-action="close" class="mexa-post-menu-cancel">
          Batal
        </button>
      </div>
    `;

    document.body.appendChild(menu);

    menu.querySelector(".mexa-post-menu-backdrop")
      ?.addEventListener("click", closePostMenu);

    menu.querySelectorAll("button").forEach(button => {
      button.addEventListener("click", () => {
        handlePostAction(button.dataset.action, post);
      });
    });
  }

  async function handlePostAction(action, post) {
    if (!post) return;

    if (action === "close") {
      closePostMenu();
      return;
    }

    if (action === "edit") {
      closePostMenu();

      if (typeof editPost === "function") {
        editPost(post.id);
      } else {
        console.warn("Fungsi editPost belum tersedia.");
      }

      return;
    }

    if (action === "delete") {
      closePostMenu();

      if (typeof deletePost === "function") {
        deletePost(post.id);
      } else {
        console.warn("Fungsi deletePost belum tersedia.");
      }

      return;
    }

    if (action === "friend") {
      closePostMenu();

      if (typeof openShareToFriend === "function") {
        openShareToFriend(post);
      } else {
        alert("Bagikan ke teman MEXA segera tersedia.");
      }

      return;
    }

    if (action === "group") {
      closePostMenu();

      if (typeof openShareToGroup === "function") {
        openShareToGroup(post);
      } else {
        alert("Bagikan ke grup MEXA segera tersedia.");
      }

      return;
    }

    if (action === "other") {
      shareToOtherApps(post);
      return;
    }

    if (action === "copy") {
      copyPostLink(post);
      return;
    }
  }

  async function shareToOtherApps(post) {
    const link =
      post.url ||
      `${window.location.origin}${window.location.pathname}#post-${post.id}`;

    const shareData = {
      title: "Postingan MEXA",
      text: post.content || "Lihat postingan ini di MEXA",
      url: link
    };

    closePostMenu();

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(link);
        alert("Tautan postingan berhasil disalin.");
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Gagal membagikan postingan:", error);
      }
    }
  }

  async function copyPostLink(post) {
    const link =
      post.url ||
      `${window.location.origin}${window.location.pathname}#post-${post.id}`;

    try {
      await navigator.clipboard.writeText(link);
      closePostMenu();
      alert("Tautan postingan berhasil disalin.");
    } catch (error) {
      console.error("Gagal menyalin tautan:", error);
      alert("Tautan belum bisa disalin.");
    }
  }

  window.openMexaPostMenu = async function (post) {
    if (!post?.id) return;

    const userId = await getCurrentUserId();

    const isOwner =
      Boolean(userId) &&
      String(userId) === String(post.user_id);

    createMenu(post, isOwner);
  };

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closePostMenu();
    }
  });

})();
