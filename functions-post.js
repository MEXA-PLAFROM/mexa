
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
    
menu.addEventListener("click", async function () {
  try {
    const client = getClient();

    // Periksa akun yang sedang login
    const { data, error } = await client.auth.getUser();

    if (error) throw error;

    const viewerId = data.user ? data.user.id : null;
    const ownerId = post.user_id || "";

    // Apakah postingan ini milik akun yang sedang login?
    const isOwner =
      Boolean(viewerId) &&
      String(viewerId) === String(ownerId);

    // Kirim identitas pemilik dan pengunjung ke sistem menu
    if (typeof window.openPostMenu === "function") {
      window.openPostMenu(post.id, {
        post: post,
        viewerId: viewerId,
        ownerId: ownerId,
        isOwner: isOwner
      });
    } else {
      console.error("MEXA: fungsi openPostMenu belum tersedia.");
      alert("Menu postingan belum aktif.");
    }
  } catch (error) {
    console.error("MEXA: gagal memeriksa pemilik postingan:", error);
    alert("Gagal memeriksa akun. Silakan coba lagi.");
  }
});
         

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

/* =========================================
   MEXA POST MENU
   Membedakan pemilik dan pengunjung
========================================= */

async function openPostMenu(postId) {
  try {
    const client = getClient();

    // Baca akun yang benar-benar sedang login.
    const userResult = await client.auth.getUser();

    const viewer = userResult.error
      ? null
      : userResult.data.user;

    // Ambil data postingan langsung dari Supabase.
    const result = await client
      .from("posts")
      .select("id,user_id,content,image_url")
      .eq("id", postId)
      .maybeSingle();

    if (result.error) throw result.error;

    const post = result.data;

    if (!post) {
      alert("Postingan tidak ditemukan atau tidak bisa diakses.");
      return;
    }

    // Jangan percaya ID pemilik yang dikirim dari tampilan.
    const viewerId = viewer ? String(viewer.id) : "";
    const ownerId = post.user_id ? String(post.user_id) : "";

    const isOwner = Boolean(
      viewerId && ownerId && viewerId === ownerId
    );

    // Tutup menu lama jika masih terbuka.
    const oldMenu = document.getElementById(
      "mexa-post-menu-overlay"
    );

    if (oldMenu) oldMenu.remove();

    const overlay = document.createElement("div");
    overlay.id = "mexa-post-menu-overlay";

    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "99999",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "18px",
      background: "rgba(5,3,15,.75)"
    });

    const panel = document.createElement("div");

    Object.assign(panel.style, {
      width: "100%",
      maxWidth: "360px",
      padding: "20px",
      borderRadius: "18px",
      background: "#171329",
      color: "#f6f3ff",
      border: "1px solid #393052",
      boxShadow: "0 20px 60px rgba(0,0,0,.4)",
      fontFamily: "inherit"
    });

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function closeMenu() {
      overlay.remove();
    }

    function makeButton(label, callback, danger) {
      const button = document.createElement("button");

      button.type = "button";
      button.textContent = label;

      Object.assign(button.style, {
        display: "block",
        width: "100%",
        padding: "13px 14px",
        marginTop: "8px",
        borderRadius: "11px",
        border: "1px solid " +
          (danger ? "#743649" : "#393052"),
        background: danger ? "#391b2b" : "#211b37",
        color: danger ? "#ffb5c5" : "#f6f3ff",
        textAlign: "left",
        fontSize: "14px",
        cursor: "pointer"
      });

      button.addEventListener("click", callback);
      panel.appendChild(button);

      return button;
    }

    function showMenu() {
      panel.replaceChildren();

      const title = document.createElement("h3");
      title.textContent = "Menu Postingan";

      Object.assign(title.style, {
        margin: "0 0 8px",
        fontSize: "18px"
      });

      panel.appendChild(title);

      const description = document.createElement("p");
      description.textContent = isOwner
        ? "Ini postingan milik akun kamu."
        : "Ini postingan milik pengguna lain.";

      Object.assign(description.style, {
        margin: "0 0 14px",
        color: "#b9b1d0",
        fontSize: "13px"
      });

      panel.appendChild(description);

      // Bagikan tersedia untuk pemilik maupun pengunjung.
      makeButton("↗  Bagikan postingan", async function () {
        const url = new URL(window.location.href);
        url.hash = "post-" + post.id;

        try {
          if (typeof navigator.share === "function") {
            await navigator.share({
              title: "Postingan MEXA",
              text: post.content || "Lihat postingan ini di MEXA",
              url: url.href
            });
          } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(url.href);
            alert("Tautan postingan berhasil disalin.");
          } else {
            window.prompt("Salin tautan postingan:", url.href);
          }
        } catch (error) {
          if (error.name !== "AbortError") {
            console.error("MEXA gagal membagikan postingan:", error);
            alert("Tautan belum berhasil dibagikan.");
          }
        }
      });

      if (isOwner) {
        // EDIT hanya ditampilkan kepada pemilik.
        makeButton("✎  Edit postingan", function () {
          showEditor();
        });

        // HAPUS hanya ditampilkan kepada pemilik.
        makeButton("⌫  Hapus postingan", async function () {
          const confirmed = window.confirm(
            "Hapus postingan ini secara permanen?"
          );

          if (!confirmed) return;

          try {
            const deleted = await client
              .from("posts")
              .delete()
              .eq("id", post.id)
              .eq("user_id", viewerId)
              .select("id")
              .maybeSingle();

            if (deleted.error) throw deleted.error;

            if (!deleted.data) {
              throw new Error(
                "Penghapusan ditolak. Periksa izin RLS Supabase."
              );
            }

            closeMenu();
            await loadPosts();
            alert("Postingan berhasil dihapus.");
          } catch (error) {
            console.error("MEXA gagal menghapus postingan:", error);
            alert(
              "Postingan belum terhapus. Periksa izin RLS Supabase."
            );
          }
        }, true);
      } else {
        // Pengunjung tidak mendapatkan tombol Edit atau Hapus.
        makeButton("⚑  Laporkan postingan", function () {
          alert(
            "Fitur laporan belum terhubung ke sistem moderasi MEXA."
          );
        });
      }

      makeButton("Tutup", closeMenu);
    }

    function showEditor() {
      panel.replaceChildren();

      const title = document.createElement("h3");
      title.textContent = "Edit postingan";

      Object.assign(title.style, {
        margin: "0 0 14px",
        fontSize: "18px"
      });

      const textarea = document.createElement("textarea");
      textarea.value = post.content || "";
      textarea.setAttribute("aria-label", "Isi postingan");

      Object.assign(textarea.style, {
        width: "100%",
        minHeight: "130px",
        boxSizing: "border-box",
        padding: "12px",
        borderRadius: "10px",
        border: "1px solid #393052",
        background: "#0e0b1b",
        color: "#f6f3ff",
        font: "inherit",
        resize: "vertical"
      });

      panel.append(title, textarea);

      makeButton("Simpan perubahan", async function () {
        const content = textarea.value.trim();

        if (!content) {
          alert("Isi postingan tidak boleh kosong.");
          return;
        }

        try {
          const saved = await client
            .from("posts")
            .update({ content: content })
            .eq("id", post.id)
            .eq("user_id", viewerId)
            .select("id")
            .maybeSingle();

          if (saved.error) throw saved.error;

          if (!saved.data) {
            throw new Error(
              "Perubahan ditolak. Periksa izin RLS Supabase."
            );
          }

          closeMenu();
          await loadPosts();
          alert("Postingan berhasil diperbarui.");
        } catch (error) {
          console.error("MEXA gagal mengedit postingan:", error);
          alert(
            "Postingan belum berhasil diedit. Periksa izin RLS Supabase."
          );
        }
      });

      makeButton("Batal", showMenu);
    }

    showMenu();
  } catch (error) {
    console.error("MEXA gagal membuka menu postingan:", error);
    alert("Menu gagal dibuka. Periksa koneksi dan sesi login.");
  }
}

// Hubungkan fungsi menu dengan tombol titik tiga.
window.openPostMenu = openPostMenu;
       
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
