/* =====================================================
   MEXA STORIES — UI V1
   Tampilan • Viewer • Balasan Messenger
   ===================================================== */

(function (window, document) {
  "use strict";

  if (window.MEXA_STORY_UI) return;

  let currentIndex = 0;
  let timerId = null;
  let viewerStories = [];
  let paused = false;
  let startedAt = 0;
  let elapsed = 0;
  const STORY_DURATION = 6000;

  const $ = (selector, root) =>
    (root || document).querySelector(selector);

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(
      /[&<>"']/g,
      character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character]
    );
  }

  function initials(name) {
    const parts = String(name || "MEXA").trim().split(/\s+/);
    return parts.slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
  }

  function remainingText(story) {
    return window.MEXA_STORY_CONTROL.formatRemainingTime(story);
  }

  function ensureTray() {
    let tray = document.getElementById("mexa-stories");
    if (tray) return tray;

    tray = document.createElement("section");
    tray.id = "mexa-stories";
    tray.setAttribute("aria-label", "Cerita MEXA");

    const feed = document.getElementById("mexaFeedList");
    const composer = document.getElementById("mexa-composer");

    if (composer && composer.parentNode) {
      composer.insertAdjacentElement("afterend", tray);
    } else if (feed && feed.parentNode) {
      feed.parentNode.insertBefore(tray, feed);
    } else {
      document.body.appendChild(tray);
    }

    return tray;
  }

  function renderTray(stories) {
    const tray = ensureTray();

    tray.innerHTML = `
      <div class="mstory-heading">
        <div>
          <h2 class="mstory-title">Cerita MEXA</h2>
          <div class="mstory-subtitle">Cerita terbaru • Aktif 24 jam</div>
        </div>
        <button type="button" class="mstory-refresh"
          data-story-refresh aria-label="Muat ulang Cerita"
          title="Muat ulang">↻</button>
      </div>
      <div class="mstory-list" data-story-list></div>
    `;

    const list = $("[data-story-list]", tray);

    if (!stories.length) {
      list.innerHTML = `
        <div class="mstory-state">
          Belum ada Cerita baru. Postingan terbaru akan muncul di sini.
        </div>
      `;
      return;
    }

    stories.forEach((story, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "mstory-item";
      item.setAttribute("aria-label", "Buka Cerita " + story.displayName);
      item.dataset.storyIndex = String(index);

      const avatar = story.avatarUrl
        ? `<img src="${escapeHTML(story.avatarUrl)}"
             alt="" loading="lazy" referrerpolicy="no-referrer">`
        : escapeHTML(initials(story.displayName));

      item.innerHTML = `
        <span class="mstory-ring">
          <span class="mstory-avatar">${avatar}</span>
        </span>
        <span class="mstory-caption">
          ${escapeHTML(story.displayName)}
          <span class="mstory-time">${escapeHTML(remainingText(story))}</span>
        </span>
      `;

      item.addEventListener("click", () => openViewer(index));
      list.appendChild(item);
    });
  }

  function ensureViewer() {
    let viewer = document.getElementById("mexa-story-viewer");
    if (viewer) return viewer;

    viewer = document.createElement("div");
    viewer.id = "mexa-story-viewer";
    viewer.hidden = true;
    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-modal", "true");
    viewer.setAttribute("aria-label", "Penampil Cerita MEXA");

    viewer.innerHTML = `
      <div class="mstory-viewer-card">
        <div class="mstory-progress-list" data-story-progress></div>

        <div class="mstory-viewer-head">
          <div class="mstory-owner-avatar" data-story-avatar></div>
          <div class="mstory-owner-info">
            <div class="mstory-owner-name" data-story-name></div>
            <div class="mstory-owner-time" data-story-time></div>
          </div>
          <button type="button" class="mstory-icon-button"
            data-story-close aria-label="Tutup Cerita">×</button>
        </div>

        <div class="mstory-media" data-story-media></div>

        <button type="button" class="mstory-tap-zone mstory-tap-prev"
          data-story-prev aria-label="Cerita sebelumnya"></button>
        <button type="button" class="mstory-tap-zone mstory-tap-next"
          data-story-next aria-label="Cerita berikutnya"></button>

        <div class="mstory-feedback" data-story-feedback hidden
          role="status" aria-live="polite"></div>

        <form class="mstory-bottom" data-story-reply-form>
          <input class="mstory-reply-input" data-story-reply-input
            maxlength="2000" autocomplete="off"
            placeholder="Kirim pesan..." aria-label="Balas Cerita">
          <button class="mstory-send-button" type="submit"
            data-story-send>Kirim</button>
        </form>
      </div>
    `;

    document.body.appendChild(viewer);

    $("[data-story-close]", viewer).addEventListener("click", closeViewer);
    $("[data-story-prev]", viewer).addEventListener("click", previousStory);
    $("[data-story-next]", viewer).addEventListener("click", nextStory);

    $("[data-story-reply-form]", viewer).addEventListener(
      "submit",
      sendReply
    );

    viewer.addEventListener("click", event => {
      if (event.target === viewer) closeViewer();
    });

    // Menjeda durasi ketika kursor berada pada penampil Cerita.
    viewer.addEventListener("mouseenter", pauseTimer);
    viewer.addEventListener("mouseleave", resumeTimer);

    document.addEventListener("keydown", handleKeydown);

    return viewer;
  }

  function renderProgress() {
    const viewer = ensureViewer();
    const holder = $("[data-story-progress]", viewer);

    holder.innerHTML = viewerStories.map((story, index) => `
      <div class="mstory-progress-track">
        <div class="mstory-progress-fill"
          data-story-progress-fill="${index}"></div>
      </div>
    `).join("");

    viewerStories.forEach((story, index) => {
      const fill = $(
        `[data-story-progress-fill="${index}"]`,
        viewer
      );

      if (fill && index < currentIndex) fill.style.width = "100%";
    });
  }

  function showFeedback(message, isError) {
    const viewer = ensureViewer();
    const feedback = $("[data-story-feedback]", viewer);

    feedback.hidden = false;
    feedback.textContent = message;
    feedback.style.border = isError
      ? "1px solid #ff718b"
      : "1px solid rgba(255,255,255,.2)";
  }

  function hideFeedback() {
    const viewer = ensureViewer();
    const feedback = $("[data-story-feedback]", viewer);
    feedback.hidden = true;
    feedback.textContent = "";
  }

  function renderCurrentStory() {
    viewerStories = viewerStories.filter(
      story => window.MEXA_STORY_CONTROL.isActive(story)
    );

    if (!viewerStories.length) {
      closeViewer();
      renderTray([]);
      return;
    }

    if (currentIndex >= viewerStories.length) {
      closeViewer();
      renderTray(window.MEXA_STORY_CONTROL.getAll());
      return;
    }

    const viewer = ensureViewer();
    const story = viewerStories[currentIndex];

    renderProgress();

    const avatar = $("[data-story-avatar]", viewer);
    avatar.innerHTML = story.avatarUrl
      ? `<img src="${escapeHTML(story.avatarUrl)}"
          alt="" referrerpolicy="no-referrer">`
      : escapeHTML(initials(story.displayName));

    $("[data-story-name]", viewer).textContent = story.displayName;
    $("[data-story-time]", viewer).textContent = remainingText(story);

    const media = $("[data-story-media]", viewer);

    if (story.imageUrl) {
      const image = document.createElement("img");
      image.className = "mstory-media-image";
      image.alt = "Cerita " + story.displayName;
      image.referrerPolicy = "no-referrer";
      image.src = story.imageUrl;

      image.addEventListener("error", () => {
        media.replaceChildren();
        const text = document.createElement("div");
        text.className = "mstory-media-text";
        text.textContent = story.content || "Cerita MEXA";
        media.appendChild(text);
      }, { once: true });

      media.replaceChildren(image);
    } else {
      const text = document.createElement("div");
      text.className = "mstory-media-text";
      text.textContent = story.content || "Cerita MEXA";
      media.replaceChildren(text);
    }

    const input = $("[data-story-reply-input]", viewer);
    const send = $("[data-story-send]", viewer);
    const myId = window.mexaSupabase &&
      window.mexaSupabase.auth;

    input.value = "";
    input.placeholder = "Kirim pesan ke " + story.displayName + "...";
    send.disabled = false;

    hideFeedback();
    clearTimer();
    elapsed = 0;
    paused = false;
    startTimer();
  }

  function openViewer(index) {
    const control = window.MEXA_STORY_CONTROL;
    if (!control) return;

    viewerStories = control.getAll();

    if (!viewerStories.length) {
      showToast("Belum ada Cerita aktif.");
      return;
    }

    currentIndex = Math.max(0, Math.min(index, viewerStories.length - 1));

    const viewer = ensureViewer();
    viewer.hidden = false;
    document.body.style.overflow = "hidden";

    renderCurrentStory();
  }

  function closeViewer() {
    clearTimer();

    const viewer = document.getElementById("mexa-story-viewer");
    if (viewer) viewer.hidden = true;

    document.body.style.overflow = "";
    paused = false;
  }

  function clearTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    clearTimer();
    startedAt = Date.now();

    timerId = window.setInterval(() => {
      if (paused) return;

      const total = elapsed + (Date.now() - startedAt);
      const percent = Math.min(100, (total / STORY_DURATION) * 100);
      const fill = $(
        `[data-story-progress-fill="${currentIndex}"]`,
        document.getElementById("mexa-story-viewer")
      );

      if (fill) fill.style.width = percent + "%";

      if (total >= STORY_DURATION) nextStory();
    }, 100);
  }

  function pauseTimer() {
    if (paused || timerId === null) return;

    elapsed += Date.now() - startedAt;
    paused = true;
  }

  function resumeTimer() {
    if (!paused) return;

    paused = false;
    startedAt = Date.now();
  }

  function nextStory() {
    if (currentIndex < viewerStories.length - 1) {
      currentIndex++;
      renderCurrentStory();
    } else {
      closeViewer();
      renderTray(window.MEXA_STORY_CONTROL.getAll());
    }
  }

  function previousStory() {
    if (currentIndex > 0) {
      currentIndex--;
      renderCurrentStory();
    } else {
      elapsed = 0;
      renderCurrentStory();
    }
  }

  function handleKeydown(event) {
    const viewer = document.getElementById("mexa-story-viewer");
    if (!viewer || viewer.hidden) return;

    if (event.key === "Escape") closeViewer();

    if (
      event.target &&
      event.target.matches("input, textarea, [contenteditable=true]")
    ) return;

    if (event.key === "ArrowRight") nextStory();
    if (event.key === "ArrowLeft") previousStory();
  }

  async function sendReply(event) {
    event.preventDefault();

    const viewer = ensureViewer();
    const story = viewerStories[currentIndex];
    const input = $("[data-story-reply-input]", viewer);
    const button = $("[data-story-send]", viewer);
    const message = input.value.trim();

    if (!story) {
      showFeedback("Cerita tidak ditemukan.", true);
      return;
    }

    if (!message) {
      showFeedback("Tulis pesan terlebih dahulu.", true);
      input.focus();
      return;
    }

    button.disabled = true;
    button.textContent = "Mengirim...";
    hideFeedback();

    try {
      await window.MEXA_STORY_CONTROL.reply(story.id, message);
      input.value = "";
      showFeedback("Pesan berhasil diserahkan ke Messenger.", false);
    } catch (error) {
      console.error("[MEXA STORY UI] Balasan gagal:", error);
      showFeedback(
        error.message || "Pesan belum berhasil dikirim.",
        true
      );
    } finally {
      button.disabled = false;
      button.textContent = "Kirim";
    }
  }

  function showToast(message) {
    console.info("[MEXA STORY]", message);
  }

  async function refresh() {
    const tray = ensureTray();
    const list = $("[data-story-list]", tray);

    if (list) {
      list.innerHTML = '<div class="mstory-state">Memuat Cerita...</div>';
    }

    try {
      const stories = await window.MEXA_STORY_CONTROL.load({
        force: true
      });
      renderTray(stories);
    } catch (error) {
      if (list) {
        list.innerHTML =
          '<div class="mstory-state">Cerita belum bisa dimuat. Periksa koneksi dan izin Supabase.</div>';
      }
    }
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-story-refresh]");
    if (button) refresh();
  });

  document.addEventListener("mexa:story-updated", event => {
    renderTray(event.detail.stories || []);
  });

  document.addEventListener("mexa:story-message", event => {
    const detail = event.detail || {};
    if (detail.message) showToast(detail.message);
  });

  function init() {
    if (!window.MEXA_STORY_CONTROL) {
      console.error(
        "MEXA STORY UI: cerita-control.js harus dimuat lebih dahulu."
      );
      return;
    }

    ensureTray();
    ensureViewer();
    refresh();

    // Segarkan Cerita secara berkala untuk menghilangkan yang kedaluwarsa.
    window.setInterval(refresh, 60000);
  }

  window.MEXA_STORY_UI = {
    init: init,
    refresh: refresh,
    open: openViewer,
    close: closeViewer
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})(window, document);
