
/* ==================================================
   MEXA — RUANG KREATOR
   Mengambil postingan dari tabel Supabase posts
   ================================================== */

(function (window, document) {
  "use strict";

  if (window.MEXA_CREATOR_BRIDGE_LOADED) return;
  window.MEXA_CREATOR_BRIDGE_LOADED = true;

  const container = document.getElementById("postingan");

  if (!container) {
    console.warn("MEXA: elemen #postingan tidak ditemukan.");
    return;
  }

  let activeUserId = null;
  let requestNumber = 0;

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

  function safeURL(value) {
    if (!value) return "";

    try {
      const url = new URL(String(value), window.location.href);

      if (!["https:", "http:"].includes(url.protocol)) return "";

      return url.href;
    } catch {
      return "";
    }
  }

  function showMessage(message, isError) {
    container.innerHTML = `
      <div class="creator-state">
        <div class="creator-state-icon">✦</div>
        <h3>Ruang Kreator</h3>
        <p>${escapeHTML(message)}</p>
      </div>
    `;

    if (isError) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "creator-retry";
      button.textContent = "Coba Lagi";

      button.addEventListener("click", function () {
        if (activeUserId) loadPosts(activeUserId);
      });

      container.appendChild(button);
    }
  }

  function isVideo(post) {
    const type = String(
      post.media_type || post.type || ""
    ).toLowerCase();

    const url = String(
      post.video_url || post.media_url || post.image_url || ""
    ).split("?")[0].toLowerCase();

    return type.includes("video") ||
      type.includes("reel") ||
      /\.(mp4|webm|mov|m4v|ogv)$/.test(url);
  }

  function getAuthorName(profile) {
    return profile?.display_name ||
      profile?.username ||
      "Kreator MEXA";
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

  function renderPosts(posts, profiles, likes, comments, shares) {
    if (!posts.length) {
      showMessage("Belum ada postingan di ruang kreator ini.");
      updatePostCount(0);
      return;
    }

    const profileMap = new Map(
      profiles.map(profile => [String(profile.id), profile])
    );

    const stats = new Map();

    posts.forEach(post => {
      stats.set(String(post.id), {
        likes: 0,
        comments: 0,
        shares: 0
      });
    });

    likes.forEach(row => {
      const item = stats.get(String(row.post_id));
      if (item) item.likes++;
    });

    comments.forEach(row => {
      const item = stats.get(String(row.post_id));
      if (item) item.comments++;
    });

    shares.forEach(row => {
      const item = stats.get(String(row.post_id));
      if (item) item.shares++;
    });

    container.replaceChildren();

    posts.forEach(function (post) {
      const profile = profileMap.get(String(post.user_id)) || {};
      const name = getAuthorName(profile);
      const avatar = safeURL(profile.avatar_url);
      const video = isVideo(post);
      const media = safeURL(
        video
          ? (post.video_url || post.media_url || post.image_url)
          : (post.image_url || post.media_url)
      );
      const count = stats.get(String(post.id)) || {
        likes: 0,
        comments: 0,
        shares: 0
      };

      const card = document.createElement("article");
      card.className = "creator-post";

      const header = document.createElement("header");
      header.className = "creator-post-header";

      const avatarBox = document.createElement("div");
      avatarBox.className = "creator-avatar";

      if (avatar) {
        const image = document.createElement("img");
        image.src = avatar;
        image.alt = "";
        image.loading = "lazy";
        image.onerror = () => image.remove();
        avatarBox.appendChild(image);
      } else {
        avatarBox.textContent =
          name.trim().charAt(0).toUpperCase() || "M";
      }

      const author = document.createElement("div");
      author.className = "creator-author";

      const strong = document.createElement("strong");
      strong.textContent = name;

      const badge = document.createElement("span");
      badge.className = "creator-badge";
      badge.textContent = video ? "▶ Video Kreator" : "✦ Foto Kreator";

      const time = document.createElement("time");
      time.textContent = formatDate(post.created_at);

      author.append(strong, badge, time);
      header.append(avatarBox, author);
      card.appendChild(header);

      if (post.content) {
        const caption = document.createElement("div");
        caption.className = "creator-caption";
        caption.textContent = post.content;
        card.appendChild(caption);
      }

      if (media) {
        const mediaBox = document.createElement("div");
        mediaBox.className = video
          ? "creator-media creator-video"
          : "creator-media creator-photo";

        const mediaElement = document.createElement(video ? "video" : "img");
        mediaElement.src = media;
        mediaElement.loading = "lazy";

        if (video) {
          mediaElement.controls = true;
          mediaElement.playsInline = true;
          mediaElement.preload = "metadata";
        } else {
          mediaElement.alt = "Foto postingan kreator";
        }

        mediaElement.onerror = function () {
          mediaBox.remove();
        };

        mediaBox.appendChild(mediaElement);
        card.appendChild(mediaBox);
      }

      const footer = document.createElement("footer");
      footer.className = "creator-post-footer";

      [
        `♡ ${count.likes} Suka`,
        `▢ ${count.comments} Komentar`,
        `↗ ${count.shares} Bagikan`
      ].forEach(function (label) {
        const span = document.createElement("span");
        span.textContent = label;
        footer.appendChild(span);
      });

      card.appendChild(footer);
      container.appendChild(card);
    });

    updatePostCount(posts.length);
  }

  function updatePostCount(count) {
    const element = document.getElementById("posts");
    if (element) element.textContent = String(count);
  }

  async function loadPosts(userId) {
    if (!userId) return;

    const sequence = ++requestNumber;
    activeUserId = String(userId);

    showMessage("Mengambil postingan dari Supabase...");

    try {
      const client = window.mexaSupabase;

      if (!client || !client.from) {
        throw new Error(
          "Klien Supabase belum tersedia pada halaman Profil."
        );
      }

      const response = await client
        .from("posts")
        .select("id,user_id,content,image_url,created_at")
        .eq("user_id", activeUserId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (sequence !== requestNumber) return;
      if (response.error) throw response.error;

      const posts = response.data || [];

      if (!posts.length) {
        renderPosts([], [], [], [], []);
        return;
      }

      const ids = posts.map(post => post.id);

      const results = await Promise.all([
        client.from("profiles")
          .select("id,username,display_name,avatar_url")
          .in("id", [...new Set(posts.map(post => String(post.user_id)))]),

        client.from("post_likes")
          .select("post_id")
          .in("post_id", ids)
          .limit(2000),

        client.from("post_comments")
          .select("post_id")
          .in("post_id", ids)
          .limit(2000),

        client.from("post_shares")
          .select("post_id")
          .in("post_id", ids)
          .limit(2000)
      ]);

      if (sequence !== requestNumber) return;

      // Postingan tetap ditampilkan meskipun tabel interaksi
      // belum bisa dibaca oleh kebijakan akses database.
      const profiles = results[0].error ? [] : (results[0].data || []);
      const likes = results[1].error ? [] : (results[1].data || []);
      const comments = results[2].error ? [] : (results[2].data || []);
      const shares = results[3].error ? [] : (results[3].data || []);

      renderPosts(posts, profiles, likes, comments, shares);

    } catch (error) {
      if (sequence !== requestNumber) return;

      console.error("MEXA Ruang Kreator gagal:", error);
      showMessage(
        "Postingan gagal dimuat: " +
        (error?.message || "Kesalahan tidak diketahui."),
        true
      );
    }
  }

  document.addEventListener("mexa:profile-ready", function (event) {
    const userId = event.detail?.userId;
    if (userId) loadPosts(userId);
  });

  // Mendukung halaman yang profilnya selesai dimuat lebih dahulu.
  if (window.MEXA_PROFILE_TARGET_ID) {
    loadPosts(window.MEXA_PROFILE_TARGET_ID);
  }

  console.log("MEXA Ruang Kreator siap.");
})(window, document);
