/* =====================================================
   MEXA FUNCTIONS POST
   Tugas: Feed, profil penulis, dan kartu postingan
   ===================================================== */

(function (window, document) {
  "use strict";

  if (window.MEXA_FUNCTIONS_POST_LOADED) {
    console.warn("MEXA FUNCTIONS POST sudah aktif.");
    return;
  }

  window.MEXA_FUNCTIONS_POST_LOADED = true;

  function getClient() {
    const client = window.mexaSupabase;

    if (!client || typeof client.from !== "function") {
      throw new Error("Koneksi Supabase belum tersedia.");
    }

    return client;
  }

  function getFeed() {
    return document.getElementById("mexaFeedList");
  }

  function showStatus(message, isError) {
    const status = document.getElementById("mexaFeedStatus");

    if (!status) return;

    status.textContent = message || "";
    status.style.color = isError ? "#ff667a" : "";
  }

  async function getSessionUser() {
    const client = getClient();
    const result = await client.auth.getSession();

    if (result.error) throw result.error;

    const user = result.data.session &&
      result.data.session.user;

    if (!user) {
      throw new Error("Silakan login kembali.");
    }

    return user;
  }

  function makeProfileLink(userId, profile) {
    const link = document.createElement("a");

    link.className = "mx-post-author";
    link.href = "./Profil.html?id=" +
      encodeURIComponent(userId || "");

    link.textContent =
      profile.display_name ||
      profile.username ||
      "Pengguna MEXA";

    link.setAttribute("aria-label", "Buka profil penulis");

    return link;
  }

  /* =====================================================
     RENDER SATU KARTU POSTINGAN
     ===================================================== */

  function renderPost(post, profile) {
    profile = profile || {};

    const card = document.createElement("article");

    card.className = "mx-post-card";
    card.id = "post-" + post.id;
    card.dataset.postId = String(post.id);
    card.dataset.userId = String(post.user_id || "");

    // HEADER
    const header = document.createElement("div");
    header.className = "mx-post-header";

    // TAUTAN FOTO PROFIL
    const profileLink = document.createElement("a");

    profileLink.className = "mx-post-profile-link";
    profileLink.href = "./Profil.html?id=" +
      encodeURIComponent(post.user_id || "");
    profileLink.setAttribute(
      "aria-label",
      "Buka profil penulis"
    );

    // FOTO PROFIL
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

    // NAMA DAN USERNAME
    const authorGroup = document.createElement("div");

    authorGroup.className = "mx-post-author-group";

    const author = makeProfileLink(post.user_id, profile);

    authorGroup.appendChild(author);

    if (profile.username) {
      const username = document.createElement("div");

      username.className = "mx-post-username";
      username.textContent = "@" + profile.username;

      authorGroup.appendChild(username);
    }

    // TOMBOL TITIK TIGA
    const menu = document.createElement("button");

    menu.type = "button";
    menu.className = "mx-post-menu";
    menu.textContent = "⋮";
    menu.setAttribute("aria-label", "Menu postingan");

    menu.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      const controller = window.MEXA_POST_SYSTEM;

      if (
        controller &&
        typeof controller.openMenu === "function"
      ) {
        controller.openMenu(post.id);
      } else {
        console.error(
          "MEXA: mexa-post-system-control.js belum aktif."
        );

        alert("Kontrol menu postingan belum aktif.");
      }
    });

    // PENTING: MASUKKAN HEADER LENGKAP
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

    // TANGGAL POSTINGAN
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

    // TOMBOL INTERAKSI
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

  /* =====================================================
     MEMUAT FEED SUPABASE
     ===================================================== */

  async function loadPosts() {
    const feed = getFeed();

    if (!feed) {
      console.error(
        "MEXA: elemen #mexaFeedList tidak ditemukan."
      );

      return [];
    }

    showStatus("Memuat postingan MEXA...", false);

    try {
      const client = getClient();

      const response = await client
        .from("posts")
        .select("id,user_id,content,image_url,created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (response.error) throw response.error;

      const posts = response.data || [];

      // KUMPULKAN ID PEMILIK POSTINGAN
      const userIds = Array.from(
        new Set(
          posts
            .map(function (post) {
              return post.user_id;
            })
            .filter(Boolean)
        )
      );

      // AMBIL PROFIL
      let profiles = [];

      if (userIds.length > 0) {
        const profileResponse = await client
          .from("profiles")
          .select("id,username,display_name,avatar_url")
          .in("id", userIds);

        if (profileResponse.error) {
          console.warn(
            "MEXA: data profil belum dapat dimuat.",
            profileResponse.error
          );
        } else {
          profiles = profileResponse.data || [];
        }
      }

      // PETAKAN PROFIL BERDASARKAN ID
      const profileMap = new Map();

      profiles.forEach(function (profile) {
        profileMap.set(String(profile.id), profile);
      });

      // SIAPKAN FEED BARU
      const fragment = document.createDocumentFragment();

      posts.forEach(function (post) {
        const profile = profileMap.get(
          String(post.user_id)
        ) || {};

        fragment.appendChild(
          renderPost(post, profile)
        );
      });

      // GANTI ISI FEED HANYA SESUDAH DATA BERHASIL DIAMBIL
      feed.replaceChildren(fragment);

      window.MEXA_POSTS = posts;

      showStatus(
        posts.length ? "" : "Belum ada postingan.",
        false
      );

      console.log(
        "MEXA: feed berhasil dimuat. Jumlah:",
        posts.length
      );

      return posts;
    } catch (error) {
      console.error("MEXA gagal memuat feed:", error);

      // Tidak menghapus kartu yang masih tampil ketika request gagal.
      showStatus(
        "Gagal memuat postingan: " + error.message,
        true
      );

      return [];
    }
  }

  /* =====================================================
     MEMBUAT POSTINGAN
     ===================================================== */

  async function createPost(content) {
    const cleanContent = String(content || "").trim();

    if (!cleanContent) {
      throw new Error("Tulis sesuatu sebelum memposting.");
    }

    const client = getClient();
    const user = await getSessionUser();

    const response = await client
      .from("posts")
      .insert({
        user_id: user.id,
        content: cleanContent
      })
      .select("id,user_id,content,image_url,created_at")
      .single();

    if (response.error) throw response.error;

    await loadPosts();

    return response.data;
  }

  /* =====================================================
     API UNTUK MODUL LAIN
     ===================================================== */

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
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }

  console.log("MEXA FUNCTIONS POST aktif.");

})(window, document);
