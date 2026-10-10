
/* ==================================================
   MEXA SOSIAL — POST FEED
   File: js/functions-post-feed.js
   Fungsi: Beranda + Profil Pemosting
   ================================================== */

(function () {
  "use strict";

  if (window.MEXAPostFeed) return;

  const API_URL =
    "https://yozylignolfvkemuhfse.supabase.co/functions/v1/mexa-api";

  const state = {
    homePosts: [],
    profilePosts: [],
    loading: false
  };

  async function api(action, extra = {}) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action,
        ...extra
      })
    });

    const result = await response.json();

    if (!response.ok || result.success !== true) {
      throw new Error(
        result.error || "Gagal mengambil postingan."
      );
    }

    return result;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      function (char) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        }[char];
      }
    );
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function renderPost(post) {
    const name = escapeHTML(
      post.display_name ||
      post.username ||
      "Pengguna MEXA"
    );

    const avatar = post.avatar_url
      ? `<img class="mx-feed-avatar"
          src="${escapeHTML(post.avatar_url)}"
          alt=""
          loading="lazy">`
      : `<div class="mx-feed-avatar mx-feed-avatar-fallback">
          ${escapeHTML(name.charAt(0).toUpperCase())}
        </div>`;

    const content = post.content
      ? `<div class="mx-feed-content">${escapeHTML(post.content)}</div>`
      : "";

    const image = post.image_url
      ? `<img class="mx-feed-image"
          src="${escapeHTML(post.image_url)}"
          alt="Foto postingan"
          loading="lazy">`
      : "";

    return `
      <header class="mx-feed-header">

  ${avatar}

  <div class="mx-feed-user">
    <div class="mx-feed-name">${name}</div>
    <time class="mx-feed-date">
      ${escapeHTML(formatDate(post.created_at))}
    </time>
  </div>

  <button
    type="button"
    class="mx-post-menu"
    data-post-id="${escapeHTML(post.id)}"
    aria-label="Menu postingan">
    ⋯
  </button>

</header>
        ${content}
        ${image}
      </article>
    `;
  }

  function renderInto(container, posts, emptyMessage) {
    if (!container) {
      throw new Error("Elemen feed tidak ditemukan.");
    }

    if (!posts.length) {
      container.innerHTML = `
        <div class="mx-feed-empty">
          ${escapeHTML(emptyMessage)}
        </div>
      `;
      return;
    }

    container.innerHTML = posts.map(renderPost).join("");
  }

  async function getPosts() {
    const result = await api("get_posts");
    return Array.isArray(result.posts) ? result.posts : [];
  }

  async function loadHome(selector) {
    const container = document.querySelector(selector);

    if (!container) {
      throw new Error(
        "Container Beranda tidak ditemukan: " + selector
      );
    }

    if (state.loading) return state.homePosts;

    state.loading = true;
    container.setAttribute("aria-busy", "true");

    try {
      const posts = await getPosts();

      state.homePosts = posts;

      renderInto(
        container,
        posts,
        "Belum ada postingan. Jadilah yang pertama!"
      );

      return posts;
    } catch (error) {
      console.error("MEXA Feed:", error);

      container.innerHTML = `
        <div class="mx-feed-empty">
          Gagal memuat postingan. Silakan segarkan halaman.
        </div>
      `;

      throw error;
    } finally {
      state.loading = false;
      container.setAttribute("aria-busy", "false");
    }
  }

  async function loadProfile(selector, userId) {
    if (!userId) {
      throw new Error("ID pemilik profil belum tersedia.");
    }

    const container = document.querySelector(selector);

    if (!container) {
      throw new Error("Container Profil tidak ditemukan.");
    }

    container.setAttribute("aria-busy", "true");

    try {
      const posts = await getPosts();

      state.profilePosts = posts.filter(
        post => String(post.user_id) === String(userId)
      );

      renderInto(
        container,
        state.profilePosts,
        "Pengguna ini belum memiliki postingan."
      );

      return state.profilePosts;
    } finally {
      container.setAttribute("aria-busy", "false");
    }
  }

  function installStyles() {
    if (document.getElementById("mexa-post-feed-styles")) return;

    const style = document.createElement("style");
    style.id = "mexa-post-feed-styles";

    style.textContent = `
      .mx-feed-card {
        margin: 0 0 14px;
        padding: 16px;
        border: 1px solid var(--mx-border, #2a2441);
        border-radius: 16px;
        background: var(--mx-panel, #141027);
        color: var(--mx-text, #f6f3ff);
        overflow: hidden;
      }

      .mx-feed-header {
        display: flex;
        align-items: center;
        gap: 11px;
        margin-bottom: 12px;
      }

      .mx-feed-avatar {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        border-radius: 50%;
        object-fit: cover;
      }

      .mx-feed-avatar-fallback {
        display: grid;
        place-items: center;
        background: #35265c;
        font-weight: 700;
      }

      .mx-feed-user {
        min-width: 0;
      }

      .mx-feed-name {
        font-weight: 700;
        overflow-wrap: anywhere;
      }

      .mx-feed-date {
        display: block;
        margin-top: 3px;
        font-size: 12px;
        color: var(--mx-muted, #aaa4c2);
      }

      .mx-feed-content {
        margin: 10px 0;
        line-height: 1.6;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .mx-feed-image {
        display: block;
        width: 100%;
        max-height: 560px;
        margin-top: 12px;
        border-radius: 12px;
        object-fit: contain;
      }

      .mx-feed-empty {
        padding: 24px 14px;
        text-align: center;
        color: var(--mx-muted, #aaa4c2);
      }
    `;

    document.head.appendChild(style);
  }
   .mx-feed-header {
  position: relative;
}

.mx-post-menu {
  margin-left: auto;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 0;
  background: transparent;
  color: var(--mx-text, #fff);
  font-size: 24px;
  cursor: pointer;
   }

  installStyles();

  window.MEXAPostFeed = Object.freeze({
    loadHome,
    loadProfile,
    refreshHome: loadHome,
    getPosts,
    getState: function () {
      return {
        homePosts: [...state.homePosts],
        profilePosts: [...state.profilePosts]
      };
    }
  });

  console.log("MEXA Post Feed berhasil dimuat.");
})();

