
/* =====================================================
   MEXA FUNCTIONS POST — PREMIUM V3
   Feed, profil, like, komentar, bagikan
   ===================================================== */

(function (window, document) {
  "use strict";

  const VERSION = "3.0.0";

  if (
    window.MEXA_FUNCTIONS_POST_VERSION === VERSION
  ) {
    console.warn("MEXA FUNCTIONS POST sudah aktif.");
    return;
  }

  window.MEXA_FUNCTIONS_POST_VERSION = VERSION;

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
    status.style.color = isError ? "#ff7085" : "";
  }

  async function getSessionUser() {
    const result = await getClient().auth.getUser();

    if (result.error) throw result.error;

    if (!result.data.user) {
      throw new Error("Silakan login kembali.");
    }

    return result.data.user;
  }

  async function optionalRows(query, label) {
    try {
      const result = await query;

      if (result.error) {
        console.warn("MEXA: " + label + " belum terbaca.", result.error);
        return [];
      }

      return result.data || [];
    } catch (error) {
      console.warn("MEXA: " + label + " belum terbaca.", error);
      return [];
    }
  }

  function setStats(postId, stats) {
    if (!window.MEXA_POST_STATS) {
      window.MEXA_POST_STATS = {};
    }

    window.MEXA_POST_STATS[String(postId)] = stats;
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

  function makeComment(comment, profileMap) {
    const item = document.createElement("div");
    item.className = "mx-comment-item";

    const profile = profileMap.get(String(comment.user_id)) || {};

    const avatar = document.createElement("img");
    avatar.className = "mx-comment-avatar";
    avatar.alt = "";
    avatar.loading = "lazy";

    if (profile.avatar_url) {
      avatar.src = profile.avatar_url;
    } else {
      avatar.hidden = true;
    }

    avatar.onerror = function () {
      avatar.hidden = true;
    };

    const bubble = document.createElement("div");
    bubble.className = "mx-comment-content";

    const name = document.createElement("a");
    name.className = "mx-comment-name";
    name.href = "./Profil.html?id=" +
      encodeURIComponent(comment.user_id || "");

    name.textContent =
      profile.display_name ||
      profile.username ||
      "Pengguna MEXA";

    const text = document.createElement("div");
    text.className = "mx-comment-text";
    text.textContent = comment.content || "";

    bubble.append(name, text);
    item.append(avatar, bubble);

    return item;
  }

  /* =====================================================
     MERENDER KARTU POSTINGAN
     ===================================================== */

  function renderPost(post, profile, stats, comments, profileMap) {
    profile = profile || {};
    stats = stats || {
      likes: 0,
      comments: 0,
      shares: 0,
      likedByMe: false
    };

    const card = document.createElement("article");

    card.className = "mx-post-card";
    card.id = "post-" + post.id;
    card.dataset.postId = String(post.id);
    card.dataset.userId = String(post.user_id || "");

    // HEADER PROFIL
    const header = document.createElement("div");
    header.className = "mx-post-header";

    const profileLink = document.createElement("a");
    profileLink.className = "mx-post-profile-link";
    profileLink.href = "./Profil.html?id=" +
      encodeURIComponent(post.user_id || "");
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

    const authorGroup = document.createElement("div");
    authorGroup.className = "mx-post-author-group";

    authorGroup.appendChild(makeProfileLink(post.user_id, profile));

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

    menu.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      const controller = window.MEXA_POST_SYSTEM;

      if (controller && typeof controller.openMenu === "function") {
        controller.openMenu(post.id);
      } else {
        console.error("MEXA POST SYSTEM CONTROL belum aktif.");
        alert("Menu postingan belum siap. Periksa urutan script.");
      }
    });

    header.append(profileLink, authorGroup, menu);
    card.appendChild(header);

    // ISI POSTINGAN
    const content = document.createElement("div");
    content.className = "mx-post-content";
    content.textContent = post.content || "";
    card.appendChild(content);

    // GAMBAR POSTINGAN
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

    // WAKTU
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

    // AKSI SUKA, KOMENTAR, BAGIKAN
    const actions = document.createElement("div");
    actions.className = "mx-post-actions";

    const likeButton = document.createElement("button");
    likeButton.type = "button";
    likeButton.dataset.action = "like";
    likeButton.setAttribute("aria-pressed", String(stats.likedByMe));
    likeButton.classList.toggle("is-liked", stats.likedByMe);

    function updateLikeButton() {
      likeButton.textContent =
        (stats.likedByMe ? "♥" : "♡") +
        " Suka" +
        (stats.likes ? " · " + stats.likes : "");

      likeButton.setAttribute(
        "aria-pressed",
        String(stats.likedByMe)
      );

      likeButton.classList.toggle(
        "is-liked",
        stats.likedByMe
      );
    }

    updateLikeButton();

    const commentButton = document.createElement("button");
    commentButton.type = "button";
    commentButton.dataset.action = "comment";
    commentButton.textContent =
      "💬 Komentar" +
      (stats.comments ? " · " + stats.comments : "");

    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.dataset.action = "share";
    shareButton.textContent =
      "↗ Bagikan" +
      (stats.shares ? " · " + stats.shares : "");

    actions.append(likeButton, commentButton, shareButton);
    card.appendChild(actions);

    // KOMENTAR DI BAWAH POSTINGAN
    const commentBox = document.createElement("section");
    commentBox.className = "mx-comment-box";

    const commentHeading = document.createElement("div");
    commentHeading.className = "mx-comment-heading";
    commentHeading.textContent = "Komentar";

    const commentList = document.createElement("div");
    commentList.className = "mx-comments-list";

    const postComments = comments || [];

    if (!postComments.length) {
      const empty = document.createElement("div");
      empty.className = "mx-comment-empty";
      empty.textContent = "Belum ada komentar. Jadilah yang pertama.";
      commentList.appendChild(empty);
    } else {
      postComments.forEach(function (comment, index) {
        const item = makeComment(comment, profileMap);

        if (index >= 3) {
          item.hidden = true;
          item.dataset.extraComment = "true";
        }

        commentList.appendChild(item);
      });

      if (postComments.length > 3) {
        const more = document.createElement("button");
        more.type = "button";
        more.className = "mx-comments-more";
        more.textContent =
          "Lihat " + (postComments.length - 3) + " komentar lainnya";

        more.addEventListener("click", function () {
          const hidden = commentList.querySelectorAll(
            '[data-extra-comment="true"]'
          );

          const willShow = Array.from(hidden).some(function (item) {
            return item.hidden;
          });

          hidden.forEach(function (item) {
            item.hidden = !willShow;
          });

          more.textContent = willShow
            ? "Sembunyikan komentar lainnya"
            : "Lihat " + (postComments.length - 3) +
              " komentar lainnya";
        });

        commentList.appendChild(more);
      }
    }

    const commentForm = document.createElement("form");
    commentForm.className = "mx-comment-input";

    const commentInput = document.createElement("input");
    commentInput.type = "text";
    commentInput.name = "comment";
    commentInput.maxLength = 2000;
    commentInput.autocomplete = "off";
    commentInput.placeholder = "Tulis komentar...";
    commentInput.setAttribute("aria-label", "Tulis komentar");
    commentInput.required = true;

    const sendComment = document.createElement("button");
    sendComment.type = "submit";
    sendComment.textContent = "Kirim";

    commentForm.append(commentInput, sendComment);

    commentBox.append(
      commentHeading,
      commentList,
      commentForm
    );

    card.appendChild(commentBox);

    // KLIK LIKE
    likeButton.addEventListener("click", async function () {
      if (likeButton.disabled) return;

      likeButton.disabled = true;

      try {
        const client = getClient();
        const user = await getSessionUser();

        const existingResult = await client
          .from("post_likes")
          .select("id")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .limit(1);

        if (existingResult.error) {
          throw existingResult.error;
        }

        const existing = existingResult.data || [];

        if (existing.length) {
          const removal = await client
            .from("post_likes")
            .delete()
            .eq("post_id", post.id)
            .eq("user_id", user.id)
            .select("id");

          if (removal.error) throw removal.error;
          if (!removal.data || !removal.data.length) {
            throw new Error("Batal suka ditolak oleh database.");
          }

          stats.likes = Math.max(
            0,
            stats.likes - removal.data.length
          );

          stats.likedByMe = false;
        } else {
          const insertion = await client
            .from("post_likes")
            .insert({
              post_id: post.id,
              user_id: user.id
            })
            .select("id")
            .single();

          if (insertion.error) throw insertion.error;

          stats.likes += 1;
          stats.likedByMe = true;
        }

        setStats(post.id, stats);
        updateLikeButton();

      } catch (error) {
        console.error("MEXA gagal memproses suka:", error);
        alert("Suka belum berhasil. Periksa login dan izin Supabase.");
      } finally {
        likeButton.disabled = false;
      }
    });

    // BUKA KOMENTAR
    commentButton.addEventListener("click", function () {
      commentInput.focus();

      commentBox.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    });

    // KIRIM KOMENTAR
    commentForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const text = commentInput.value.trim();
      if (!text || sendComment.disabled) return;

      sendComment.disabled = true;
      sendComment.textContent = "Mengirim...";

      try {
        const client = getClient();
        const user = await getSessionUser();

        const result = await client
          .from("post_comments")
          .insert({
            post_id: post.id,
            user_id: user.id,
            content: text
          })
          .select("id")
          .single();

        if (result.error) throw result.error;

        commentInput.value = "";
        await loadPosts();

      } catch (error) {
        console.error("MEXA gagal mengirim komentar:", error);
        alert("Komentar belum berhasil dikirim. Periksa izin Supabase.");
      } finally {
        sendComment.disabled = false;
        sendComment.textContent = "Kirim";
      }
    });

    // BAGIKAN DARI TOMBOL AKSI
    shareButton.addEventListener("click", async function () {
      if (shareButton.disabled) return;

      shareButton.disabled = true;

      try {
        const url = new URL(window.location.href);
        url.hash = "post-" + post.id;

        let completed = false;

        if (typeof navigator.share === "function") {
          try {
            await navigator.share({
              title: "Postingan MEXA",
              text: post.content || "Lihat postingan ini di MEXA",
              url: url.href
            });

            completed = true;
          } catch (error) {
            if (error.name === "AbortError") return;
            throw error;
          }
        } else if (
          navigator.clipboard &&
          window.isSecureContext
        ) {
          await navigator.clipboard.writeText(url.href);
          completed = true;
          showStatus("Tautan postingan berhasil disalin.", false);
        } else {
          const copied = window.prompt(
            "Salin tautan postingan:",
            url.href
          );

          completed = copied !== null;
        }

        if (completed) {
          await recordShare(post.id);

          stats.shares += 1;
          setStats(post.id, stats);

          shareButton.textContent =
            "↗ Bagikan" +
            (stats.shares ? " · " + stats.shares : "");
        }

      } catch (error) {
        console.error("MEXA gagal membagikan postingan:", error);
        alert("Postingan belum berhasil dibagikan.");
      } finally {
        shareButton.disabled = false;
      }
    });

    return card;
  }

  /* =====================================================
     CATAT BAGIKAN
     ===================================================== */

  async function recordShare(postId) {
    const client = getClient();
    const userResult = await client.auth.getUser();

    if (userResult.error) throw userResult.error;

    const user = userResult.data.user;

    // Pengunjung yang tidak login tetap dapat menyalin tautan,
    // tetapi tidak membuat catatan share dengan user_id kosong.
    if (!user) return false;

    const result = await client
      .from("post_shares")
      .insert({
        post_id: postId,
        user_id: user.id
      });

    if (result.error) {
      console.warn("MEXA: catatan bagikan gagal disimpan.", result.error);
      return false;
    }

    return true;
  }

  /* =====================================================
     MEMUAT FEED DAN STATISTIK
     ===================================================== */

  async function loadPosts() {
    const feed = getFeed();

    if (!feed) {
      console.error("MEXA: #mexaFeedList tidak ditemukan.");
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

      if (!posts.length) {
        feed.replaceChildren();
        window.MEXA_POSTS = [];
        window.MEXA_POST_STATS = {};
        showStatus("Belum ada postingan.", false);
        return [];
      }

      const postIds = posts.map(function (post) {
        return post.id;
      });

      // Masing-masing kueri interaksi bersifat opsional.
      // Jika izin tabel belum lengkap, feed tidak ikut gagal.
      const [likes, comments, shares] = await Promise.all([
        optionalRows(
          client.from("post_likes")
            .select("id,post_id,user_id")
            .in("post_id", postIds)
            .limit(2000),
          "suka"
        ),

        optionalRows(
          client.from("post_comments")
            .select("id,post_id,user_id,content,created_at")
            .in("post_id", postIds)
            .order("created_at", { ascending: false })
            .limit(500),
          "komentar"
        ),

        optionalRows(
          client.from("post_shares")
            .select("id,post_id,user_id")
            .in("post_id", postIds)
            .limit(2000),
          "bagikan"
        )
      ]);

      let currentUser = null;

      try {
        const userResult = await client.auth.getUser();

        if (!userResult.error) {
          currentUser = userResult.data.user || null;
        }
      } catch (error) {
        console.warn("MEXA: status login belum terbaca.", error);
      }

      const statsMap = new Map();

      posts.forEach(function (post) {
        statsMap.set(String(post.id), {
          likes: 0,
          comments: 0,
          shares: 0,
          likedByMe: false
        });
      });

      likes.forEach(function (like) {
        const stats = statsMap.get(String(like.post_id));
        if (!stats) return;

        stats.likes += 1;

        if (
          currentUser &&
          String(like.user_id) === String(currentUser.id)
        ) {
          stats.likedByMe = true;
        }
      });

      comments.forEach(function (comment) {
        const stats = statsMap.get(String(comment.post_id));
        if (stats) stats.comments += 1;
      });

      shares.forEach(function (share) {
        const stats = statsMap.get(String(share.post_id));
        if (stats) stats.shares += 1;
      });

      // Ambil profil penulis dan pemberi komentar.
      const profileIds = Array.from(new Set(
        posts
          .map(function (post) {
            return post.user_id;
          })
          .concat(
            comments.map(function (comment) {
              return comment.user_id;
            })
          )
          .filter(Boolean)
          .map(String)
      ));

      let profiles = [];

      if (profileIds.length) {
        profiles = await optionalRows(
          client.from("profiles")
            .select("id,username,display_name,avatar_url")
            .in("id", profileIds),
          "profil"
        );
      }

      const profileMap = new Map();

      profiles.forEach(function (profile) {
        profileMap.set(String(profile.id), profile);
      });

      // Kelompokkan komentar berdasarkan ID postingan.
      const commentsMap = new Map();

      comments.forEach(function (comment) {
        const id = String(comment.post_id);

        if (!commentsMap.has(id)) {
          commentsMap.set(id, []);
        }

        commentsMap.get(id).push(comment);
      });

      const fragment = document.createDocumentFragment();
      const statsObject = {};

      posts.forEach(function (post) {
        const id = String(post.id);

        const profile =
          profileMap.get(String(post.user_id)) || {};

        const stats = statsMap.get(id) || {
          likes: 0,
          comments: 0,
          shares: 0,
          likedByMe: false
        };

        statsObject[id] = stats;

        fragment.appendChild(
          renderPost(
            post,
            profile,
            stats,
            commentsMap.get(id) || [],
            profileMap
          )
        );
      });

      // Feed hanya diganti setelah kartu berhasil disiapkan.
      feed.replaceChildren(fragment);

      window.MEXA_POSTS = posts;
      window.MEXA_POST_STATS = statsObject;

      showStatus("", false);

      console.log(
        "MEXA: feed berhasil dimuat.",
        posts.length,
        "postingan."
      );

      return posts;

    } catch (error) {
      console.error("MEXA gagal memuat feed:", error);

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

    const result = await client
      .from("posts")
      .insert({
        user_id: user.id,
        content: cleanContent
      })
      .select("id,user_id,content,image_url,created_at")
      .single();

    if (result.error) throw result.error;

    await loadPosts();

    return result.data;
  }

  /* =====================================================
     API GLOBAL UNTUK MODUL MEXA
     ===================================================== */

  window.MEXAPosts = {
    load: loadPosts,
    create: createPost,
    recordShare: recordShare
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

  console.log(
    "MEXA FUNCTIONS POST " + VERSION + " aktif."
  );

})(window, document);
