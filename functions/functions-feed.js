
/* =========================================================
   MEXA PLATFORM — HOME FEED
   Sumber data: Supabase MEXA SOSIAL
   ========================================================= */

(function () {
  "use strict";

  if (window.MEXA_FEED_LOADED) return;
  window.MEXA_FEED_LOADED = true;

  const FEED_ID = "mexaFeedList";
  const STATUS_ID = "mexaFeedStatus";

  function client() {
    if (!window.mexaSupabase) {
      throw new Error("Koneksi Supabase belum tersedia.");
    }
    return window.mexaSupabase;
  }

  function status(message, isError = false) {
    const el = document.getElementById(STATUS_ID);
    if (el) {
      el.textContent = message;
      el.style.color = isError ? "#ff667a" : "";
    }
  }

  function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function authorName(post) {
    return post.profiles?.display_name ||
      post.profiles?.username ||
      "Pengguna MEXA";
  }

  function renderPost(post) {
    const id = safe(post.id);
    const name = safe(authorName(post));
    const content = safe(post.content || "");
    const avatar = post.profiles?.avatar_url || "";
    const image = post.image_url || "";
    const date = post.created_at
      ? new Date(post.created_at).toLocaleString("id-ID", {
          dateStyle: "medium",
          timeStyle: "short"
        })
      : "Baru saja";

    const avatarHTML = avatar
      ? `<img class="mx-feed-avatar" src="${safe(avatar)}" alt="">`
      : `<span class="mx-feed-avatar-fallback">${safe(
          authorName(post).slice(0, 1).toUpperCase()
        )}</span>`;

    return `
      <article class="mx-feed-card" id="post-${id}"
               data-post-id="${id}" data-user-id="${safe(post.user_id)}">
        <header class="mx-post-head">
          <div class="mx-feed-author">
            ${avatarHTML}
            <div class="mx-feed-author-info">
              <strong>${name}</strong>
              <div class="mx-feed-meta">${safe(date)}</div>
            </div>
          </div>
          <button type="button" class="mx-post-menu"
                  data-post-id="${id}" aria-label="Menu postingan">⋯</button>
        </header>

        ${content ? `<div class="mx-feed-content">${content}</div>` : ""}
        ${image ? `<img class="mx-feed-media" src="${safe(image)}"
                          alt="Media postingan" loading="lazy">` : ""}

        <div class="mx-feed-counts">
          <span>Postingan MEXA</span>
        </div>
        <div class="mx-feed-actions">
          <button type="button" data-post-action="like"
                  data-post-id="${id}">♡ Suka</button>
          <button type="button" data-post-action="comment"
                  data-post-id="${id}">◌ Komentar</button>
          <button type="button" data-post-action="share"
                  data-post-id="${id}">↗ Bagikan</button>
        </div>
      </article>`;
  }

  async function loadFeed() {
    const feed = document.getElementById(FEED_ID);
    if (!feed) {
      console.error("MEXA: elemen #mexaFeedList tidak ditemukan.");
      return;
    }

    status("Memuat postingan...");

    try {
      const db = client();

      const { data: posts, error } = await db
        .from("posts")
        .select("id,user_id,content,image_url,created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const userIds = [...new Set(
        (posts || []).map(post => post.user_id).filter(Boolean)
      )];

      let profiles = [];

      if (userIds.length) {
        const result = await db
          .from("profiles")
          .select("id,username,display_name,avatar_url")
          .in("id", userIds);

        if (result.error) throw result.error;
        profiles = result.data || [];
      }

      const profileMap = new Map(
        profiles.map(profile => [profile.id, profile])
      );

      const enrichedPosts = (posts || []).map(post => ({
        ...post,
        profiles: profileMap.get(post.user_id) || {}
      }));

      window.MEXA_POSTS = enrichedPosts;
      feed.innerHTML = enrichedPosts.map(renderPost).join("");

      status(enrichedPosts.length ? "" : "Belum ada postingan.");

      document.dispatchEvent(new CustomEvent("mexa:feed-loaded", {
        detail: { posts: enrichedPosts }
      }));
    } catch (error) {
      console.error("MEXA Feed gagal dimuat:", error);
      status("Gagal memuat postingan: " + error.message, true);
    }
  }

  document.addEventListener("click", function (event) {
    const button = event.target.closest(".mx-post-menu");
    if (!button) return;

    const post = (window.MEXA_POSTS || []).find(
      item => String(item.id) === String(button.dataset.postId)
    );

    if (!post) {
      status("Data postingan tidak ditemukan.", true);
      return;
    }

    if (typeof window.openPostMenu === "function") {
      window.openPostMenu(post);
    } else {
      console.warn("MEXA: fungsi openPostMenu belum tersedia.");
    }
  });

  window.MEXA_LOAD_FEED = loadFeed;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadFeed, { once: true });
  } else {
    loadFeed();
  }

  console.log("MEXA: Home Feed siap.");
})();
