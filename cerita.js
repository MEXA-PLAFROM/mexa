
(function (window, document) {
  "use strict";

  /* =====================================================
     MEXA CERITA UI — V3
     Hanya mengatur tampilan dan interaksi Cerita.
     Tidak mengubah sistem postingan, profil, atau login.
  ===================================================== */

  const VERSION = "3.0.0";
  const LIFETIME = 24 * 60 * 60 * 1000;
  const STORY_DURATION = 7000;

  if (
    window.MEXA_STORY_UI &&
    window.MEXA_STORY_UI.version === VERSION
  ) {
    console.warn("MEXA CERITA UI V3 sudah aktif.");
    return;
  }

  const EMOJIS = [
    "😀","😃","😄","😁","😆","😅","😂","🤣",
    "🥹","😊","😇","🙂","🙃","😉","😍","🥰",
    "😘","😗","😙","😚","😋","😛","😜","🤪",
    "😎","🤩","🥳","😏","😌","🤗","🤭","🫢",
    "🤔","🫡","🤫","🤐","😶","😐","😑","😬",
    "🙄","😮","😯","😲","😳","🥺","😢","😭",
    "😤","😠","😡","🤯","😱","😴","😎","🤕",
    "🤧","🥵","🥶","🤠","👻","💀","🤖","👍",
    "👎","👌","✌️","🤞","🤟","👏","🙌","🫶",
    "🙏","💪","🤝","👋","💐","❤️","🧡","💛",
    "💚","💙","💜","🖤","🤍","💖","💗","💓",
    "💞","💕","💔","❤️‍🔥","💯","🔥","✨","⭐",
    "🌟","💫","🎉","🎊","🎁","🌹","🌷","🌻",
    "🌈","☀️","🌙","⚡","☕","🍰","🍕","🍔",
    "🍜","🍉","🍓","🍒","⚽","🏀","🎮","🎧",
    "🎵","🎶","🚀","🏆"
  ];

  let groups = [];
  let viewerStories = [];
  let currentIndex = 0;
  let timer = null;
  let startedAt = 0;
  let remaining = STORY_DURATION;
  let isPaused = false;
  let busy = false;
  let refreshInterval = null;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  function control() {
    return window.MEXA_STORY_CONTROL || null;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);

    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;

    return node;
  }

  function safeUrl(value) {
    if (!value || typeof value !== "string") return "";

    try {
      const url = new URL(value, window.location.href);

      if (
        url.protocol !== "https:" &&
        url.protocol !== "http:"
      ) {
        return "";
      }

      return url.href;
    } catch (_) {
      return "";
    }
  }

  function isVideo(url) {
    return /\.(mp4|webm|ogg|mov|m4v)(?:$|[?#])/i.test(
      url || ""
    );
  }

  /*
   * Mencegah URL avatar yang tersimpan keliru di image_url
   * dipakai sebagai sampul cerita.
   */
  function isProfileImageUrl(value) {
    const url = safeUrl(value);
    if (!url) return false;

    try {
      const parsed = new URL(url);
      const path = parsed.pathname.toLowerCase();

      return (
        path.includes("/profile-media/") ||
        path.includes("/avatar-") ||
        path.includes("/avatars/")
      );
    } catch (_) {
      return false;
    }
  }

  function storyMedia(story) {
    const url = safeUrl(story?.imageUrl);

    if (!url || isProfileImageUrl(url)) {
      return "";
    }

    return url;
  }

  function storyTime(story) {
    const raw =
      story?.createdAt ??
      story?.created_at ??
      story?.created_at_ms ??
      0;

    if (typeof raw === "number") {
      // Mendukung timestamp detik maupun milidetik.
      return raw > 0 && raw < 1000000000000
        ? raw * 1000
        : raw;
    }

    const parsed = new Date(raw).getTime();

    return Number.isFinite(parsed) ? parsed : 0;
  }

  function isStoryActive(story) {
    const created = storyTime(story);
    const now = Date.now();

    return (
      created > 0 &&
      created <= now &&
      now - created < LIFETIME
    );
  }

  function fallbackAvatar() {
    return (
      "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">' +
        '<rect width="80" height="80" rx="40" fill="#30254c"/>' +
        '<circle cx="40" cy="29" r="15" fill="#b7a5df"/>' +
        '<path d="M12 78c2-20 13-30 28-30s26 10 28 30" fill="#b7a5df"/>' +
        "</svg>"
      )
    );
  }

  function avatarUrl(story) {
    return safeUrl(story?.avatarUrl) || fallbackAvatar();
  }

  function getText(story) {
    return String(story?.content || "").trim();
  }

  function getName(story) {
    return (
      story?.displayName ||
      story?.username ||
      "Pengguna MEXA"
    );
  }

  function formatAge(story) {
    const created = storyTime(story);

    if (!created) return "Waktu tidak tersedia";

    const minutes = Math.max(
      0,
      Math.floor((Date.now() - created) / 60000)
    );

    if (minutes < 1) return "Baru saja";
    if (minutes < 60) return minutes + " menit lalu";

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return hours + " jam lalu";

    return "Kedaluwarsa";
  }

  function ensureTray() {
    let tray = document.getElementById("mexa-stories");

    if (tray) return tray;

    tray = el("section");
    tray.id = "mexa-stories";
    tray.setAttribute("aria-label", "Cerita MEXA");

    const composer = document.getElementById("mexa-composer");
    const feed = document.getElementById("mexaFeedList");

    if (composer?.parentNode) {
      composer.insertAdjacentElement("afterend", tray);
    } else if (feed?.parentNode) {
      feed.insertAdjacentElement("beforebegin", tray);
    } else {
      document.body.appendChild(tray);
    }

    return tray;
  }

  function makeCoverMedia(container, story) {
    const media = storyMedia(story);
    const text = getText(story);

    if (media && isVideo(media)) {
      const video = el("video");

      video.src = media;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.setAttribute("aria-label", "Sampul video cerita");

      container.appendChild(video);
      container.appendChild(
        el("span", "mx-story-play", "▶")
      );

      return;
    }

    if (media) {
      const img = el("img");

      img.src = media;
      img.alt = "Sampul cerita";
      img.loading = "lazy";

      img.onerror = () => {
        img.remove();
        container.appendChild(
          el(
            "span",
            "mx-story-cover-text",
            text || "Cerita MEXA"
          )
        );
      };

      container.appendChild(img);
      return;
    }

    // Status teks atau image_url yang ternyata URL avatar.
    container.appendChild(
      el(
        "span",
        "mx-story-cover-text",
        text || "Cerita MEXA"
      )
    );
  }

  function renderTray() {
    const tray = ensureTray();
    tray.replaceChildren();

    const heading = el("div", "mx-story-heading");
    const headingText = el("div");

    headingText.append(
      el("h3", "mx-story-title", "Cerita MEXA"),
      el(
        "div",
        "mx-story-subtitle",
        "Cerita terbaru · Aktif 24 jam"
      )
    );

    const refresh = el("button", "mx-story-refresh", "↻");

    refresh.type = "button";
    refresh.title = "Muat ulang cerita";
    refresh.setAttribute("aria-label", "Muat ulang cerita");
    refresh.addEventListener("click", () => loadStories(true));

    heading.append(headingText, refresh);
    tray.appendChild(heading);

    const list = el("div", "mx-story-list");

    // Hanya kelompok dengan cerita yang masih aktif.
    groups = groups
      .map(group => {
        const stories = (group.stories || [])
          .filter(isStoryActive)
          .sort((a, b) => storyTime(b) - storyTime(a));

        return {
          ...group,
          stories,
          count: stories.length,
          cover: stories[0] || null
        };
      })
      .filter(group => group.count > 0);

    if (!groups.length) {
      list.appendChild(
        el(
          "div",
          "mx-story-empty",
          "Belum ada cerita aktif. Buat postingan baru untuk memulai."
        )
      );
    }

    groups.forEach(group => {
      const coverStory = group.cover;

      if (!coverStory) return;

      const button = el("button", "mx-story-item");
      button.type = "button";

      button.setAttribute(
        "aria-label",
        "Lihat cerita " + getName(coverStory)
      );

      const cover = el("span", "mx-story-cover");
      const inner = el("span", "mx-story-cover-inner");

      // Sampul berasal dari postingan terbaru pengguna.
      makeCoverMedia(inner, coverStory);

      // Avatar profil hanya muncul sebagai badge kecil.
      const avatar = el("img", "mx-story-owner-avatar");

      avatar.src = avatarUrl(coverStory);
      avatar.alt = "Foto profil " + getName(coverStory);
      avatar.onerror = () => {
        avatar.onerror = null;
        avatar.src = fallbackAvatar();
      };

      cover.append(inner, avatar);

      const name = el(
        "span",
        "mx-story-owner-name",
        getName(coverStory)
      );

      const count = el(
        "span",
        "mx-story-count",
        group.count + (group.count === 1 ? " cerita" : " cerita")
      );

      button.append(cover, name, count);

      button.addEventListener("click", () => {
        openGroup(group.userId);
      });

      list.appendChild(button);
    });

    tray.appendChild(list);
  }

  function ensureViewer() {
    let viewer = document.getElementById("mexa-story-viewer");

    if (
      viewer &&
      viewer.dataset.mexaStoryVersion === VERSION
    ) {
      return viewer;
    }

    // Hapus viewer dari versi lama supaya elemen tidak tercampur.
    if (viewer) viewer.remove();

    viewer = el("div");
    viewer.id = "mexa-story-viewer";
    viewer.dataset.mexaStoryVersion = VERSION;
    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-modal", "true");
    viewer.setAttribute("aria-label", "Penampil Cerita MEXA");

    const screen = el("div", "mx-story-screen");
    const progress = el("div", "mx-story-progress");
    const header = el("div", "mx-story-viewer-header");

    const avatar = el("img", "mx-story-viewer-avatar");
    const details = el("div");
    const name = el("div", "mx-story-viewer-name");
    const time = el("div", "mx-story-viewer-time");
    const spacer = el("div", "mx-story-viewer-spacer");

    const pause = el("button", "mx-story-icon-button", "Ⅱ");

    pause.type = "button";
    pause.title = "Jeda atau lanjutkan cerita";
    pause.setAttribute("aria-label", "Jeda atau lanjutkan");
    pause.addEventListener("click", togglePause);

    const close = el("button", "mx-story-icon-button", "×");

    close.type = "button";
    close.title = "Tutup cerita";
    close.setAttribute("aria-label", "Tutup cerita");
    close.addEventListener("click", closeViewer);

    details.append(name, time);
    header.append(avatar, details, spacer, pause, close);

    const stage = el("div", "mx-story-stage");
    const nav = el("div", "mx-story-nav");
    const prev = el("button");
    const next = el("button");

    prev.type = next.type = "button";
    prev.setAttribute("aria-label", "Cerita sebelumnya");
    next.setAttribute("aria-label", "Cerita berikutnya");
    prev.addEventListener("click", previousStory);
    next.addEventListener("click", nextStory);

    nav.append(prev, next);
    stage.appendChild(nav);

    const feedback = el("div", "mx-story-feedback");
    const reply = el("form", "mx-story-reply");
    const emojiPanel = el("div", "mx-story-emoji-panel");

    emojiPanel.setAttribute("aria-label", "Pilih emoji");

    EMOJIS.forEach(emoji => {
      const button = el("button", "mx-story-emoji", emoji);

      button.type = "button";
      button.addEventListener("click", () => insertEmoji(emoji));
      emojiPanel.appendChild(button);
    });

    const input = el("input", "mx-story-message-input");

    input.type = "text";
    input.maxLength = 2000;
    input.placeholder = "Balas cerita...";
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Balas cerita");

    const emojiButton = el("button", "mx-story-emoji-button", "☺");

    emojiButton.type = "button";
    emojiButton.title = "Pilih emoji";
    emojiButton.setAttribute("aria-label", "Pilih emoji");

    emojiButton.addEventListener("click", () => {
      emojiPanel.classList.toggle("mx-story-emoji-open");
      input.focus();
    });

    const send = el("button", "mx-story-send-button", "➤");

    send.type = "submit";
    send.title = "Kirim balasan";
    send.setAttribute("aria-label", "Kirim balasan");

    reply.append(input, emojiButton, send);
    reply.addEventListener("submit", sendReply);

    screen.append(
      progress,
      header,
      stage,
      feedback,
      emojiPanel,
      reply
    );

    viewer.appendChild(screen);
    document.body.appendChild(viewer);

    viewer.addEventListener("click", event => {
      if (event.target === viewer) closeViewer();
    });

    return viewer;
  }

  function viewerElement(selector) {
    return $(selector, ensureViewer());
  }

  function stopTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function startTimer() {
    stopTimer();

    if (isPaused || !viewerStories[currentIndex]) return;

    const progress = viewerElement(".mx-story-progress");
    const fills = progress.querySelectorAll(
      ".mx-story-progress-fill"
    );

    fills.forEach((fill, index) => {
      fill.style.transition = "none";
      fill.style.width = index < currentIndex ? "100%" : "0%";
    });

    const currentFill = fills[currentIndex];

    if (currentFill) {
      void currentFill.offsetWidth;
      currentFill.style.transition =
        "width " + remaining + "ms linear";
      currentFill.style.width = "100%";
    }

    startedAt = Date.now();

    timer = window.setTimeout(() => {
      remaining = STORY_DURATION;
      nextStory();
    }, remaining);
  }

  function renderCurrentStory() {
    viewerStories = viewerStories.filter(isStoryActive);

    if (!viewerStories.length || currentIndex >= viewerStories.length) {
      closeViewer();
      return;
    }

    if (currentIndex < 0) currentIndex = 0;

    const story = viewerStories[currentIndex];
    const viewer = ensureViewer();
    const progress = viewerElement(".mx-story-progress");
    const stage = viewerElement(".mx-story-stage");
    const avatar = viewerElement(".mx-story-viewer-avatar");
    const name = viewerElement(".mx-story-viewer-name");
    const time = viewerElement(".mx-story-viewer-time");
    const input = viewerElement(".mx-story-message-input");
    const emojiPanel = viewerElement(".mx-story-emoji-panel");
    const feedback = viewerElement(".mx-story-feedback");
    const pauseButton = viewer.querySelector(
      ".mx-story-viewer-header button"
    );

    stopTimer();

    stage.querySelectorAll(
      "img, video, .mx-story-stage-text"
    ).forEach(node => node.remove());

    progress.replaceChildren();

    viewerStories.forEach((item, index) => {
      const segment = el("div", "mx-story-progress-segment");
      const fill = el("div", "mx-story-progress-fill");

      if (index < currentIndex) {
        fill.style.width = "100%";
      }

      segment.appendChild(fill);
      progress.appendChild(segment);
    });

    avatar.src = avatarUrl(story);
    avatar.onerror = () => {
      avatar.onerror = null;
      avatar.src = fallbackAvatar();
    };

    name.textContent = getName(story);
    time.textContent = formatAge(story);

    const media = storyMedia(story);

    if (media && isVideo(media)) {
      const video = el("video");

      video.src = media;
      video.autoplay = true;
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";

      video.addEventListener("ended", nextStory);
      video.addEventListener("play", () => {
        stopTimer();
      });

      video.addEventListener("pause", () => {
        if (
          !isPaused &&
          viewer.classList.contains("mx-story-open") &&
          !video.ended
        ) {
          remaining = STORY_DURATION;
          startTimer();
        }
      });

      stage.insertBefore(video, stage.firstChild);
      remaining = STORY_DURATION;

      video.play().catch(() => {
        // Jika autoplay ditolak browser, kontrol video tetap tersedia.
      });
    } else if (media) {
      const img = el("img");

      img.src = media;
      img.alt = "Cerita dari " + getName(story);

      img.onerror = () => {
        img.remove();

        stage.insertBefore(
          el(
            "div",
            "mx-story-stage-text",
            getText(story) || "Media cerita tidak dapat ditampilkan."
          ),
          stage.firstChild
        );
      };

      stage.insertBefore(img, stage.firstChild);
      remaining = STORY_DURATION;
      startTimer();
    } else {
      stage.insertBefore(
        el(
          "div",
          "mx-story-stage-text",
          getText(story) || "Cerita MEXA"
        ),
        stage.firstChild
      );

      remaining = STORY_DURATION;
      startTimer();
    }

    input.value = "";
    emojiPanel.classList.remove("mx-story-emoji-open");
    feedback.classList.remove("mx-story-feedback-show");
    feedback.textContent = "";

    if (pauseButton) {
      pauseButton.textContent = isPaused ? "▶" : "Ⅱ";
    }
  }

  function openGroup(userId) {
    const group = groups.find(
      item => String(item.userId) === String(userId)
    );

    if (!group) return;

    viewerStories = (group.stories || [])
      .filter(isStoryActive)
      .sort((a, b) => storyTime(a) - storyTime(b));

    if (!viewerStories.length) {
      loadStories(true);
      return;
    }

    currentIndex = 0;
    isPaused = false;
    remaining = STORY_DURATION;

    ensureViewer().classList.add("mx-story-open");
    document.body.style.overflow = "hidden";

    renderCurrentStory();
  }

  function closeViewer() {
    stopTimer();

    const viewer = document.getElementById("mexa-story-viewer");

    if (viewer) {
      viewer.classList.remove("mx-story-open");

      viewer.querySelectorAll("video").forEach(video => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      });
    }

    document.body.style.overflow = "";
    viewerStories = [];
    currentIndex = 0;
    isPaused = false;
    remaining = STORY_DURATION;
  }

  function nextStory() {
    if (currentIndex + 1 < viewerStories.length) {
      currentIndex++;
      remaining = STORY_DURATION;
      renderCurrentStory();
    } else {
      closeViewer();
    }
  }

  function previousStory() {
    if (currentIndex > 0) {
      currentIndex--;
    }

    remaining = STORY_DURATION;
    renderCurrentStory();
  }

  function togglePause() {
    const viewer = ensureViewer();
    const video = viewer.querySelector(".mx-story-stage video");

    if (isPaused) {
      isPaused = false;

      if (video) {
        video.play().catch(() => {});
      } else {
        startTimer();
      }
    } else {
      isPaused = true;

      if (timer !== null) {
        remaining = Math.max(
          500,
          remaining - (Date.now() - startedAt)
        );
      }

      stopTimer();

      if (video) video.pause();
    }

    const button = viewer.querySelector(
      ".mx-story-viewer-header button"
    );

    if (button) {
      button.textContent = isPaused ? "▶" : "Ⅱ";
    }
  }

  function insertEmoji(emoji) {
    const input = viewerElement(".mx-story-message-input");
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;

    input.value =
      input.value.slice(0, start) +
      emoji +
      input.value.slice(end);

    const position = start + emoji.length;

    input.focus();
    input.setSelectionRange(position, position);
  }

  async function sendReply(event) {
    event.preventDefault();

    if (busy) return;

    const story = viewerStories[currentIndex];
    const input = viewerElement(".mx-story-message-input");
    const feedback = viewerElement(".mx-story-feedback");
    const message = input.value.trim();

    if (!story || !message) return;

    const api = control();

    if (!api || typeof api.reply !== "function") {
      feedback.textContent =
        "Fitur balasan belum terhubung ke sistem Cerita.";
      feedback.classList.add("mx-story-feedback-show");
      return;
    }

    busy = true;
    feedback.textContent = "Mengirim pesan...";
    feedback.classList.add("mx-story-feedback-show");

    try {
      await api.reply(story.id, message);

      input.value = "";
      feedback.textContent = "Pesan berhasil dikirim.";
    } catch (error) {
      feedback.textContent =
        error?.message || "Pesan gagal dikirim.";
    } finally {
      busy = false;
    }
  }

  async function loadStories(force = false) {
    const api = control();

    if (!api || typeof api.load !== "function") {
      console.error(
        "[MEXA CERITA] MEXA_STORY_CONTROL belum tersedia."
      );
      return;
    }

    try {
      const result = await api.load({ force });

      groups = Array.isArray(result) ? result : [];
      renderTray();

      // Jika penampil sedang terbuka, perbarui status yang tersisa.
      if (viewerStories.length) {
        const activeIds = new Set(
          groups.flatMap(group =>
            (group.stories || [])
              .filter(isStoryActive)
              .map(story => String(story.id))
          )
        );

        viewerStories = viewerStories.filter(story =>
          activeIds.has(String(story.id)) &&
          isStoryActive(story)
        );

        if (!viewerStories.length) {
          closeViewer();
        } else if (currentIndex >= viewerStories.length) {
          currentIndex = viewerStories.length - 1;
          renderCurrentStory();
        }
      }
    } catch (error) {
      console.error("[MEXA CERITA]", error);

      const tray = ensureTray();
      tray.replaceChildren(
        el(
          "div",
          "mx-story-empty",
          "Cerita belum dapat dimuat. Periksa koneksi dan izin Supabase."
        )
      );
    }
  }

  document.addEventListener("keydown", event => {
    const viewer = document.getElementById("mexa-story-viewer");

    if (!viewer?.classList.contains("mx-story-open")) return;

    if (event.key === "Escape") closeViewer();
    if (event.key === "ArrowRight") nextStory();
    if (event.key === "ArrowLeft") previousStory();
  });

  document.addEventListener("mexa:story-updated", event => {
    const updated = event.detail?.stories;

    if (Array.isArray(updated)) {
      groups = updated;
      renderTray();
    }
  });

  document.addEventListener("mexa:themechange", renderTray);

  function init() {
    ensureTray();
    ensureViewer();
    loadStories(true);

    if (refreshInterval !== null) {
      clearInterval(refreshInterval);
    }

    refreshInterval = window.setInterval(() => {
      loadStories(true);
    }, 60000);
  }

  window.MEXA_STORY_UI = {
    version: VERSION,
    refresh: () => loadStories(true),
    open: openGroup,
    close: closeViewer
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }
})(window, document);
