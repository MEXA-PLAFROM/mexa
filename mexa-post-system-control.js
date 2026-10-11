
/* =====================================================
   MEXA POST SYSTEM CONTROL — PREMIUM V3
   Pemilik, pengunjung, menu, edit, hapus, bagikan
   ===================================================== */

(function (window, document) {
  "use strict";

  const VERSION = "3.0.0";

  if (
    window.MEXA_POST_SYSTEM &&
    window.MEXA_POST_SYSTEM.version === VERSION
  ) {
    console.warn("MEXA POST SYSTEM CONTROL sudah aktif.");
    return;
  }

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

  /* =====================================================
     IDENTITAS LOGIN DAN PEMILIK POSTINGAN
     ===================================================== */

  async function getPostContext(postId) {
    const client = getClient();

    const auth = await client.auth.getUser();
    if (auth.error) throw auth.error;

    const viewer = auth.data.user || null;

    const response = await client
      .from("posts")
      .select("id,user_id,content,image_url,created_at")
      .eq("id", postId)
      .maybeSingle();

    if (response.error) throw response.error;

    const post = response.data;
    if (!post) {
      throw new Error("Postingan tidak ditemukan atau tidak bisa dibaca.");
    }

    const viewerId = viewer && viewer.id
      ? String(viewer.id)
      : "";

    const ownerId = post.user_id
      ? String(post.user_id)
      : "";

    const isOwner = Boolean(
      viewerId && ownerId && viewerId === ownerId
    );

    console.info("[MEXA POST CONTROL]", {
      loginTerdeteksi: Boolean(viewerId),
      pemilikTerdeteksi: Boolean(ownerId),
      isOwner: isOwner
    });

    return {
      client: client,
      viewer: viewer,
      viewerId: viewerId,
      ownerId: ownerId,
      isOwner: isOwner,
      post: post
    };
  }

  /* =====================================================
     UTILITAS
     ===================================================== */

  function showToast(message, isError) {
    const oldToast = document.getElementById(
      "mexa-post-control-toast"
    );

    if (oldToast) oldToast.remove();

    const toast = document.createElement("div");

    toast.id = "mexa-post-control-toast";
    toast.textContent = message;

    Object.assign(toast.style, {
      position: "fixed",
      left: "50%",
      bottom: "24px",
      transform: "translateX(-50%)",
      zIndex: "100002",
      width: "max-content",
      maxWidth: "calc(100vw - 30px)",
      boxSizing: "border-box",
      padding: "13px 17px",
      borderRadius: "13px",
      background: "var(--mx-card, #151025)",
      color: isError ? "#ff8da1" : "var(--mx-text, #fff)",
      border: "1px solid " + (
        isError
          ? "rgba(255,112,133,.4)"
          : "var(--mx-border, #33294b)"
      ),
      boxShadow: "0 12px 35px rgba(0,0,0,.35)",
      fontFamily: "inherit",
      fontSize: "13px",
      fontWeight: "650",
      lineHeight: "1.5"
    });

    document.body.appendChild(toast);

    window.setTimeout(function () {
      toast.remove();
    }, 3200);
  }

  async function refreshFeed() {
    if (
      window.MEXAPosts &&
      typeof window.MEXAPosts.load === "function"
    ) {
      return await window.MEXAPosts.load();
    }

    if (typeof window.MEXA_LOAD_FEED === "function") {
      return await window.MEXA_LOAD_FEED();
    }

    throw new Error("Fungsi feed MEXA belum tersedia.");
  }

  function makeButton(panel, label, callback, danger) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "mx-post-menu-item";
    button.textContent = label;

    if (danger) {
      button.classList.add("is-danger");
    }

    button.addEventListener("click", callback);
    panel.appendChild(button);

    return button;
  }

  /* =====================================================
     MEMBUKA MENU TITIK TIGA
     Dipanggil oleh functions-post.js
     ===================================================== */

  async function openMenu(postId) {
    try {
      const context = await getPostContext(postId);

      const client = context.client;
      const post = context.post;
      const viewerId = context.viewerId;
      const ownerId = context.ownerId;
      const isOwner = context.isOwner;

      // Tutup menu sebelumnya.
      const oldOverlay = document.getElementById(
        "mexa-post-menu-overlay"
      );

      if (oldOverlay) {
        if (typeof oldOverlay._mexaClose === "function") {
          oldOverlay._mexaClose();
        } else {
          oldOverlay.remove();
        }
      }

      // Latar menu MEXA.
      const overlay = document.createElement("div");
      overlay.id = "mexa-post-menu-overlay";

      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "99999",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
        background: "rgba(5,3,15,.76)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)"
      });

      const panel = document.createElement("div");
      panel.className = "mx-post-menu-panel";

      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-label", "Menu postingan");

      Object.assign(panel.style, {
        width: "100%",
        maxWidth: "390px",
        maxHeight: "88vh",
        overflowY: "auto",
        padding: "20px",
        boxSizing: "border-box",
        borderRadius: "20px",
        background: "var(--mx-card, #151025)",
        color: "var(--mx-text, #fff)",
        border: "1px solid var(--mx-border, #33294b)",
        boxShadow: "0 24px 70px rgba(0,0,0,.48)",
        fontFamily: "inherit"
      });

      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      function closeMenu() {
        document.removeEventListener("keydown", onEscape);
        if (overlay.parentNode) overlay.remove();
      }

      function onEscape(event) {
        if (event.key === "Escape") closeMenu();
      }

      overlay._mexaClose = closeMenu;

      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) closeMenu();
      });

      panel.addEventListener("click", function (event) {
        event.stopPropagation();
      });

      document.addEventListener("keydown", onEscape);

      /* =================================================
         HEADER MENU
         ================================================= */

      function addHeader() {
        const row = document.createElement("div");
        row.className = "mx-post-menu-heading";

        const title = document.createElement("h3");
        title.textContent = "Menu Postingan";

        const close = document.createElement("button");
        close.type = "button";
        close.className = "mx-post-menu-close";
        close.textContent = "×";
        close.setAttribute("aria-label", "Tutup menu");
        close.addEventListener("click", closeMenu);

        row.append(title, close);
        panel.appendChild(row);

        const description = document.createElement("p");
        description.className = "mx-post-menu-description";
        description.textContent = isOwner
          ? "Postingan ini milik akun kamu."
          : "Kamu sedang melihat postingan pengguna lain.";

        panel.appendChild(description);
      }

      /* =================================================
         EDIT LANGSUNG DI KARTU POSTINGAN
         ================================================= */

      async function showEditor() {
        if (!isOwner) {
          closeMenu();
          showToast("Kamu hanya bisa mengedit postingan milik sendiri.", true);
          return;
        }

        try {
          const fresh = await getPostContext(post.id);

          if (
            !fresh.isOwner ||
            fresh.viewerId !== viewerId ||
            fresh.ownerId !== ownerId
          ) {
            closeMenu();
            showToast("Hak pemilik postingan tidak terverifikasi.", true);
            return;
          }
        } catch (error) {
          console.error("MEXA gagal memeriksa pemilik:", error);
          showToast("Gagal memeriksa akun. Coba lagi.", true);
          return;
        }

        const card = document.getElementById("post-" + post.id);
        const content = card &&
          card.querySelector(".mx-post-content");

        if (!card || !content) {
          closeMenu();
          showToast("Kartu atau isi postingan tidak ditemukan.", true);
          return;
        }

        if (card.querySelector(".mx-post-inline-editor")) {
          closeMenu();
          return;
        }

        const oldDisplay = content.style.display;

        const editor = document.createElement("section");
        editor.className = "mx-post-inline-editor";
        editor.setAttribute("aria-label", "Edit postingan MEXA");

        const heading = document.createElement("div");
        heading.className = "mx-post-edit-heading";

        const headingText = document.createElement("div");
        headingText.className = "mx-post-edit-heading-text";
        headingText.textContent = "✏️ Edit postingan";

        const badge = document.createElement("span");
        badge.className = "mx-post-edit-badge";
        badge.textContent = "POSTINGAN KAMU";

        heading.append(headingText, badge);

        const textarea = document.createElement("textarea");
        textarea.className = "mx-post-inline-textarea";
        textarea.value = content.textContent || post.content || "";
        textarea.placeholder = "Tulis perubahan postingan...";
        textarea.setAttribute("aria-label", "Isi postingan");
        textarea.spellcheck = true;

        const hint = document.createElement("div");
        hint.className = "mx-post-edit-hint";
        hint.textContent =
          "Perubahan tampil di kartu yang sama setelah disimpan.";

        const status = document.createElement("div");
        status.className = "mx-post-edit-status";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");

        const footer = document.createElement("div");
        footer.className = "mx-post-edit-footer";

        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "mx-post-edit-cancel";
        cancel.textContent = "Batal";

        const save = document.createElement("button");
        save.type = "button";
        save.className = "mx-post-edit-save";
        save.textContent = "Simpan perubahan";

        footer.append(cancel, save);
        editor.append(heading, textarea, hint, status, footer);

        content.insertAdjacentElement("afterend", editor);
        content.style.display = "none";

        closeMenu();

        function cancelEdit() {
          content.style.display = oldDisplay;
          editor.remove();
        }

        cancel.addEventListener("click", cancelEdit);

        textarea.addEventListener("keydown", function (event) {
          if (event.key === "Escape") cancelEdit();

          if (
            event.key === "Enter" &&
            (event.ctrlKey || event.metaKey)
          ) {
            event.preventDefault();
            save.click();
          }
        });

        save.addEventListener("click", async function () {
          if (save.disabled) return;

          const newContent = textarea.value.trim();

          if (!newContent) {
            status.textContent = "Isi postingan tidak boleh kosong.";
            status.classList.add("is-error");
            textarea.focus();
            return;
          }

          save.disabled = true;
          cancel.disabled = true;
          save.textContent = "Menyimpan...";
          status.classList.remove("is-error");
          status.textContent = "Memeriksa akun dan menyimpan...";

          try {
            const latest = await getPostContext(post.id);

            if (
              !latest.isOwner ||
              latest.viewerId !== viewerId ||
              latest.ownerId !== ownerId
            ) {
              throw new Error("Akun login bukan pemilik postingan ini.");
            }

            const result = await latest.client
              .from("posts")
              .update({ content: newContent })
              .eq("id", post.id)
              .eq("user_id", viewerId)
              .select("id,content")
              .maybeSingle();

            if (result.error) throw result.error;

            if (!result.data) {
              throw new Error(
                "Perubahan ditolak. Periksa izin RLS Supabase."
              );
            }

            content.textContent = result.data.content;
            content.style.display = oldDisplay;
            post.content = result.data.content;
            editor.remove();

            if (Array.isArray(window.MEXA_POSTS)) {
              window.MEXA_POSTS = window.MEXA_POSTS.map(function (item) {
                return String(item.id) === String(post.id)
                  ? Object.assign({}, item, {
                      content: result.data.content
                    })
                  : item;
              });
            }

            showToast("✓ Perubahan postingan tersimpan.", false);

          } catch (error) {
            console.error("MEXA gagal menyimpan edit:", error);

            status.textContent =
              error.message || "Gagal menyimpan perubahan.";

            status.classList.add("is-error");
            save.disabled = false;
            cancel.disabled = false;
            save.textContent = "Coba simpan lagi";
          }
        });

        editor.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });

        textarea.focus();
        textarea.setSelectionRange(
          textarea.value.length,
          textarea.value.length
        );
      }

      /* =================================================
         KONFIRMASI HAPUS PREMIUM
         ================================================= */

      function showDeleteConfirmation() {
        panel.replaceChildren();

        const icon = document.createElement("div");
        icon.className = "mx-post-delete-icon";
        icon.textContent = "🗑️";

        const title = document.createElement("h3");
        title.className = "mx-post-delete-title";
        title.textContent = "Hapus postingan?";

        const description = document.createElement("p");
        description.className = "mx-post-delete-description";
        description.textContent =
          "Postingan ini akan dihapus dari MEXA. Tindakan ini tidak dapat dibatalkan.";

        const cancel = makeButton(
          panel,
          "Batal",
          function () {
            showMenu();
          }
        );

        const confirm = makeButton(
          panel,
          "🗑️ Ya, hapus postingan",
          async function () {
            if (confirm.disabled) return;

            confirm.disabled = true;
            cancel.disabled = true;
            confirm.textContent = "Menghapus...";

            try {
              const fresh = await getPostContext(post.id);

              if (
                !fresh.isOwner ||
                fresh.viewerId !== viewerId ||
                fresh.ownerId !== ownerId
              ) {
                throw new Error("Akun login bukan pemilik postingan.");
              }

              const result = await fresh.client
                .from("posts")
                .delete()
                .eq("id", post.id)
                .eq("user_id", viewerId)
                .select("id")
                .maybeSingle();

              if (result.error) throw result.error;

              if (!result.data) {
                throw new Error(
                  "Penghapusan ditolak. Periksa izin RLS Supabase."
                );
              }

              closeMenu();

              const card = document.getElementById(
                "post-" + post.id
              );

              if (card) card.remove();

              if (Array.isArray(window.MEXA_POSTS)) {
                window.MEXA_POSTS = window.MEXA_POSTS.filter(
                  function (item) {
                    return String(item.id) !== String(post.id);
                  }
                );
              }

              showToast("Postingan berhasil dihapus.", false);

              try {
                await refreshFeed();
              } catch (refreshError) {
                console.warn("Feed tidak berhasil disegarkan.", refreshError);
              }
            } catch (error) {
              console.error("MEXA gagal menghapus postingan:", error);

              showToast(
                error.message || "Postingan gagal dihapus.",
                true
              );

              showMenu();
            }
          },
          true
        );

        panel.append(icon, title, description);
      }

      /* =================================================
         MENU UTAMA
         ================================================= */

      function showMenu() {
        panel.replaceChildren();

        addHeader();

        // Bagikan ke Teman.
        makeButton(panel, "👤  Bagikan ke Teman", function () {
          closeMenu();

          if (typeof window.openShareToFriend === "function") {
            window.openShareToFriend(post);
          } else {
            showToast(
              "Fitur Bagikan ke Teman belum terhubung.",
              true
            );
          }
        });

        // Bagikan ke Grup.
        makeButton(panel, "👨‍👩‍👧  Bagikan ke Grup", function () {
          closeMenu();

          if (typeof window.openShareToGroup === "function") {
            window.openShareToGroup(post);
          } else {
            showToast(
              "Fitur Bagikan ke Grup belum terhubung.",
              true
            );
          }
        });

        // Salin tautan.
        makeButton(panel, "🔗  Salin tautan", async function () {
          const url = new URL(window.location.href);
          url.hash = "post-" + post.id;

          try {
            if (
              navigator.clipboard &&
              window.isSecureContext
            ) {
              await navigator.clipboard.writeText(url.href);
              closeMenu();
              showToast("Tautan postingan berhasil disalin.", false);
            } else {
              closeMenu();
              window.prompt("Salin tautan postingan:", url.href);
            }
          } catch (error) {
            console.error("MEXA gagal menyalin tautan:", error);
            closeMenu();
            window.prompt("Salin tautan postingan:", url.href);
          }
        });

        if (isOwner) {
          makeButton(panel, "✏️  Edit postingan", showEditor);

          makeButton(
            panel,
            "🗑️  Hapus postingan",
            showDeleteConfirmation,
            true
          );
        } else {
          makeButton(
            panel,
            "⚑  Laporkan postingan",
            function () {
              closeMenu();

              if (typeof window.openReportPost === "function") {
                window.openReportPost(post);
              } else {
                showToast(
                  "Sistem moderasi/laporan belum terhubung.",
                  true
                );
              }
            },
            true
          );
        }

        makeButton(panel, "Tutup", closeMenu);
      }

      showMenu();

    } catch (error) {
      console.error("MEXA POST SYSTEM gagal membuka menu:", error);

      showToast(
        "Menu gagal dibuka. Periksa sesi login dan akses postingan.",
        true
      );
    }
  }

  /* =====================================================
     API YANG DIPAKAI functions-post.js
     ===================================================== */

  window.MEXA_POST_SYSTEM = {
    version: VERSION,
    openMenu: openMenu,
    getPostContext: getPostContext
  };

  // Nama kompatibilitas untuk file lama.
  window.openPostMenu = openMenu;

  console.log("MEXA POST SYSTEM CONTROL " + VERSION + " aktif.");

})(window, document);
