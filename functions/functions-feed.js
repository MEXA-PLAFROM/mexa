
/* =========================================================
   MEXA — HOME FEED
   File: functions/feed.js

   Memuat postingan dari MEXA API dan menampilkannya
   pada #mexaFeedList.
   ========================================================= */

(function () {
  "use strict";

  if (window.MEXA_FEED_LOADED) return;
  window.MEXA_FEED_LOADED = true;

  const API_URL =
    "https://mzcobvfvmhpleonncyrr.supabase.co/functions/v1/mexa-api";

  const FEED_CONTAINER_ID = "mexaFeedList";
  const STATUS_ID = "mexaFeedStatus";

  let loading = false;

  function notify(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    } else {
      console.info("MEXA:", message);
    }
  }

  function getPostId(post) {
    return post && (
      post.id ||
      post.post_id ||
      post.postId
    );
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function getAuthorName(post) {
    return (
      post.display_name ||
      post.username ||
      post.author_name ||
      post.profiles?.display_name ||
      post.profiles?.username ||
      post.user?.display_name ||
      post.user?.username ||
      "Pengguna MEXA"
    );
  }

  function getAvatar(post) {
    return (
      post.avatar_url ||
      post.profiles?.avatar_url ||
      post.user?.avatar_url ||
      ""
    );
  }

  function getContent(post) {
    return post.content || post.caption || post.text || "";
  }

  function getImage(post) {
    return post.image_url || post.media_url || "";
  }

  function getTime(post) {
    const raw = post.created_at || post.createdAt;
    if (!raw) return "Baru saja";

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "Baru saja";

    return date.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function setStatus(message) {
    const element = document.getElementById(STATUS_ID);
    if (element) element.textContent = message;
  }

  function renderPost(post) {
    const id = getPostId(post);
    if (!id) return "";

    const safeId = escapeHTML(id);
    const name = escapeHTML(getAuthorName(post));
    const username = escapeHTML(
      post.username ? "@" + post.username : ""
    );
    const content = escapeHTML(getContent(post));
    const time = escapeHTML(getTime(post));
    const avatar = getAvatar(post);
    const image = getImage(post);

    const avatarHTML = avatar
      ? `<img class="mx-feed-avatar"
              src="${escapeHTML(avatar)}"
              alt=""
              loading="lazy"
              referrerpolicy="no-referrer">`
      : `<span class="mx-feed-avatar-fallback">${escapeHTML(
          getAuthorName(post).slice(0, 1).toUpperCase()
        )}</span>`;

    const imageHTML = image
      ? `<img class="mx-feed-media"
              src="${escapeHTML(image)}"
              alt="Media postingan"
              loading="lazy"
              referrerpolicy="no-referrer">`
      : "";

    const likes = Number(post.like_count ?? post.likes_count ?? 0);
    const comments = Number(post.comment_count ?? post.comments_count ?? 0);
    const shares = Number(post.share_count ?? post.shares_count ?? 0);

    return `
      <article class="mx-feed-card" id="post-${safeId}"
               data-post-id="${safeId}">
        <header class="mx-post-head">
          <div class="mx-feed-author">
            ${avatarHTML}
            <div class="mx-feed-author-info">
              <strong>${name}</strong>
              <div class="mx-feed-meta">
                ${username ? username + " · " : ""}${time}
              </div>
            </div>
          </div>
          <button type="button"
                  class="mx-post-menu"
                  aria-label="Menu postingan"
                  data-post-id="${safeId}">⋯</button>
        </header>

        ${content ? `<div class="mx-feed-content">${content}</div>` : ""}
        ${imageHTML}

        <div class="mx-feed-counts">
          <span>${likes} suka</span>
          <span>${comments} komentar · ${shares} dibagikan</span>
        </div>

        <div class="mx-feed-actions">
          <button type="button" data-post-action="like"
                  data-post-id="${safeId}">♡ Suka</button>
          <button type="button" data-post-action="comment"
                  data-post-id="${safeId}">◌ Komentar</button>
          <button type="button" data-post-action="share"
                  data-post-id="${safeId}">↗ Bagikan</button>
        </div>
      </article>
    `;
  }

  function findPosts(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.posts)) return data.posts;
    if (Array.isArray(data?.data?.posts)) return data.data.posts;
    if (Array.isArray(data?.data)) return data.data;
    return null;
  }

  async function loadFeed() {
    if (loading) return;

    const container = document.getElementById(FEED_CONTAINER_ID);
    if (!container) {
      console.error("MEXA Feed: elemen #mexaFeedList tidak ditemukan.");
      return;
    }

    loading = true;
    setStatus("Memuat postingan...");

    try {
      /*
       * Nama aksi harus sesuai dengan index.ts mexa-api.
       * Jika API menggunakan nama aksi berbeda, sesuaikan
       * nilai action di bawah.
       */
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "get_posts"
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false || result.error) {
        throw new Error(
          result.error || result.message ||
          "Server gagal mengambil postingan (HTTP " +
          response.status + ")."
        );
      }

      const posts = findPosts(result);

      if (!posts) {
        throw new Error(
          "Format respons API tidak dikenali. Periksa respons mexa-api."
        );
      }

      window.MEXA_POSTS = posts;

      if (posts.length === 0) {
        container.innerHTML = "";
        setStatus("Belum ada postingan untuk ditampilkan.");
        return;
      }

      container.innerHTML = posts.map(renderPost).join("");
      setStatus("");

      document.dispatchEvent(new CustomEvent("mexa:feed-loaded", {
        detail: { posts: posts }
      }));

    } catch (error) {
      console.error("MEXA Feed:", error);
      setStatus("Postingan gagal dimuat. Periksa koneksi dan konfigurasi API.");
    } finally {
      loading = false;
    }
  }

  // Hubungkan menu titik tiga dengan data postingan.
  document.addEventListener("click", function (event) {
    const button = event.target.closest(".mx-post-menu");
    if (!button) return;

    event.preventDefault();

    const id = button.dataset.postId;
    const post = (window.MEXA_POSTS || []).find(
      item => String(getPostId(item)) === String(id)
    );

    if (!post) {
      notify("Data postingan tidak ditemukan.");
      return;
    }

    if (typeof window.openPostMenu === "function") {
      window.openPostMenu(post);
    } else {
      notify("Menu postingan belum dimuat.");
    }
  });

  window.MEXA_LOAD_FEED = loadFeed;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadFeed, { once: true });
  } else {
    loadFeed();
  }

  console.log("MEXA Feed siap.");
})();
