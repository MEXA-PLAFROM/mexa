/* =========================================================
   MEXA — POST MENU
   Menu titik tiga postingan
   File: post-menu.js

   TUGAS FILE INI:
   - Membuka menu titik tiga
   - Cek pemilik postingan
   - Edit / Hapus untuk pemilik
   - Share
   - Share ke teman
   - Share ke grup
   - Share ke media lain
   - Salin link
   - Laporkan postingan
   ========================================================= */

(function () {
  "use strict";

  /* =========================================================
     STATE
     ========================================================= */

  let activePost = null;
  let menuRoot = null;

  /* =========================================================
     HELPER
     ========================================================= */

  function getPostId(post) {
    if (!post) return null;

    return (
      post.id ||
      post.post_id ||
      post.postId ||
      post.uuid ||
      null
    );
  }

  function getPostOwnerId(post) {
    if (!post) return null;

    return (
      post.user_id ||
      post.userId ||
      post.author_id ||
      post.authorId ||
      post.owner_id ||
      post.ownerId ||
      null
    );
  }

  function getCurrentUser() {
    /*
      Kalau index.html punya resolver sendiri,
      MEXA akan memakai resolver tersebut.
    */
    if (typeof window.MEXA_GET_CURRENT_USER === "function") {
      try {
        return window.MEXA_GET_CURRENT_USER();
      } catch (e) {
        console.warn("MEXA_GET_CURRENT_USER error:", e);
      }
    }

    /*
      Coba beberapa nama localStorage yang umum.
      Tidak mengubah sistem login yang sudah ada.
    */
    const keys = [
      "mexa_user",
      "mexaUser",
      "currentUser",
      "current_user",
      "user"
    ];

    for (const key of keys) {
      try {
        const value = localStorage.getItem(key);

        if (!value) continue;

        try {
          return JSON.parse(value);
        } catch (_) {
          return {
            id: value,
            user_id: value
          };
        }
      } catch (_) {}
    }

    return null;
  }

  function getCurrentUserId() {
    const user = getCurrentUser();

    if (!user) return null;

    return (
      user.id ||
      user.user_id ||
      user.userId ||
      user.uid ||
      null
    );
  }

  function isOwner(post) {
    const ownerId = getPostOwnerId(post);
    const currentId = getCurrentUserId();

    if (!ownerId || !currentId) return false;

    return String(ownerId) === String(currentId);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getPostName(post) {
    return (
      post?.display_name ||
      post?.displayName ||
      post?.author_name ||
      post?.authorName ||
      post?.username ||
      "Postingan MEXA"
    );
  }

  function getPostAvatar(post) {
    return (
      post?.avatar_url ||
      post?.avatarUrl ||
      post?.author_avatar ||
      post?.authorAvatar ||
      ""
    );
  }

  /* =========================================================
     STYLE
     ========================================================= */

  function injectStyle() {
    if (document.getElementById("mexa-post-menu-style")) return;

    const style = document.createElement("style");
    style.id = "mexa-post-menu-style";

    style.textContent = `
      /* =====================================================
         MEXA POST MENU
         ===================================================== */

      .mx-post-menu-layer {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        pointer-events: none;
        font-family: inherit;
      }

      .mx-post-menu-layer.is-open {
        pointer-events: auto;
      }

      .mx-post-menu-backdrop {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(
            circle at 50% 100%,
            rgba(80, 90, 255, .10),
            transparent 45%
          ),
          rgba(0, 0, 0, .52);

        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);

        opacity: 0;
        transition: opacity .22s ease;
      }

      .mx-post-menu-layer.is-open .mx-post-menu-backdrop {
        opacity: 1;
      }

      .mx-post-menu-sheet {
        position: relative;
        width: min(100%, 520px);
        max-height: min(86vh, 720px);

        overflow: hidden auto;

        background:
          linear-gradient(
            145deg,
            rgba(255,255,255,.98),
            rgba(247,248,252,.98)
          );

        color: #171820;

        border: 1px solid rgba(255,255,255,.85);
        border-bottom: none;

        border-radius: 28px 28px 0 0;

        box-shadow:
          0 -12px 50px rgba(0,0,0,.18),
          0 -2px 12px rgba(0,0,0,.08);

        transform: translateY(105%);
        opacity: .7;

        transition:
          transform .32s cubic-bezier(.22,1,.36,1),
          opacity .22s ease;

        padding:
          10px
          12px
          calc(12px + env(safe-area-inset-bottom));
      }

      .mx-post-menu-layer.is-open .mx-post-menu-sheet {
        transform: translateY(0);
        opacity: 1;
      }

      /* DARK MODE */

      @media (prefers-color-scheme: dark) {
        .mx-post-menu-sheet {
          background:
            linear-gradient(
              145deg,
              rgba(25,27,34,.99),
              rgba(14,16,22,.99)
            );

          color: #f7f8fb;

          border-color: rgba(255,255,255,.08);

          box-shadow:
            0 -16px 60px rgba(0,0,0,.55),
            0 -2px 20px rgba(0,0,0,.30);
        }
      }

      /* DESKTOP */

      @media (min-width: 700px) {
        .mx-post-menu-layer {
          align-items: center;
        }

        .mx-post-menu-sheet {
          width: min(92vw, 520px);
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,.12);

          transform:
            translateY(20px)
            scale(.96);

          opacity: 0;
        }

        .mx-post-menu-layer.is-open .mx-post-menu-sheet {
          transform:
            translateY(0)
            scale(1);

          opacity: 1;
        }
      }

      /* HANDLE */

      .mx-post-menu-handle {
        width: 42px;
        height: 5px;
        border-radius: 999px;
        margin: 2px auto 14px;

        background: rgba(120,125,140,.35);
      }

      /* HEADER */

      .mx-post-menu-header {
        display: flex;
        align-items: center;
        gap: 11px;

        padding: 5px 8px 14px;
      }

      .mx-post-menu-avatar {
        width: 42px;
        height: 42px;

        flex: 0 0 42px;

        border-radius: 50%;

        display: grid;
        place-items: center;

        overflow: hidden;

        background:
          linear-gradient(
            135deg,
            #111827,
            #5865f2
          );

        color: white;

        font-size: 15px;
        font-weight: 800;

        box-shadow:
          0 5px 18px rgba(50,60,130,.22);
      }

      .mx-post-menu-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .mx-post-menu-user {
        min-width: 0;
        flex: 1;
      }

      .mx-post-menu-user-name {
        font-size: 14px;
        font-weight: 800;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .mx-post-menu-user-sub {
        margin-top: 3px;
        font-size: 11px;
        opacity: .55;
      }

      .mx-post-menu-close {
        width: 36px;
        height: 36px;

        border: 0;
        border-radius: 50%;

        display: grid;
        place-items: center;

        cursor: pointer;

        color: inherit;
        background: rgba(120,125,140,.10);

        font-size: 21px;

        transition:
          transform .18s ease,
          background .18s ease;
      }

      .mx-post-menu-close:hover {
        transform: scale(1.05);
        background: rgba(120,125,140,.18);
      }

      /* SECTION */

      .mx-post-menu-section {
        margin-top: 6px;
      }

      .mx-post-menu-section-title {
        padding: 8px 9px 7px;

        font-size: 10px;
        font-weight: 800;

        letter-spacing: .08em;
        text-transform: uppercase;

        opacity: .42;
      }

      /* ITEM */

      .mx-post-menu-item {
        width: 100%;

        display: flex;
        align-items: center;

        gap: 12px;

        padding: 12px 10px;

        margin: 2px 0;

        border: 0;
        border-radius: 17px;

        background: transparent;
        color: inherit;

        text-align: left;

        cursor: pointer;

        font: inherit;

        transition:
          background .18s ease,
          transform .16s ease;
      }

      .mx-post-menu-item:hover {
        background: rgba(100,110,140,.09);
      }

      .mx-post-menu-item:active {
        transform: scale(.985);
      }

      .mx-post-menu-icon {
        width: 42px;
        height: 42px;

        flex: 0 0 42px;

        display: grid;
        place-items: center;

        border-radius: 14px;

        font-size: 18px;

        background:
          linear-gradient(
            145deg,
            rgba(99,102,241,.13),
            rgba(99,102,241,.05)
          );

        color: #5963e9;
      }

      @media (prefers-color-scheme: dark) {
        .mx-post-menu-icon {
          background:
            linear-gradient(
              145deg,
              rgba(99,102,241,.20),
              rgba(99,102,241,.08)
            );

          color: #9da5ff;
        }
      }

      .mx-post-menu-text {
        min-width: 0;
        flex: 1;
      }

      .mx-post-menu-title {
        font-size: 13px;
        font-weight: 750;
        line-height: 1.25;
      }

      .mx-post-menu-desc {
        margin-top: 3px;

        font-size: 10.5px;
        line-height: 1.3;

        opacity: .48;
      }

      .mx-post-menu-arrow {
        opacity: .28;
        font-size: 17px;
      }

      /* DANGER */

      .mx-post-menu-item.is-danger {
        color: #e5484d;
      }

      .mx-post-menu-item.is-danger .mx-post-menu-icon {
        background: rgba(229,72,77,.10);
        color: #e5484d;
      }

      /* CANCEL */

      .mx-post-menu-cancel {
        width: 100%;

        margin-top: 8px;

        padding: 13px;

        border: 0;
        border-radius: 17px;

        background: rgba(120,125,140,.10);
        color: inherit;

        cursor: pointer;

        font: inherit;
        font-size: 13px;
        font-weight: 800;

        transition:
          background .18s ease,
          transform .16s ease;
      }

      .mx-post-menu-cancel:hover {
        background: rgba(120,125,140,.16);
      }

      .mx-post-menu-cancel:active {
        transform: scale(.985);
      }

      /* TOAST */

      .mx-post-menu-toast {
        position: fixed;

        left: 50%;
        bottom: calc(
          22px + env(safe-area-inset-bottom)
        );

        transform:
          translate(-50%, 18px)
          scale(.96);

        z-index: 1000000;

        padding: 11px 16px;

        border-radius: 999px;

        background: rgba(20,22,28,.94);
        color: white;

        box-shadow:
          0 12px 35px rgba(0,0,0,.28);

        font-size: 12px;
        font-weight: 700;

        opacity: 0;

        pointer-events: none;

        transition:
          opacity .22s ease,
          transform .22s ease;
      }

      .mx-post-menu-toast.show {
        opacity: 1;

        transform:
          translate(-50%, 0)
          scale(1);
      }

      /* REDUCED MOTION */

      @media (prefers-reduced-motion: reduce) {
        .mx-post-menu-sheet,
        .mx-post-menu-backdrop,
        .mx-post-menu-item,
        .mx-post-menu-toast {
          transition: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =========================================================
     TOAST
     ========================================================= */

  function showToast(message) {
    let toast = document.getElementById("mexa-post-menu-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "mexa-post-menu-toast";
      toast.className = "mx-post-menu-toast";

      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toast._timer);

    toast._timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2200);
  }

  /* =========================================================
     ICON
     ========================================================= */

  const ICONS = {
    edit: "✎",
    delete: "⌫",
    share: "↗",
    friend: "♙",
    group: "♧",
    media: "◈",
    copy: "⧉",
    report: "⚑"
  };

  /* =========================================================
     MENU ITEM
     ========================================================= */

  function createItem({
    action,
    icon,
    title,
    description,
    danger = false
  }) {
    const button = document.createElement("button");

    button.type = "button";
    button.className =
      "mx-post-menu-item" +
      (danger ? " is-danger" : "");

    button.dataset.action = action;

    button.innerHTML = `
      <span class="mx-post-menu-icon">
        ${icon}
      </span>

      <span class="mx-post-menu-text">
        <span class="mx-post-menu-title">
          ${escapeHTML(title)}
        </span>

        ${
          description
            ? `
              <span class="mx-post-menu-desc">
                ${escapeHTML(description)}
              </span>
            `
            : ""
        }
      </span>

      <span class="mx-post-menu-arrow">
        ›
      </span>
    `;

    return button;
  }

  /* =========================================================
     OPEN MENU
     ========================================================= */

  function openPostMenu(post) {
    if (!post) {
      console.warn("MEXA: post tidak ditemukan.");
      return;
    }

    injectStyle();

    activePost = post;

    closePostMenu(true);

    const owner = isOwner(post);

    const layer = document.createElement("div");

    layer.className = "mx-post-menu-layer";
    layer.id = "mexa-post-menu";

    const avatar = getPostAvatar(post);
    const name = getPostName(post);

    const avatarHTML = avatar
      ? `<img src="${escapeHTML(avatar)}" alt="">`
      : escapeHTML(
          String(name).trim().charAt(0).toUpperCase() || "M"
        );

    layer.innerHTML = `
      <div
        class="mx-post-menu-backdrop"
        data-menu-close="true"
      ></div>

      <div
        class="mx-post-menu-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Menu postingan MEXA"
      >

        <div class="mx-post-menu-handle"></div>

        <div class="mx-post-menu-header">

          <div class="mx-post-menu-avatar">
            ${avatarHTML}
          </div>

          <div class="mx-post-menu-user">
            <div class="mx-post-menu-user-name">
              ${escapeHTML(name)}
            </div>

            <div class="mx-post-menu-user-sub">
              ${owner
                ? "Postingan Anda"
                : "Menu postingan MEXA"}
            </div>
          </div>

          <button
            type="button"
            class="mx-post-menu-close"
            data-menu-close="true"
            aria-label="Tutup"
          >
            ×
          </button>

        </div>

        <div class="mx-post-menu-section">

          <div class="mx-post-menu-section-title">
            Bagikan
          </div>

          <div class="mx-post-menu-items">

            ${createItem({
              action: "share",
              icon: ICONS.share,
              title: "Bagikan",
              description: "Bagikan postingan ke MEXA",
            }).outerHTML}

            ${createItem({
              action: "friend",
              icon: ICONS.friend,
              title: "Bagikan ke teman",
              description: "Kirim postingan ke teman MEXA",
            }).outerHTML}

            ${createItem({
              action: "group",
              icon: ICONS.group,
              title: "Bagikan ke grup",
              description: "Bagikan ke komunitas atau grup",
            }).outerHTML}

            ${createItem({
              action: "media",
              icon: ICONS.media,
              title: "Bagikan ke media lain",
              description: "Gunakan aplikasi lain di perangkat",
            }).outerHTML}

            ${createItem({
              action: "copy",
              icon: ICONS.copy,
              title: "Salin link",
              description: "Salin tautan postingan",
            }).outerHTML}

          </div>

        </div>

        ${
          owner
            ? `
              <div class="mx-post-menu-section">

                <div class="mx-post-menu-section-title">
                  Kelola postingan
                </div>

                ${createItem({
                  action: "edit",
                  icon: ICONS.edit,
                  title: "Edit postingan",
                  description: "Ubah isi postingan Anda",
                }).outerHTML}

                ${createItem({
                  action: "delete",
                  icon: ICONS.delete,
                  title: "Hapus postingan",
                  description: "Hapus postingan ini dari MEXA",
                  danger: true
                }).outerHTML}

              </div>
            `
            : `
              <div class="mx-post-menu-section">

                <div class="mx-post-menu-section-title">
                  Lainnya
                </div>

                ${createItem({
                  action: "report",
                  icon: ICONS.report,
                  title: "Laporkan postingan",
                  description: "Beri tahu MEXA jika ada masalah",
                  danger: true
                }).outerHTML}

              </div>
            `
        }

        <button
          type="button"
          class="mx-post-menu-cancel"
          data-menu-close="true"
        >
          Batal
        </button>

      </div>
    `;

    document.body.appendChild(layer);

    menuRoot = layer;

    requestAnimationFrame(() => {
      layer.classList.add("is-open");
    });

    bindMenuEvents(layer);

    document.body.style.overflow = "hidden";
  }

  /* =========================================================
     EVENTS
     ========================================================= */

  function bindMenuEvents(layer) {
    layer.addEventListener("click", function (event) {

      const closeTarget =
        event.target.closest("[data-menu-close]");

      if (closeTarget) {
        closePostMenu();
        return;
      }

      const item =
        event.target.closest(".mx-post-menu-item");

      if (!item) return;

      const action = item.dataset.action;

      handleAction(action);
    });
  }

  /* =========================================================
     ACTION ROUTER
     ========================================================= */

  function handleAction(action) {
    const post = activePost;

    if (!post) return;

    /*
      MENU DITUTUP DULU
      sebelum membuka modul berikutnya.
    */
    closePostMenu();

    /* =========================
       EDIT
       ========================= */

    if (action === "edit") {

      if (!isOwner(post)) {
        showToast("Anda tidak memiliki akses edit.");
        return;
      }

      if (
        typeof window.openPostEditor === "function"
      ) {
        window.openPostEditor(post);
        return;
      }

      window.dispatchEvent(
        new CustomEvent("mexa:edit-post", {
          detail: { post }
        })
      );

      return;
    }

    /* =========================
       DELETE
       ========================= */

    if (action === "delete") {

      if (!isOwner(post)) {
        showToast("Anda tidak memiliki akses hapus.");
        return;
      }

      window.dispatchEvent(
        new CustomEvent("mexa:delete-post", {
          detail: { post }
        })
      );

      return;
    }

    /* =========================
       SHARE
       ========================= */

    if (action === "share") {

      if (
        typeof window.mexaSharePost === "function"
      ) {
        window.mexaSharePost(post);
      } else {
        window.dispatchEvent(
          new CustomEvent("mexa:share-post", {
            detail: { post }
          })
        );
      }

      return;
    }

    /* =========================
       FRIEND
       ========================= */

    if (action === "friend") {

      if (
        typeof window.openShareToFriend === "function"
      ) {
        window.openShareToFriend(post);
      } else {
        window.dispatchEvent(
          new CustomEvent("mexa:share-to-friend", {
            detail: { post }
          })
        );
      }

      return;
    }

    /* =========================
       GROUP
       ========================= */

    if (action === "group") {

      if (
        typeof window.openShareToGroup === "function"
      ) {
        window.openShareToGroup(post);
      } else {
        window.dispatchEvent(
          new CustomEvent("mexa:share-to-group", {
            detail: { post }
          })
        );
      }

      return;
    }

    /* =========================
       MEDIA LAIN
       ========================= */

    if (action === "media") {

      if (
        typeof window.mexaShareToOtherMedia === "function"
      ) {
        window.mexaShareToOtherMedia(post);
      } else {
        window.dispatchEvent(
          new CustomEvent("mexa:share-to-media", {
            detail: { post }
          })
        );
      }

      return;
    }

    /* =========================
       COPY LINK
       ========================= */

    if (action === "copy") {

      if (
        typeof window.mexaCopyPostLink === "function"
      ) {
        window.mexaCopyPostLink(post);
        return;
      }

      const postId = getPostId(post);

      if (!postId) {
        showToast("Link postingan belum tersedia.");
        return;
      }

      const url =
        window.location.origin +
        window.location.pathname +
        "?post=" +
        encodeURIComponent(postId);

      if (
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        navigator.clipboard.writeText(url)
          .then(() => {
            showToast("Link postingan berhasil disalin.");
          })
          .catch(() => {
            showToast("Tidak dapat menyalin link.");
          });
      } else {
        showToast("Fitur salin tidak tersedia.");
      }

      return;
    }

    /* =========================
       REPORT
       ========================= */

    if (action === "report") {

      window.dispatchEvent(
        new CustomEvent("mexa:report-post", {
          detail: { post }
        })
      );

      return;
    }
  }

  /* =========================================================
     CLOSE MENU
     ========================================================= */

  function closePostMenu(immediate = false) {
    const layer =
      menuRoot ||
      document.getElementById("mexa-post-menu");

    if (!layer) return;

    menuRoot = null;

    if (immediate) {
      layer.remove();
      document.body.style.overflow = "";
      return;
    }

    layer.classList.remove("is-open");

    setTimeout(() => {
      if (layer && layer.parentNode) {
        layer.remove();
      }

      document.body.style.overflow = "";
    }, 300);
  }

  /* =========================================================
     ESC
     ========================================================= */

  document.addEventListener("keydown", function (event) {

    if (event.key !== "Escape") return;

    if (menuRoot) {
      closePostMenu();
    }

  });

  /* =========================================================
     PUBLIC API
     ========================================================= */

  window.openPostMenu = openPostMenu;
  window.closePostMenu = closePostMenu;

  window.MEXAPostMenu = {
    open: openPostMenu,
    close: closePostMenu,
    isOwner: isOwner,
    getPostId: getPostId
  };

})();
