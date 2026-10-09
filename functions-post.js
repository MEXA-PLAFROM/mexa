/* =====================================================
   MEXA — FUNCTIONS POST
   File: functions-post.js
   Fungsi: membuat, menyimpan, dan memuat postingan.
   ===================================================== */

(function () {
  "use strict";

  const API_URL =
    "https://mzcobvfvmhpleonncyrr.supabase.co/functions/v1/mexa-api";

  const app = document.getElementById("mexa-app");
  const feed = document.getElementById("mexaFeedList");
  const status = document.getElementById("mexaFeedStatus");

  if (!app || !feed) {
    console.warn("MEXA Post: elemen Home/feed tidak ditemukan.");
    return;
  }

  function showStatus(message, isError) {
    if (!status) return;
    status.textContent = message;
    status.style.color = isError ? "#ff667a" : "";
  }

  async function callAPI(action, body) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: action,
        ...(body || {})
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false || result.error) {
      throw new Error(
        result.error || result.message || "Permintaan postingan gagal."
      );
    }

    return result;
  }

  function getPosts(result) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.posts)) return result.posts;
    if (Array.isArray(result.data)) return result.data;
    return [];
  }

  function makePostCard(post) {
    const card = document.createElement("article");
    card.className = "mx-post-card";
    card.dataset.postId = String(post.id || "");

    const author = document.createElement("div");
    author.className = "mx-post-author";
    author.textContent =
      post.display_name ||
      post.username ||
      post.profiles?.display_name ||
      post.profiles?.username ||
      "Pengguna MEXA";

    const content = document.createElement("div");
    content.className = "mx-post-content";
    content.textContent = post.content || "";

    const date = document.createElement("time");
    date.className = "mx-post-date";

    if (post.created_at) {
      const parsedDate = new Date(post.created_at);
      if (!Number.isNaN(parsedDate.getTime())) {
        date.dateTime = parsedDate.toISOString();
        date.textContent = parsedDate.toLocaleString("id-ID");
      }
    }

    card.append(author, content, date);

    if (post.image_url) {
      const image = document.createElement("img");
      image.className = "mx-post-image";
      image.src = post.image_url;
      image.alt = "Foto postingan";
      image.loading = "lazy";
      image.onerror = function () {
        image.remove();
      };
      card.insertBefore(image, date);
    }

    return card;
  }

  async function loadPosts() {
    showStatus("Memuat postingan...", false);

    try {
      // Sesuaikan nama action ini jika API memakai nama berbeda.
      const result = await callAPI("get_posts");
      const posts = getPosts(result);
      const fragment = document.createDocumentFragment();

      posts.forEach(function (post) {
        fragment.appendChild(makePostCard(post));
      });

      feed.replaceChildren(fragment);
      showStatus(
        posts.length ? "" : "Belum ada postingan.",
        false
      );

      return posts;
    } catch (error) {
      console.error("MEXA load posts:", error);
      showStatus("Gagal memuat postingan: " + error.message, true);
      return [];
    }
  }

  async function createPost(content) {
    const cleanContent = String(content || "").trim();

    if (!cleanContent) {
      showStatus("Tulis sesuatu sebelum memposting.", true);
      return false;
    }

    showStatus("Menyimpan postingan...", false);

    try {
      // Sesuaikan nama action ini jika API memakai nama berbeda.
      await callAPI("create_post", {
        content: cleanContent
      });

      showStatus("Postingan berhasil disimpan.", false);
      await loadPosts();
      return true;
    } catch (error) {
      console.error("MEXA create post:", error);
      showStatus("Gagal membuat postingan: " + error.message, true);
      return false;
    }
  }

  // API publik untuk dihubungkan ke form Home.
  window.MEXAPosts = {
    load: loadPosts,
    create: createPost
  };

  // Memuat feed saat file dijalankan.
  loadPosts();
})();
