(function (window, document) {
  "use strict";

  if (window.MEXA_STORY_UI) {
    console.warn("MEXA STORY UI sudah aktif.");
    return;
  }

  const CONTROL = () => window.MEXA_STORY_CONTROL;
  const EMOJIS = [
    "😀","😃","😄","😁","😆","😅","😂","🤣",
    "🥹","😊","😇","🙂","🙃","😉","😍","🥰",
    "😘","😗","😙","😚","😋","😛","😜","🤪",
    "😎","🤩","🥳","😏","😌","🤗","🤭","🫢",
    "🤔","🫡","🤫","🤐","😶","😐","😑","😬",
    "🙄","😮","😯","😲","😳","🥺","😢","😭",
    "😤","😠","😡","🤯","😱","😴","🤒","🤕",
    "🤧","🥵","🥶","🤠","💩","👻","💀","🤖",
    "👍","👎","👌","✌️","🤞","🤟","🤘","👏",
    "🙌","🫶","🙏","💪","🫰","🤝","👋","💐",
    "❤️","🧡","💛","💚","💙","💜","🖤","🤍",
    "💖","💗","💓","💞","💕","💔","❤️‍🔥","💯",
    "🔥","✨","⭐","🌟","💫","🎉","🎊","🎁",
    "🌹","🌷","🌻","🌈","☀️","🌙","⚡","☕",
    "🍰","🍕","🍔","🍟","🍜","🍉","🍓","🍒",
    "⚽","🏀","🎮","🎧","🎵","🎶","🚀","🏆"
  ];

  let groups = [];
  let viewerStories = [];
  let currentIndex = 0;
  let timer = null;
  let startedAt = 0;
  let remaining = 7000;
  let isPaused = false;
  let busy = false;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function safeUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(value, window.location.href);
      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.href;
      }
    } catch (_) {}
    return "";
  }

  function isVideo(url) {
    return /\.(mp4|webm|ogg|mov|m4v)(?:$|[?#])/i.test(url || "");
  }

  function fallbackAvatar() {
    return "data:image/svg+xml," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">' +
      '<rect width="80" height="80" rx="40" fill="#30254c"/>' +
      '<circle cx="40" cy="29" r="15" fill="#b7a5df"/>' +
      '<path d="M12 78c2-20 13-30 28-30s26 10 28 30" fill="#b7a5df"/>' +
      '</svg>'
    );
  }

  function avatarUrl(story) {
    return safeUrl(story?.avatarUrl) || fallbackAvatar();
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
      feed.parentNode.insertBefore(feed, feed);
      feed.insertAdjacentElement("beforebegin", tray);
    } else {
      document.body.appendChild(tray);
    }

    return tray;
  }

  function renderMediaPreview(container, story) {
    const media = safeUrl(story.imageUrl);

    if (media && isVideo(media)) {
      const video = el("video");
      video.src = media;
      video.muted = true;
      video.preload = "metadata";
      video.playsInline = true;
      video.setAttribute("aria-label", "Pratinjau video status");
      container.appendChild(video);
      container.appendChild(el("span", "mx-story-play", "▶"));
    } else if (media) {
      const img = el("img");
      img.src = media;
      img.alt = "Foto status";
      img.loading = "lazy";
      img.onerror = () => {
        img.remove();
        container.appendChild(
          el("span", "mx-story-cover-text",
            story.content || "Status foto")
        );
      };
      container.appendChild(img);
    } else {
      container.appendChild(
        el(
          "span",
          "mx-story-cover-text",
          story.content || "Status MEXA"
        )
      );
    }
  }

  function renderTray() {
    const tray = ensureTray();
    tray.replaceChildren();

    const heading = el("div", "mx-story-heading");
    const headingText = el("div");
    headingText.append(
      el("h3", "mx-story-title", "Cerita MEXA"),
      el("div", "mx-story-subtitle", "Cerita terbaru · Aktif 24 jam")
    );

    const refresh = el("button", "mx-story-refresh", "↻");
    refresh.type = "button";
    refresh.title = "Muat ulang cerita";
    refresh.setAttribute("aria-label", "Muat ulang cerita");
    refresh.addEventListener("click", () => loadStories(true));

    heading.append(headingText, refresh);
    tray.appendChild(heading);

    const list = el("div", "mx-story-list");

    if (!groups.length) {
      list.appendChild(
        el("div", "mx-story-empty", "Belum ada status aktif.")
      );
    }

    groups.forEach(group => {
      if (!group.stories.length) return;

      const button = el("button", "mx-story-item");
      button.type = "button";
      button.setAttribute(
        "aria-label",
        "Lihat cerita " + group.displayName
      );

      const cover = el("span", "mx-story-cover");
      const inner = el("span", "mx-story-cover-inner");

      // Sampul besar adalah status terbaru, bukan foto profil.
      renderMediaPreview(inner, group.cover);

      const avatar = el("img", "mx-story-owner-avatar");
      avatar.src = avatarUrl(group.cover);
      avatar.alt = "Foto profil " + group.displayName;
      avatar.onerror = () => {
        avatar.onerror = null;
        avatar.src = fallbackAvatar();
      };

      cover.append(inner, avatar);

      const name = el(
        "span",
        "mx-story-owner-name",
        group.displayName || "Pengguna MEXA"
      );

      const count = el(
        "span",
        "mx-story-count",
        group.count + (group.count === 1 ? " status" : " status")
      );

      button.append(cover, name, count);
      button.addEventListener("click", () => openGroup(group.userId));
      list.appendChild(button);
    });

    tray.appendChild(list);
  }

  function ensureViewer() {
    let viewer = document.getElementById("mexa-story-viewer");
    if (viewer) return viewer;

    viewer = el("div");
    viewer.id = "mexa-story-viewer";
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
    pause.title = "Tahan atau lanjutkan cerita";
    pause.addEventListener("click", togglePause);

    const close = el("button", "mx-story-icon-button", "×");
    close.type = "button";
    close.title = "Tutup cerita";
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
    input.placeholder = "Pesan...";
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
    send.title = "Kirim pesan";
    send.setAttribute("aria-label", "Kirim pesan");

    reply.append(input, emojiButton, send);
    reply.addEventListener("submit", sendReply);

    screen.append(progress, header, stage, feedback, emojiPanel, reply);
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
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function startTimer() {
    stopTimer();

    if (isPaused || !viewerStories[currentIndex]) return;

    const progress = viewerElement(".mx-story-progress");
    const fills = progress.querySelectorAll(".mx-story-progress-fill");

    fills.forEach((fill, index) => {
      fill.style.transition = "none";
      fill.style.width = index < currentIndex ? "100%" : "0%";
    });

    const currentFill = fills[currentIndex];
    if (currentFill) {
      void currentFill.offsetWidth;
      currentFill.style.transition = `width ${remaining}ms linear`;
      currentFill.style.width = "100%";
    }

    startedAt = Date.now();

    timer = setTimeout(() => {
      remaining = 7000;
      nextStory();
    }, remaining);
  }

  function renderCurrentStory() {
    const control = CONTROL();
    if (!control) return closeViewer();

    viewerStories = viewerStories.filter(control.isActive);

    if (!viewerStories.length || currentIndex >= viewerStories.length) {
      return closeViewer();
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
    stage.querySelectorAll("img, video, .mx-story-stage-text")
      .forEach(node => node.remove());

    progress.replaceChildren();

    viewerStories.forEach((item, index) => {
      const segment = el("div", "mx-story-progress-segment");
      const fill = el("div", "mx-story-progress-fill");

      if (index < currentIndex) fill.classList.add("mx-story-done");
      segment.appendChild(fill);
      progress.appendChild(segment);
    });

    avatar.src = avatarUrl(story);
    avatar.onerror = () => {
      avatar.onerror = null;
      avatar.src = fallbackAvatar();
    };

    name.textContent = story.displayName || "Pengguna MEXA";
    time.textContent = formatAge(story.createdAt);

    const media = safeUrl(story.imageUrl);

    if (media && isVideo(media)) {
      const video = el("video");
      video.src = media;
      video.autoplay = true;
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.addEventListener("ended", nextStory);
      video.addEventListener("play", stopTimer);
      video.addEventListener("pause", () => {
        if (!isPaused && viewer.classList.contains("mx-story-open")) {
          startTimer();
        }
      });
      stage.insertBefore(video, stage.firstChild);
      video.play().catch(() => {});
      remaining = 7000;
    } else if (media) {
      const img = el("img");
      img.src = media;
      img.alt = "Status foto dari " + story.displayName;
      img.onerror = () => {
        img.remove();
        stage.insertBefore(
          el("div", "mx-story-stage-text",
            story.content || "Foto tidak dapat ditampilkan."),
          stage.firstChild
        );
      };
      stage.insertBefore(img, stage.firstChild);
      remaining = 7000;
      startTimer();
    } else {
      stage.insertBefore(
        el(
          "div",
          "mx-story-stage-text",
          story.content || "Status MEXA"
        ),
        stage.firstChild
      );
      remaining = 7000;
      startTimer();
    }

    input.value = "";
    emojiPanel.classList.remove("mx-story-emoji-open");
    feedback.classList.remove("mx-story-feedback-show");
    pauseButton.textContent = isPaused ? "▶" : "Ⅱ";
  }

  function formatAge(timestamp) {
    const diff = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return hours + " jam lalu";
    if (minutes > 0) return minutes + " menit lalu";
    return "Baru saja";
  }

  function openGroup(userId) {
    const group = groups.find(item => item.userId === String(userId));
    if (!group) return;

    viewerStories = group.stories
      .filter(story => CONTROL().isActive(story))
      .sort((a, b) => a.createdAt - b.createdAt);

    if (!viewerStories.length) return;

    currentIndex = 0;
    isPaused = false;
    remaining = 7000;

    ensureViewer().classList.add("mx-story-open");
    document.body.style.overflow = "hidden";
    renderCurrentStory();
  }

  function closeViewer() {
    stopTimer();
    const viewer = document.getElementById("mexa-story-viewer");

    if (viewer) {
      viewer.classList.remove("mx-story-open");
      const video = viewer.querySelector("video");
      if (video) video.pause();
    }

    document.body.style.overflow = "";
    viewerStories = [];
    currentIndex = 0;
    isPaused = false;
  }

  function nextStory() {
    if (currentIndex + 1 < viewerStories.length) {
      currentIndex++;
      remaining = 7000;
      renderCurrentStory();
    } else {
      closeViewer();
    }
  }

  function previousStory() {
    if (currentIndex > 0) {
      currentIndex--;
      remaining = 7000;
      renderCurrentStory();
    } else {
      remaining = 7000;
      renderCurrentStory();
    }
  }

  function togglePause() {
    const viewer = ensureViewer();
    const video = viewer.querySelector(".mx-story-stage video");

    if (isPaused) {
      isPaused = false;
      if (video) video.play().catch(() => {});
      else startTimer();
    } else {
      isPaused = true;

      if (timer) {
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
    if (button) button.textContent = isPaused ? "▶" : "Ⅱ";
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

    busy = true;
    feedback.textContent = "Mengirim pesan...";
    feedback.classList.add("mx-story-feedback-show");

    try {
      await CONTROL().reply(story.id, message);
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
    const control = CONTROL();

    if (!control) {
      console.error("MEXA_STORY_CONTROL belum dimuat.");
      return;
    }

    const tray = ensureTray();

    try {
      const result = await control.load({ force });
      groups = result || [];
      renderTray();
    } catch (error) {
      console.error("[MEXA STORY]", error);

      tray.replaceChildren();
      const message = el(
        "div",
        "mx-story-empty",
        "Cerita belum dapat dimuat. Periksa koneksi atau izin Supabase."
      );
      tray.appendChild(message);
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
    groups = event.detail?.stories || groups;
    renderTray();
  });

  document.addEventListener("mexa:themechange", () => {
    renderTray();
  });

  window.MEXA_STORY_UI = {
    refresh: () => loadStories(true),
    open: openGroup,
    close: closeViewer
  };

  function init() {
    ensureTray();
    ensureViewer();
    loadStories();

    // Periksa status baru dan kedaluwarsa secara berkala.
    window.setInterval(() => loadStories(true), 60000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window, document);
