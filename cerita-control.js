/* =====================================================
   MEXA STORY CONTROL — PREMIUM V1.1
   Data Supabase • Masa aktif • Messenger bridge
   ===================================================== */

(function (window, document) {
  "use strict";

  if (window.MEXA_STORY_CONTROL) {
    console.warn("MEXA STORY CONTROL sudah aktif.");
    return;
  }

  const VERSION = "1.1.0";
  const LIFETIME = 24 * 60 * 60 * 1000;
  const CACHE_MS = 15000;

  let stories = [];
  let loadingPromise = null;
  let lastLoaded = 0;

  function getClient() {
    const client = window.mexaSupabase;

    if (
      !client ||
      typeof client.from !== "function" ||
      !client.auth
    ) {
      throw new Error("Koneksi Supabase belum tersedia.");
    }

    return client;
  }

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(
      "mexa:story-" + name,
      { detail: detail || {} }
    ));
  }

  function getCreatedTime(item) {
    const value = item.created_at || item.createdAt;
    const time = new Date(value).getTime();

    return Number.isFinite(time) ? time : 0;
  }

  function isActive(item) {
    if (!item) return false;

    const created = getCreatedTime(item);
    const now = Date.now();

    return created > 0 &&
      created <= now &&
      now - created < LIFETIME;
  }

  function normalize(post, profile) {
    const createdAt = getCreatedTime(post);

    return {
      id: String(post.id),
      userId: String(post.user_id || ""),
      content: post.content || "",
      imageUrl: post.image_url || "",
      createdAt: createdAt,
      expiresAt: createdAt + LIFETIME,
      displayName:
        profile?.display_name ||
        profile?.username ||
        "Pengguna MEXA",
      username: profile?.username || "",
      avatarUrl: profile?.avatar_url || ""
    };
  }

  async function fetchStories() {
    const client = getClient();
    const now = Date.now();

    const response = await client
      .from("posts")
      .select("id,user_id,content,image_url,created_at")
      .gte(
        "created_at",
        new Date(now - LIFETIME).toISOString()
      )
      .lte("created_at", new Date(now).toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    if (response.error) throw response.error;

    const posts = (response.data || []).filter(isActive);
    const userIds = [...new Set(
      posts.map(post => post.user_id).filter(Boolean)
    )];

    const profileMap = Object.create(null);

    if (userIds.length) {
      const profiles = await client
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .in("id", userIds);

      if (profiles.error) {
        console.warn(
          "[MEXA STORY] Profil tidak tersedia:",
          profiles.error.message
        );
      } else {
        (profiles.data || []).forEach(profile => {
          profileMap[String(profile.id)] = profile;
        });
      }
    }

    stories = posts
      .map(post => normalize(
        post,
        profileMap[String(post.user_id)]
      ))
      .filter(isActive);

    lastLoaded = Date.now();

    emit("updated", {
      stories: getAll(),
      count: stories.length
    });

    return getAll();
  }

  function load(options) {
    options = options || {};

    if (loadingPromise) return loadingPromise;

    if (!options.force && lastLoaded &&
        Date.now() - lastLoaded < CACHE_MS) {
      stories = stories.filter(isActive);
      return Promise.resolve(getAll());
    }

    loadingPromise = fetchStories()
      .catch(error => {
        emit("error", { message: error.message });
        throw error;
      })
      .finally(() => {
        loadingPromise = null;
      });

    return loadingPromise;
  }

  function getAll() {
    stories = stories.filter(isActive);
    return stories.slice();
  }

  function getById(id) {
    return getAll().find(
      story => story.id === String(id)
    ) || null;
  }

  function getRemainingTime(story) {
    if (!story) return 0;
    return Math.max(0, story.expiresAt - Date.now());
  }

  function formatRemainingTime(story) {
    const remaining = getRemainingTime(story);

    if (remaining <= 0) return "Kedaluwarsa";

    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);

    return hours > 0
      ? hours + " jam lagi"
      : Math.max(1, minutes) + " menit lagi";
  }

  function invalidate() {
    lastLoaded = 0;
  }

  async function onPostCreated() {
    invalidate();
    return load({ force: true });
  }

  async function reply(storyId, message) {
    const story = getById(storyId);
    const text = String(message || "").trim();

    if (!story) throw new Error("Cerita sudah tidak tersedia.");
    if (!text) throw new Error("Tulis pesan terlebih dahulu.");
    if (text.length > 2000) {
      throw new Error("Pesan maksimal 2.000 karakter.");
    }

    const client = getClient();
    const auth = await client.auth.getUser();

    if (auth.error) throw auth.error;

    const user = auth.data.user;

    if (!user) {
      throw new Error("Silakan login untuk membalas Cerita.");
    }

    if (String(user.id) === story.userId) {
      throw new Error("Kamu tidak dapat membalas Cerita sendiri.");
    }

    const messenger = window.MEXA_MESSENGER;

    if (!messenger ||
        typeof messenger.sendMessage !== "function") {
      throw new Error(
        "Messenger belum terhubung. Pesan belum dikirim."
      );
    }

    // Messenger harus menyimpan pesan ke backend dan
    // menolak Promise jika pengiriman gagal.
    return messenger.sendMessage({
      recipientId: story.userId,
      text: text,
      storyId: story.id,
      storyReply: true
    });
  }

  window.MEXA_STORY_CONTROL = {
    version: VERSION,
    lifetimeMs: LIFETIME,
    load: load,
    getAll: getAll,
    getById: getById,
    isActive: isActive,
    getRemainingTime: getRemainingTime,
    formatRemainingTime: formatRemainingTime,
    invalidate: invalidate,
    onPostCreated: onPostCreated,
    reply: reply
  };

  console.log("MEXA STORY CONTROL " + VERSION + " aktif.");

})(window, document);
