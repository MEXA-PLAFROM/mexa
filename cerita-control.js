
(function (window, document) {
  "use strict";

  /* =====================================================
     MEXA CERITA CONTROL — V3.0.0
     Data: Supabase posts + profiles
     Masa aktif: 24 jam per postingan
     Tidak menghapus postingan asli.
  ===================================================== */

  const VERSION = "3.0.0";
  const LIFETIME = 24 * 60 * 60 * 1000;
  const CACHE_MS = 15000;
  const MAX_POSTS = 500;

  if (
    window.MEXA_STORY_CONTROL &&
    window.MEXA_STORY_CONTROL.version === VERSION
  ) {
    console.warn("MEXA STORY CONTROL V3 sudah aktif.");
    return;
  }

  let cache = [];
  let cacheTime = 0;
  let loadingPromise = null;

  function getClient() {
    const client =
      window.mexaSupabase ||
      window.MEXA_SUPABASE;

    if (
      !client ||
      typeof client.from !== "function"
    ) {
      throw new Error(
        "Koneksi Supabase belum tersedia. Periksa auth-client.js."
      );
    }

    return client;
  }

  function jsonTime(value) {
    if (typeof value === "number") {
      if (!Number.isFinite(value) || value <= 0) return 0;

      return value < 1000000000000
        ? value * 1000
        : value;
    }

    const time = new Date(value || 0).getTime();

    return Number.isFinite(time) ? time : 0;
  }

  function createdTime(story) {
    if (!story) return 0;

    return jsonTime(
      story.createdAt ??
      story.created_at ??
      story.created_at_ms
    );
  }

  function isActive(story) {
    const created = createdTime(story);
    const now = Date.now();

    return (
      created > 0 &&
      created <= now &&
      now - created < LIFETIME
    );
  }

  function normalize(post, profile) {
    const createdAt = createdTime(post);

    return {
      id: String(post.id),
      userId: String(post.user_id || ""),
      content: String(post.content || ""),
      imageUrl: String(post.image_url || ""),
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

  function groupByUser(items) {
    const grouped = new Map();

    items
      .filter(isActive)
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach(story => {
        if (!story.userId) return;

        if (!grouped.has(story.userId)) {
          grouped.set(story.userId, []);
        }

        grouped.get(story.userId).push(story);
      });

    return Array.from(grouped.entries())
      .map(([userId, stories]) => {
        stories.sort((a, b) => b.createdAt - a.createdAt);

        return {
          userId,
          displayName:
            stories[0]?.displayName || "Pengguna MEXA",
          username: stories[0]?.username || "",
          avatarUrl: stories[0]?.avatarUrl || "",
          cover: stories[0],
          stories,
          count: stories.length
        };
      })
      .filter(group => group.stories.length > 0);
  }

  function emitUpdate(groups) {
    try {
      document.dispatchEvent(
        new CustomEvent("mexa:story-updated", {
          detail: {
            stories: groups,
            version: VERSION
          }
        })
      );
    } catch (error) {
      console.warn(
        "[MEXA CERITA] Gagal memperbarui tampilan.",
        error
      );
    }
  }

  async function fetchStories() {
    const client = getClient();
    const now = Date.now();
    const cutoff = now - LIFETIME;

    /*
     * Cerita berasal dari postingan yang masih berumur
     * kurang dari 24 jam. Tidak ada operasi DELETE.
     */
    const { data: posts, error: postsError } = await client
      .from("posts")
      .select(
        "id,user_id,content,image_url,created_at"
      )
      .gte("created_at", new Date(cutoff).toISOString())
      .lte("created_at", new Date(now).toISOString())
      .order("created_at", { ascending: false })
      .limit(MAX_POSTS);

    if (postsError) {
      throw new Error(
        "Gagal mengambil postingan cerita: " +
        postsError.message
      );
    }

    const validPosts = (posts || []).filter(post => {
      return (
        post.id != null &&
        post.user_id != null &&
        isActive(post)
      );
    });

    if (!validPosts.length) {
      cache = [];
      cacheTime = Date.now();
      return [];
    }

    const userIds = [
      ...new Set(
        validPosts.map(post => String(post.user_id))
      )
    ];

    let profiles = [];
    const { data: profileData, error: profileError } =
      await client
        .from("profiles")
        .select(
          "id,username,display_name,avatar_url"
        )
        .in("id", userIds);

    if (profileError) {
      /*
       * Jika profil gagal diambil, cerita tetap dapat
       * ditampilkan dengan nama pengguna standar.
       */
      console.warn(
        "[MEXA CERITA] Data profil tidak tersedia:",
        profileError.message
      );
    } else {
      profiles = profileData || [];
    }

    const profileMap = new Map(
      profiles.map(profile => [
        String(profile.id),
        profile
      ])
    );

    const normalized = validPosts.map(post =>
      normalize(
        post,
        profileMap.get(String(post.user_id))
      )
    );

    cache = normalized;
    cacheTime = Date.now();

    return cache;
  }

  async function load(options = {}) {
    const force = options === true || options?.force === true;

    if (
      !force &&
      cacheTime &&
      Date.now() - cacheTime < CACHE_MS
    ) {
      return getAll();
    }

    if (loadingPromise) {
      const result = await loadingPromise;
      return groupByUser(result);
    }

    loadingPromise = fetchStories();

    try {
      await loadingPromise;
      return getAll();
    } finally {
      loadingPromise = null;
    }
  }

  function getAll() {
    const active = cache.filter(isActive);
    return groupByUser(active);
  }

  function getById(storyId) {
    return cache.find(
      story =>
        String(story.id) === String(storyId) &&
        isActive(story)
    ) || null;
  }

  function getRemainingTime(story) {
    const item =
      typeof story === "object"
        ? story
        : getById(story);

    if (!item) return 0;

    return Math.max(
      0,
      createdTime(item) + LIFETIME - Date.now()
    );
  }

  function formatRemainingTime(story) {
    const remaining = getRemainingTime(story);

    if (remaining <= 0) return "Kedaluwarsa";

    const totalMinutes = Math.ceil(remaining / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return hours + " jam " + minutes + " menit";
    }

    return minutes + " menit";
  }

  function invalidate() {
    cacheTime = 0;
  }

  /*
   * Dipanggil oleh sistem lain jika postingan baru dibuat.
   * Tidak mengubah atau menghapus postingan.
   */
  function onPostCreated() {
    invalidate();

    return load({ force: true }).then(groups => {
      emitUpdate(groups);
      return groups;
    });
  }

  async function reply(storyId, message) {
    const story = getById(storyId);

    if (!story || !isActive(story)) {
      throw new Error(
        "Cerita sudah tidak aktif atau tidak ditemukan."
      );
    }

    const text = String(message || "").trim();

    if (!text) {
      throw new Error("Pesan balasan masih kosong.");
    }

    const client = getClient();

    const { data: authData, error: authError } =
      await client.auth.getUser();

    if (authError || !authData?.user) {
      throw new Error(
        "Sesi login tidak ditemukan. Silakan login kembali."
      );
    }

    if (
      String(authData.user.id) === String(story.userId)
    ) {
      throw new Error(
        "Kamu tidak perlu mengirim balasan cerita kepada akun sendiri."
      );
    }

    const messenger = window.MEXA_MESSENGER;

    if (
      !messenger ||
      typeof messenger.sendMessage !== "function"
    ) {
      throw new Error(
        "Messenger MEXA belum terhubung. Pesan belum dikirim."
      );
    }

    /*
     * Menggunakan integrasi Messenger yang sudah tersedia.
     * Tidak membuat klaim berhasil sebelum fungsi selesai.
     */
    const result = await messenger.sendMessage({
      recipientId: story.userId,
      text,
      storyId: story.id,
      storyReply: true
    });

    if (result === false || result?.success === false) {
      throw new Error(
        result?.message || "Messenger gagal mengirim pesan."
      );
    }

    return result;
  }

  window.MEXA_STORY_CONTROL = {
    version: VERSION,
    lifetimeMs: LIFETIME,
    load,
    getAll,
    getById,
    isActive,
    getRemainingTime,
    formatRemainingTime,
    invalidate,
    onPostCreated,
    reply
  };

  console.info(
    "[MEXA CERITA] Control V" + VERSION + " siap."
  );
})(window, document);
