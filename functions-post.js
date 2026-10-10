
/* =====================================================
   MEXA PLATFORM — FUNCTIONS POST
   Supabase + Premium Post Renderer
   ===================================================== */

(function () {
  "use strict";

  if (window.MEXA_FUNCTIONS_POST_LOADED) return;
  window.MEXA_FUNCTIONS_POST_LOADED = true;

  function getFeed() {
    return document.getElementById("mexaFeedList");
  }

  function showStatus(message, isError) {
    const status = document.getElementById("mexaFeedStatus");
    if (!status) return;

    status.textContent = message;
    status.style.color = isError ? "#ff667a" : "";
  }

  function getClient() {
    if (!window.mexaSupabase) {
      throw new Error("Koneksi Supabase belum tersedia.");
    }

    return window.mexaSupabase;
  }

  async function getSessionUser() {
    const { data, error } = await getClient().auth.getSession();

    if (error) throw error;

    const user = data?.session?.user;
    if (!user) throw new Error("Silakan login kembali.");

    return user;
  }

  function makeProfileLink(userId, profile) {
    const link = document.createElement("a");

    link.className = "mx-post-author";
    link.href = "./Profil.html?id=" + encodeURIComponent(userId || "");
    link.textContent =
      profile.display_name ||
      profile.username ||
      "Pengguna MEXA";

    return link;
  }

  function renderPost(post, profile) {
    const card = document.createElement("article");

    card.className = "mx-post-card";
    card.id = "post-" + post.id;
    card.dataset.postId = String(post.id);
    card.dataset.userId = post.user_id || "";

    // HEADER
    const header = document.createElement("div");
    header.className = "mx-post-header";

    const profileLink = document.createElement("a");
    profileLink.className = "mx-post-profile-link";
    profileLink.href =
      "./Profil.html?id=" + encodeURIComponent(post.user_id || "");
    profileLink.setAttribute("aria-label", "Buka profil penulis");

    const avatar = document.createElement("img");
    avatar.className = "mx-post-avatar";
    avatar.alt = "Foto profil";
    avatar.loading = "lazy";

    if (profile.avatar_url) {
      avatar.src = profile.avatar_url;
    } else {
      avatar.hidden = true;
    }

    avatar.onerror = function () {
      avatar.hidden = true;
    };

    profileLink.appendChild(avatar);

    const author = makeProfileLink(post.user_id, profile);

    const authorGroup = document.createElement("div");
    authorGroup.className = "mx-post-author-group";

    authorGroup.appendChild(author);

    if (profile.username) {
      const username = document.createElement("div");
      username.className = "mx-post-username";
      username.textContent = "@" + profile.username;
      authorGroup.appendChild(username);
    }

    const menu = document.createElement("button");
    menu.type = "button";
    menu.className = "mx-post-menu";
    menu.textContent = "⋮";
    menu.setAttribute("aria-label", "Menu postingan");

    // Tidak menghapus atau mengubah postingan.
    // Menu akan dihubungkan ke sistem menu MEXA berikutnya.
    menu.addEventListener("click", function () {
      if (typeof window.openPostMenu === "function") {
        window.openPostMenu(post.id);
      } else {
        alert("Menu postingan akan disambungkan berikutnya.");
      }
    });

    header.append(profileLink, authorGroup, menu);
    card.appendChild(header);

    // ISI POSTINGAN
    const content = document.createElement("div");
    content.className = "mx-post-content";
    content.textContent = post.content || "";
    card.appendChild(content);

    // FOTO POSTINGAN
    if (post.image_url) {
      const image = document.createElement("img");

      image.className = "mx-post-image";
      image.src = post.image_url;
      image.alt = "Foto postingan";
      image.loading = "lazy";

      image.onerror = function () {
        image.remove();
      };

      card.appendChild(image);
    }

    // WAKTU POSTINGAN
    if (post.created_at) {
      const date = document.createElement("time");

      date.className = "mx-post-date";
      date.dateTime = post.created_at;

      date.textContent = new Date(post.created_at)
        .toLocaleString("id-ID", {
          dateStyle: "medium",
          timeStyle: "short"
        });

      card.appendChild(date);
    }

    // AKSI POSTINGAN — TAMPILAN DULU
    const actions = document.createElement("div");
    actions.className = "mx-post-actions";

    [
      ["♡ Suka", "like"],
      ["💬 Komentar", "comment"],
      ["↗ Bagikan", "share"]
    ].forEach(function (item) {
      const button = document.createElement("button");

      button.type = "button";
      button.dataset.action = item[1];
      button.textContent = item[0];

      actions.appendChild(button);
    });

    card.appendChild(actions);

    return card;
  }

  async function loadPosts() {
    const feed = getFeed();

    if (!feed) {
      console.error("MEXA: elemen #mexaFeedList tidak ditemukan.");
      return [];
    }

    showStatus("Memuat postingan MEXA...", false);

    try {
      const client = getClient();

      const { data: posts, error } = await client
        .from("posts")
        .select("id,user_id,content,image_url,created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const userIds = [
        ...new Set((posts || [])
          .map(function (post) {
            return post.user_id;
          })
          .filter(Boolean))
      ];

      let profiles = [];

      if (userIds.length) {
        const result = await client
          .from("profiles")
          .select("id,username,display_name,avatar_url")
          .in("id", userIds);

        if (result.error) {
          console.warn("MEXA: profil belum termuat:", result.error);
        } else {
          profiles = result.data || [];
        }
      }

      const profileMap = new Map(
        profiles.map(function (profile) {
          return [profile.id, profile];
        })
      );

      const fragment = document.createDocumentFragment();

      (posts || []).forEach(function (post) {
        const profile = profileMap.get(post.user_id) || {};
        fragment.appendChild(renderPost(post, profile));
      });

      // Feed baru dipasang setelah data berhasil diambil.
      feed.replaceChildren(fragment);

      showStatus(
        posts && posts.length ? "" : "Belum ada postingan.",
        false
      );

      window.MEXA_POSTS = posts || [];

      console.log("MEXA: postingan berhasil dimuat:", (posts || []).length);

      return posts || [];
    } catch (error) {
      console.error("MEXA memuat postingan:", error);

      // Jangan menghapus isi feed jika permintaan gagal.
      showStatus("Gagal memuat postingan: " + error.message, true);

      return [];
    }
  }

  async function createPost(content) {
    const cleanContent = String(content || "").trim();

    if (!cleanContent) {
      throw new Error("Tulis sesuatu sebelum memposting.");
    }

    const client = getClient();
    const user = await getSessionUser();

    const { data, error } = await client
      .from("posts")
      .insert({
        user_id: user.id,
        content: cleanContent
      })
      .select("id,user_id,content,image_url,created_at")
      .single();

    if (error) throw error;

    await loadPosts();

    return data;
  }

  window.MEXAPosts = {
    load: loadPosts,
    create: createPost
  };

  window.MEXA_LOAD_FEED = loadPosts;
  window.loadPosts = loadPosts;

  function start() {
    loadPosts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  console.log("MEXA PLATFORM: fungsi posting siap.");
})();
