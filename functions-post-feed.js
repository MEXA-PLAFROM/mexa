
/* ==================================================
   MEXA SOSIAL — POST FEED
   File: js/functions-post-feed.js
   Fungsi: Beranda + Profil Pemosting
   ================================================== */

(function () {
  "use strict";

  // Jangan daftarkan modul dua kali.
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

  // Menghindari HTML dari konten pengguna
  // agar konten postingan ditampilkan sebagai teks.
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
      <article class="mx-feed-card"
               data-post-id="${escapeHTML(post.id)}">
        <header class="mx-feed-header">
          ${avatar}
          <div class="mx-feed-user">
            <div class="mx-feed-name">${name}</div>
            <time class="mx-feed-date">
              ${escapeHTML(formatDate(post.created_at))}
            </time>
          </div>
        </header>
        ${content}
        ${image}
      </article>
    `;
  }

  function renderInto(container, posts, emptyMessage) {
    if (!container) {
      throw new Error(
        "Elemen feed tidak ditemukan. Periksa selector halaman."
      );
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

  // Ambil daftar postingan terbaru.
  async function getPosts() {
    const result = await api("get_posts");
    return Array.isArray(result.posts) ? result.posts : [];
  }

  // Tampilkan semua postingan di Beranda.
  async function loadHome(selector) {
    const container = document.querySelector(selector);

    if (!container) {
      throw new Error(
        "Container Beranda tidak ditemukan: " + selector
      );
    }

    container.setAttribute("aria-busy", "true");

    try {
      const posts = await getPosts();

      state.homePosts = posts;

      renderInto(
        container,
        state.homePosts,
        "Belum ada postingan. Jadilah yang pertama!"
      );

      return state.homePosts;
    } finally {
      container.setAttribute("aria-busy", "false");
    }
  }

  // Tampilkan postingan milik profil yang sedang dibuka.
  async function loadProfile(selector, userId) {
    if (!userId) {
      throw new Error("ID pemilik profil belum tersedia.");
    }

    const container = document.querySelector(selector);

    if (!container) {
      throw new Error(
        "Container Profil tidak ditemukan: " + selector
      );
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

  // CSS minimal untuk feed.
  function installStyles() {
    if (document.getElementById("mexa-post-feed-styles")) {
      return;
    }

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

  installStyles();

  window.MEXAPostFeed = Object.freeze({
    loadHome,
    loadProfile,
    refreshHome: loadHome,
    getPosts,
    getState: () => ({
      homePosts: [...state.homePosts],
      profilePosts: [...state.profilePosts]
    })
     window.MEXARunHomeFeed = async function () {
if (!window.MEXAPostFeed) {
console.error("MEXA: Modul post feed belum dimuat.");
return;
}

// Ganti selector setelah kita memastikan ID
// elemen daftar postingan di index.html.
return window.MEXAPostFeed.loadHome("#homeFeed");
     });
})();
