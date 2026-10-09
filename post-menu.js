
/* =====================================================
   MEXA POST MENU
   Menu titik tiga: Edit, Hapus, Bagikan, Salin Tautan,
   dan Laporkan.
   Tidak mengubah post-share.js.
===================================================== */

(function () {
  "use strict";

  let activePost = null;
  let menuElement = null;

  function getPostId(post) {
    if (!post) return null;
    if (typeof post === "string") return post;

    return post.id || post.post_id || post.postId || null;
  }

  function getCurrentUser() {
    if (typeof window.MEXA_GET_CURRENT_USER === "function") {
      try {
        const user = window.MEXA_GET_CURRENT_USER();
        if (user) return user;
      } catch (error) {
        console.warn("MEXA: gagal membaca sesi pengguna.", error);
      }
    }

    for (const key of [
      "mexa_session",
      "mexa_user",
      "mexaUser",
      "currentUser",
      "current_user",
      "user"
    ]) {
      try {
        const saved = localStorage.getItem(key);
        if (!saved) continue;

        const parsed = JSON.parse(saved);
        const user = parsed.user || parsed;

        if (user && (user.id || user.user_id || user.userId)) {
          return user;
        }
      } catch (_) {}
    }

    return null;
  }

  function getOwnerId(post) {
    return post && (
      post.user_id ||
      post.userId ||
      post.author_id ||
      post.authorId ||
      post.owner_id ||
      post.ownerId
    );
  }

  function isOwner(post) {
    const user = getCurrentUser();

    const userId = user && (
      user.id ||
      user.user_id ||
      user.userId
    );

    const ownerId = getOwnerId(post);

    return Boolean(
      userId &&
      ownerId &&
      String(userId) === String(ownerId)
    );
  }

  function showMessage(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    } else {
      alert(message);
    }
  }

  function closePostMenu() {
    if (menuElement) {
      menuElement.remove();
      menuElement = null;
    }

    activePost = null;
  }

  function findPost(input) {
    if (input && typeof input === "object") {
      return input;
    }

    const id = String(input || "");
    const posts = Array.isArray(window.MEXA_POSTS)
      ? window.MEXA_POSTS
      : [];

    return posts.find(
      post => String(getPostId(post)) === id
    ) || null;
  }

  function addMenuItem(container, label, action, danger) {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = label;
    button.dataset.action = action;

    button.style.cssText = [
      "display:block",
      "width:100%",
      "padding:12px 14px",
      "border:0",
      "border-radius:8px",
      "background:transparent",
      "color:" + (danger ? "#e5484d" : "inherit"),
      "text-align:left",
      "font:inherit",
      "cursor:pointer"
    ].join(";");

    button.addEventListener("mouseenter", function () {
      button.style.background = "rgba(127,127,127,.12)";
    });

    button.addEventListener("mouseleave", function () {
      button.style.background = "transparent";
    });

    container.appendChild(button);
  }

  function openPostMenu(input) {
    const post = findPost(input);

    if (!post) {
      showMessage("Data postingan belum ditemukan. Muat ulang halaman lalu coba lagi.");
      console.warn("MEXA: postingan tidak ditemukan.", input);
      return;
    }

    closePostMenu();
    activePost = post;

    const owner = isOwner(post);
    const id = getPostId(post);

    const menu = document.createElement("div");

    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Menu postingan MEXA");

    menu.style.cssText = [
      "position:absolute",
      "z-index:99999",
      "right:12px",
      "top:42px",
      "width:230px",
      "max-width:calc(100vw - 32px)",
      "padding:7px",
      "border:1px solid rgba(127,127,127,.22)",
      "border-radius:14px",
      "background:var(--mx-card-bg, var(--card-bg, #fff))",
      "color:var(--mx-text, var(--text-color, #222))",
      "box-shadow:0 8px 30px rgba(0,0,0,.18)"
    ].join(";");

    if (owner) {
      addMenuItem(menu, "✏️ Edit postingan", "edit");
      addMenuItem(menu, "🗑️ Hapus postingan", "delete", true);
    }

    addMenuItem(menu, "👥 Bagikan ke Teman", "friend");
    addMenuItem(menu, "👨‍👩‍👧 Bagikan ke Grup", "group");
    addMenuItem(menu, "🔗 Salin tautan", "copy");

    if (!owner) {
      addMenuItem(menu, "⚑ Laporkan postingan", "report", true);
    }

    const button = document.querySelector(
      '.mx-post-menu[onclick*="' + CSS.escape(String(id)) + '"]'
    );

    const card = document.getElementById("post-" + id);
    const anchor = button || (card && card.querySelector(".mx-post-menu"));

    if (anchor && anchor.parentElement) {
      const head = anchor.closest(".mx-post-head") || anchor.parentElement;

      if (getComputedStyle(head).position === "static") {
        head.style.position = "relative";
      }

      head.appendChild(menu);
    } else {
      menu.style.position = "fixed";
      menu.style.top = "100px";
      menu.style.right = "16px";
      document.body.appendChild(menu);
    }

    menuElement = menu;

    menu.addEventListener("click", function (event) {
      const item = event.target.closest("[data-action]");
      if (!item) return;

      handleAction(item.dataset.action, post);
    });

    setTimeout(function () {
      document.addEventListener("click", outsideClick, { once: true });
    }, 0);
  }

  function outsideClick(event) {
    if (
      menuElement &&
      !menuElement.contains(event.target) &&
      !event.target.closest(".mx-post-menu")
    ) {
      closePostMenu();
    }
  }

  async function handleAction(action, post) {
    const id = getPostId(post);

    if (action === "edit" || action === "delete") {
      if (!isOwner(post)) {
        closePostMenu();
        showMessage("Kamu hanya bisa mengubah postingan milikmu sendiri.");
        return;
      }
    }

    closePostMenu();

    if (action === "edit") {
      if (typeof window.editPost === "function") {
        await window.editPost(post);
      } else {
        window.dispatchEvent(new CustomEvent("mexa:edit-post", {
          detail: { post: post }
        }));
      }
      return;
    }

    if (action === "delete") {
      if (typeof window.deletePost === "function") {
        await window.deletePost(id);
      } else {
        window.dispatchEvent(new CustomEvent("mexa:delete-post", {
          detail: { post: post }
        }));
      }
      return;
    }

   
if (action === "friend") {
  const postId = getPostId(post);

  if (!postId) {
    showMessage("ID postingan tidak ditemukan.");
    return;
  }

  const url = new URL("Teman.html", window.location.href);
  url.searchParams.set("post_id", postId);

  window.location.href = url.href;
  return;
  }
   
if (action === "group") {
  closePostMenu();

  if (post && post.id) {
    const groupUrl = new URL(
      "Grup.html",
      window.location.href
    );

    groupUrl.searchParams.set("post_id", post.id);
    window.location.href = groupUrl.toString();
  } else {
    alert("Postingan tidak ditemukan. Silakan muat ulang MEXA.");
  }

  return;
}
    if (action === "copy") {
      const url = new URL(window.location.href);
      url.hash = "post-" + id;

      try {
        await navigator.clipboard.writeText(url.href);
        showMessage("Link postingan berhasil disalin.");
      } catch (_) {
        window.prompt("Salin tautan postingan ini:", url.href);
      }
      return;
    }

    if (action === "report") {
      const reason = window.prompt(
        "Tuliskan alasan melaporkan postingan ini:"
      );

      if (reason && reason.trim()) {
        showMessage("Laporan diterima di perangkat ini, tetapi belum dikirim ke server.");
        console.info("MEXA report draft:", {
          post_id: id,
          reason: reason.trim()
        });
      }
    }
  }

  window.openPostMenu = openPostMenu;
  window.closePostMenu = closePostMenu;

  window.MEXAPostMenu = {
    openPostMenu: openPostMenu,
    closePostMenu: closePostMenu
  };

  console.log("MEXA POST MENU aktif.");
})();
