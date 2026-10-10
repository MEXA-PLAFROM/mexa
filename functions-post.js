
/* =====================================================
   MEXA PLATFORM — FUNCTIONS POST
   Penyimpanan dan pemuatan postingan melalui Supabase utama
   ===================================================== */

(function () {
  "use strict";

  if (window.MEXA_FUNCTIONS_POST_LOADED) return;
  window.MEXA_FUNCTIONS_POST_LOADED = true;

  const feed = document.getElementById("mexaFeedList");
  const status = document.getElementById("mexaFeedStatus");

  function showStatus(message, isError) {
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

  async function loadPosts() {
    if (!feed) return [];

    try {
      const client = getClient();

      const { data: posts, error } = await client
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
        const result = await client
          .from("profiles")
          .select("id,username,display_name,avatar_url")
          .in("id", userIds);

        if (result.error) {
          console.warn("MEXA: profil penulis belum termuat:", result.error);
        } else {
          profiles = result.data || [];
        }
      }

      const profileMap = new Map(
        profiles.map(profile => [profile.id, profile])
      );

      const fragment = document.createDocumentFragment();

      (posts || []).forEach(post => {
        const profile = profileMap.get(post.user_id) || {};
        const card = document.createElement("article");

        card.className = "mx-post-card";
        card.id = "post-" + post.id;
        card.dataset.postId = String(post.id);

     // =============================
// HEADER POST PREMIUM
// =============================

const header = document.createElement("div");
header.className = "mx-post-header";


const avatar = document.createElement("img");
avatar.className = "mx-post-avatar";
avatar.src =
  profile.avatar_url ||
  "./assets/default-avatar.png";
avatar.alt = "Foto profil";

// =============================
// HEADER POST PREMIUM
// =============================

const header = document.createElement("div");
header.className = "mx-post-header";


const avatar = document.createElement("img");
avatar.className = "mx-post-avatar";
avatar.src =
  profile.avatar_url ||
  "./assets/default-avatar.png";
avatar.alt = "Foto profil";


const author = document.createElement("a");
author.className = "mx-post-author";
author.href =
  "./Profil.html?id=" + post.user_id;


author.textContent =
  profile.display_name ||
  profile.username ||
  "Pengguna MEXA";



const menu = document.createElement("button");
menu.className = "mx-post-menu";
menu.textContent = "⋮";



header.append(
  avatar,
  author,
  menu
);



// =============================
// ISI POST
// =============================

const content = document.createElement("div");

content.className =
  "mx-post-content";

content.textContent =
  post.content || "";



card.append(
  header,
  content
);
         
        if (post.image_url) {
          const image = document.createElement("img");
          image.className = "mx-post-image";
          image.src = post.image_url;
          image.alt = "Foto postingan";
          image.loading = "lazy";
          image.onerror = () => image.remove();
          card.appendChild(image);
        }

        if (post.created_at) {
          const date = document.createElement("time");
          date.className = "mx-post-date";
          date.dateTime = post.created_at;
          date.textContent = new Date(post.created_at)
            .toLocaleString("id-ID");
          card.appendChild(date);
        }

         // =============================
// AKSI POST
// =============================

const actions =
document.createElement("div");

actions.className =
"mx-post-actions";


actions.innerHTML = `

<button>♡ Suka</button>

<button>💬 Komentar</button>

<button>↗ Bagikan</button>

`;


card.appendChild(actions);
         
        // Data ini juga dipakai untuk pemeriksaan pemilik postingan.
        card.dataset.userId = post.user_id || "";

        fragment.appendChild(card);
      });

      feed.replaceChildren(fragment);
      showStatus(
        posts?.length ? "" : "Belum ada postingan.",
        false
      );

      window.MEXA_POSTS = posts || [];
      return posts || [];
    } catch (error) {
      console.error("MEXA memuat postingan:", error);
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadPosts, { once: true });
  } else {
    loadPosts();
  }

  console.log("MEXA PLATFORM: fungsi posting siap.");
})();
