
/* =====================================================
   MEXA POST SYSTEM CONTROL
   Versi 2.2.0
   Terhubung dengan functions-post.js
   ===================================================== */

(function (window, document) {
  "use strict";

  const VERSION = "2.2.0";

  // Cegah pemuatan ganda versi yang sama.
  if (
    window.MEXA_POST_SYSTEM &&
    window.MEXA_POST_SYSTEM.version === VERSION
  ) {
    console.warn("MEXA POST SYSTEM CONTROL sudah aktif.");
    return;
  }

  /* =====================================================
     KONEKSI SUPABASE
     ===================================================== */

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
     PERIKSA PENGUNJUNG DAN PEMILIK POSTINGAN
     ===================================================== */

  async function getPostContext(postId) {
    const client = getClient();

    const authResult = await client.auth.getUser();

    if (authResult.error) {
      throw authResult.error;
    }

    const viewer = authResult.data.user || null;

    const postResult = await client
      .from("posts")
      .select("id,user_id,content,image_url,created_at")
      .eq("id", postId)
      .maybeSingle();

    if (postResult.error) {
      throw postResult.error;
    }

    const post = postResult.data;

    if (!post) {
      throw new Error(
        "Postingan tidak ditemukan atau tidak bisa dibaca."
      );
    }

    const viewerId = viewer && viewer.id
      ? String(viewer.id)
      : "";

    const ownerId = post.user_id
      ? String(post.user_id)
      : "";

    const isOwner = Boolean(
      viewerId &&
      ownerId &&
      viewerId === ownerId
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
     NOTIFIKASI PREMIUM
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
      bottom: "28px",
      transform: "translateX(-50%)",
      zIndex: "100001",
      width: "max-content",
      maxWidth: "calc(100vw - 32px)",
      boxSizing: "border-box",
      padding: "13px 18px",
      borderRadius: "14px",
      border: "1px solid " + (
        isError
          ? "rgba(255,112,133,.45)"
          : "rgba(0,229,255,.30)"
      ),
      background: "var(--mx-card, #151025)",
      color: isError
        ? "#ff9caf"
        : "var(--mx-text, #ffffff)",
      boxShadow: "0 12px 35px rgba(0,0,0,.35)",
      fontFamily: "inherit",
      fontSize: "13px",
      fontWeight: "650",
      lineHeight: "1.5",
      textAlign: "center"
    });

    document.body.appendChild(toast);

    window.setTimeout(function () {
      if (toast.parentNode) toast.remove();
    }, 3200);
  }

  /* =====================================================
     MUAT ULANG FEED
     ===================================================== */

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

  /* =====================================================
     MENU TITIK TIGA
     ===================================================== */

  async function openMenu(postId) {
    try {
      const context = await getPostContext(postId);

      const client = context.client;
      const post = context.post;
      const viewerId = context.viewerId;
      const ownerId = context.ownerId;
      const isOwner = context.isOwner;

      // Tutup menu yang mungkin masih terbuka.
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

      // LATAR MENU.
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
        boxSizing: "border-box",
        background: "rgba(5,3,15,.76)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)"
      });

      // PANEL MENU.
      const panel = document.createElement("div");

      panel.className = "mx-post-menu-panel";

      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-label", "Menu postingan");

      Object.assign(panel.style, {
        width: "100%",
        maxWidth: "380px",
        maxHeight: "90vh",
        overflowY: "auto",
        padding: "20px",
        boxSizing: "border-box",
        borderRadius: "20px",
        background: "var(--mx-card, #171329)",
        color: "var(--mx-text, #f6f3ff)",
        border: "1px solid var(--mx-border, #393052)",
        boxShadow: "0 24px 70px rgba(0,0,0,.48)",
        fontFamily: "inherit"
      });

      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      function closeMenu() {
        document.removeEventListener(
          "keydown",
          handleEscape
        );

        if (overlay.parentNode) {
          overlay.remove();
        }
      }

      function handleEscape(event) {
        if (event.key === "Escape") {
          closeMenu();
        }
      }

      overlay._mexaClose = closeMenu;

      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) closeMenu();
      });

      panel.addEventListener("click", function (event) {
        event.stopPropagation();
      });

      document.addEventListener(
        "keydown",
        handleEscape
      );

      /* =================================================
         PEMBUAT TOMBOL PREMIUM
         ================================================= */

      function makeButton(label, callback, danger) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "mx-post-menu-item";
        button.textContent = label;

        if (danger) {
          button.classList.add("is-danger");
        }

        Object.assign(button.style, {
          display: "flex",
          alignItems: "center",
          width: "100%",
          minHeight: "46px",
          marginTop: "8px",
          padding: "12px 14px",
          boxSizing: "border-box",
          borderRadius: "12px",
          border: "1px solid " + (
            danger
              ? "rgba(255,100,130,.38)"
              : "var(--mx-border, #393052)"
          ),
          background: danger
            ? "rgba(255,70,110,.10)"
            : "var(--mx-panel, #211b37)",
          color: danger
            ? "#ffb5c5"
            : "var(--mx-text, #f6f3ff)",
          fontFamily: "inherit",
          fontSize: "14px",
          fontWeight: "650",
          textAlign: "left",
          cursor: "pointer",
          transition: "background .18s ease, border-color .18s ease"
        });

        button.addEventListener("click", callback);
        panel.appendChild(button);

        return button;
      }

      /* =================================================
         HEADER MENU
         ================================================= */

      function showMenuHeader() {
        const headingRow = document.createElement("div");

        Object.assign(headingRow.style, {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "10px"
        });

        const title = document.createElement("h3");

        title.textContent = "Menu Postingan";

        Object.assign(title.style, {
          margin: "0",
          color: "var(--mx-text, #ffffff)",
          fontSize: "19px",
          fontWeight: "800"
        });

        const closeButton = document.createElement("button");

        closeButton.type = "button";
        closeButton.textContent = "×";
        closeButton.setAttribute("aria-label", "Tutup menu");

        Object.assign(closeButton.style, {
          width: "35px",
          height: "35px",
          flex: "0 0 35px",
          borderRadius: "50%",
          border: "1px solid var(--mx-border, #393052)",
          background: "var(--mx-panel, #211b37)",
          color: "var(--mx-text, #ffffff)",
          fontSize: "23px",
          cursor: "pointer"
        });

        closeButton.addEventListener("click", closeMenu);

        headingRow.append(title, closeButton);
        panel.appendChild(headingRow);

        const description = document.createElement("p");

        description.textContent = isOwner
          ? "Postingan ini milik akun kamu."
          : "Kamu sedang melihat postingan pengguna lain.";

        Object.assign(description.style, {
          margin: "0 0 14px",
          color: "var(--mx-muted, #b9b1d0)",
          fontSize: "13px",
          lineHeight: "1.55"
        });

        panel.appendChild(description);
      }

      /* =================================================
         EDIT LANGSUNG DI KARTU POSTINGAN
         ================================================= */

      async function showEditor() {
        if (!isOwner) {
          closeMenu();

          showToast(
            "Kamu hanya bisa mengedit postingan milik sendiri.",
            true
          );

          return;
        }

        // Verifikasi ulang pemilik.
        try {
          const fresh = await getPostContext(post.id);

          if (
            !fresh.isOwner ||
            fresh.viewerId !== viewerId ||
            fresh.ownerId !== ownerId
          ) {
            closeMenu();

            showToast(
              "Hak pemilik postingan tidak terverifikasi.",
              true
            );

            return;
          }
        } catch (error) {
          console.error(
            "MEXA gagal memeriksa pemilik:",
            error
          );

          showToast(
            "Gagal memeriksa akun. Coba lagi.",
            true
          );

          return;
        }

        const card = document.getElementById(
          "post-" + post.id
        );

        if (!card) {
          closeMenu();

          showToast(
            "Kartu postingan tidak ditemukan.",
            true
          );

          return;
        }

        const contentElement = card.querySelector(
          ".mx-post-content"
        );

        if (!contentElement) {
          closeMenu();

          showToast(
            "Isi postingan tidak ditemukan.",
            true
          );

          return;
        }

        if (
          card.querySelector(".mx-post-inline-editor")
        ) {
          closeMenu();
          return;
        }

        const originalDisplay =
          contentElement.style.display;

        const editor = document.createElement("section");

        editor.className = "mx-post-inline-editor";
        editor.setAttribute(
          "aria-label",
          "Edit postingan MEXA"
        );

        Object.assign(editor.style, {
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          margin: "12px 0",
          padding: "16px",
          borderRadius: "16px",
          border: "1px solid var(--mx-secondary, #8b5cf6)",
          background: "var(--mx-panel, #211a35)",
          color: "var(--mx-text, #ffffff)",
          boxShadow: "0 12px 30px rgba(0,0,0,.18)"
        });

        const heading = document.createElement("div");

        heading.className = "mx-post-edit-heading";

        Object.assign(heading.style, {
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          marginBottom: "12px"
        });

        const headingText = document.createElement("div");

        headingText.className = "mx-post-edit-heading-text";
        headingText.textContent = "✏️ Edit postingan";

        Object.assign(headingText.style, {
          fontSize: "16px",
          fontWeight: "800"
        });

        const badge = document.createElement("span");

        badge.className = "mx-post-edit-badge";
        badge.textContent = "POSTINGAN KAMU";

        Object.assign(badge.style, {
          padding: "5px 8px",
          borderRadius: "20px",
          border: "1px solid rgba(139,92,246,.4)",
          background: "rgba(139,92,246,.12)",
          color: "var(--mx-primary, #00e5ff)",
          fontSize: "10px",
          fontWeight: "800",
          letterSpacing: ".5px"
        });

        heading.append(headingText, badge);

        // Kolom edit langsung di dalam kartu.
        const textarea = document.createElement("textarea");

        textarea.className = "mx-post-inline-textarea";
        textarea.value = contentElement.textContent || "";
        textarea.placeholder = "Tulis perubahan postingan...";
        textarea.setAttribute("aria-label", "Isi postingan");
        textarea.spellcheck = true;

        Object.assign(textarea.style, {
          display: "block",
          width: "100%",
          minHeight: "135px",
          boxSizing: "border-box",
          padding: "13px 14px",
          resize: "vertical",
          color: "var(--mx-text, #ffffff)",
          background: "var(--mx-bg, #0b0818)",
          border: "1px solid var(--mx-border, #393052)",
          borderRadius: "12px",
          outline: "none",
          fontFamily: "inherit",
          fontSize: "15px",
          lineHeight: "1.7"
        });

        const hint = document.createElement("div");

        hint.className = "mx-post-edit-hint";
        hint.textContent =
          "Edit isi postinganmu di sini. Tekan Simpan perubahan untuk menerbitkan.";

        Object.assign(hint.style, {
          marginTop: "8px",
          color: "var(--mx-muted, #aaa4c2)",
          fontSize: "12px",
          lineHeight: "1.5"
        });

        const status = document.createElement("div");

        status.className = "mx-post-edit-status";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");

        Object.assign(status.style, {
          minHeight: "18px",
          marginTop: "9px",
          color: "var(--mx-primary, #00e5ff)",
          fontSize: "12px",
          lineHeight: "1.5"
        });

        const footer = document.createElement("div");

        footer.className = "mx-post-edit-footer";

        Object.assign(footer.style, {
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "flex-end",
          gap: "8px",
          marginTop: "12px"
        });

        const cancelButton = document.createElement("button");

        cancelButton.type = "button";
        cancelButton.className = "mx-post-edit-cancel";
        cancelButton.textContent = "Batal";

        const saveButton = document.createElement("button");

        saveButton.type = "button";
        saveButton.className = "mx-post-edit-save";
        saveButton.textContent = "Simpan perubahan";

        Object.assign(cancelButton.style, {
          minHeight: "40px",
          padding: "10px 14px",
          borderRadius: "11px",
          border: "1px solid var(--mx-border, #393052)",
          background: "var(--mx-card, #151025)",
          color: "var(--mx-text, #ffffff)",
          fontFamily: "inherit",
          fontSize: "13px",
          fontWeight: "700",
          cursor: "pointer"
        });

        Object.assign(saveButton.style, {
          minHeight: "40px",
          padding: "10px 14px",
          borderRadius: "11px",
          border: "1px solid var(--mx-primary, #00e5ff)",
          background: "var(--mx-primary, #00e5ff)",
          color: "#07111b",
          fontFamily: "inherit",
          fontSize: "13px",
          fontWeight: "800",
          cursor: "pointer"
        });

        footer.append(cancelButton, saveButton);

        editor.append(
          heading,
          textarea,
          hint,
          status,
          footer
        );

        contentElement.insertAdjacentElement(
          "afterend",
          editor
        );

        contentElement.style.display = "none";

        closeMenu();

        function cancelEditing() {
          contentElement.style.display = originalDisplay;
          editor.remove();
        }

        cancelButton.addEventListener(
          "click",
          cancelEditing
        );

        textarea.addEventListener(
          "keydown",
          function (event) {
            if (event.key === "Escape") {
              cancelEditing();
            }

            if (
              event.key === "Enter" &&
              (event.ctrlKey || event.metaKey)
            ) {
              event.preventDefault();
              saveButton.click();
            }
          }
        );

        // SIMPAN POSTINGAN.
        saveButton.addEventListener(
          "click",
          async function () {
            if (saveButton.disabled) return;

            const newContent = textarea.value.trim();

            if (!newContent) {
              status.textContent =
                "Isi postingan tidak boleh kosong.";

              status.style.color = "#ff7085";
              textarea.focus();

              return;
            }

            saveButton.disabled = true;
            cancelButton.disabled = true;
            saveButton.textContent = "Menyimpan...";

            status.style.color =
              "var(--mx-primary, #00e5ff)";

            status.textContent =
              "Memeriksa akun dan menyimpan perubahan...";

            try {
              const latest =
                await getPostContext(post.id);

              if (
                !latest.isOwner ||
                latest.viewerId !== viewerId ||
                latest.ownerId !== ownerId
              ) {
                throw new Error(
                  "Akun login bukan pemilik postingan ini."
                );
              }

              const result = await latest.client
                .from("posts")
                .update({
                  content: newContent
                })
                .eq("id", post.id)
                .eq("user_id", viewerId)
                .select("id,content")
                .maybeSingle();

              if (result.error) {
                throw result.error;
              }

              if (!result.data) {
                throw new Error(
                  "Penyimpanan ditolak. Periksa izin RLS Supabase."
                );
              }

              // Perbarui isi kartu tanpa memuat ulang seluruh feed.
              contentElement.textContent =
                result.data.content;

              contentElement.style.display =
                originalDisplay;

              post.content = result.data.content;

              // Perbarui cache feed jika tersedia.
              if (Array.isArray(window.MEXA_POSTS)) {
                window.MEXA_POSTS =
                  window.MEXA_POSTS.map(function (item) {
                    return String(item.id) === String(post.id)
                      ? Object.assign({}, item, {
                          content: result.data.content
                        })
                      : item;
                  });
              }

              editor.remove();

              showToast(
                "✓ Perubahan postingan berhasil disimpan.",
                false
              );
            } catch (error) {
              console.error(
                "MEXA gagal menyimpan edit:",
                error
              );

              status.textContent =
                error.message ||
                "Gagal menyimpan perubahan.";

              status.style.color = "#ff7085";

              saveButton.disabled = false;
              cancelButton.disabled = false;
              saveButton.textContent = "Coba simpan lagi";
            }
          }
        );

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

        icon.textContent = "🗑️";

        Object.assign(icon.style, {
          fontSize: "34px",
          textAlign: "center",
          marginBottom: "8px"
        });

        const title = document.createElement("h3");

        title.textContent = "Hapus postingan?";

        Object.assign(title.style, {
          margin: "0",
          fontSize: "19px",
          textAlign: "center",
          color: "var(--mx-text, #ffffff)"
        });

        const description = document.createElement("p");

        description.textContent =
          "Postingan ini akan dihapus dari MEXA. Tindakan ini tidak dapat dibatalkan.";

        Object.assign(description.style, {
          margin: "12px 0 16px",
          color: "var(--mx-muted, #aaa4c2)",
          fontSize: "13px",
          lineHeight: "1.6",
          textAlign: "center"
        });

        panel.append(icon, title, description);

        const cancelButton = makeButton(
          "Batal",
          function () {
            showMenu();
          }
        );

        const deleteButton = makeButton(
          "🗑️ Ya, hapus postingan",
          async function () {
            if (deleteButton.disabled) return;

            deleteButton.disabled = true;
            cancelButton.disabled = true;
            deleteButton.textContent = "Menghapus...";

            try {
              const fresh =
                await getPostContext(post.id);

              if (
                !fresh.isOwner ||
                fresh.viewerId !== viewerId ||
                fresh.ownerId !== ownerId
              ) {
                throw new Error(
                  "Akun login bukan pemilik postingan."
                );
              }

              const result = await fresh.client
                .from("posts")
                .delete()
                .eq("id", post.id)
                .eq("user_id", viewerId)
                .select("id")
                .maybeSingle();

              if (result.error) {
                throw result.error;
              }

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
                window.MEXA_POSTS =
                  window.MEXA_POSTS.filter(function (item) {
                    return String(item.id) !== String(post.id);
                  });
              }

              try {
                await refreshFeed();
              } catch (refreshError) {
                console.warn(
                  "MEXA gagal menyegarkan feed setelah penghapusan:",
                  refreshError
                );
              }

              showToast(
                "Postingan berhasil dihapus.",
                false
              );
            } catch (error) {
              console.error(
                "MEXA gagal menghapus postingan:",
                error
              );

              showToast(
                error.message ||
                "Postingan gagal dihapus.",
                true
              );

              showMenu();
            }
          },
          true
        );

        cancelButton.style.textAlign = "center";
        cancelButton.style.justifyContent = "center";

        deleteButton.style.textAlign = "center";
        deleteButton.style.justifyContent = "center";
      }

      /* =================================================
         MENU UTAMA
         ================================================= */

      function showMenu() {
        panel.replaceChildren();

        const headingRow = document.createElement("div");

        Object.assign(headingRow.style, {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "10px"
        });

        const title = document.createElement("h3");

        title.textContent = "Menu Postingan";

        Object.assign(title.style, {
          margin: "0",
          fontSize: "19px",
          fontWeight: "800",
          color: "var(--mx-text, #ffffff)"
        });

        const closeButton = document.createElement("button");

        closeButton.type = "button";
        closeButton.textContent = "×";
        closeButton.setAttribute("aria-label", "Tutup menu");

        Object.assign(closeButton.style, {
          width: "35px",
          height: "35px",
          flex: "0 0 35px",
          borderRadius: "50%",
          border: "1px solid var(--mx-border, #393052)",
          background: "var(--mx-panel, #211b37)",
          color: "var(--mx-text, #ffffff)",
          fontSize: "23px",
          cursor: "pointer"
        });

        closeButton.addEventListener("click", closeMenu);

        headingRow.append(title, closeButton);
        panel.appendChild(headingRow);

        const description = document.createElement("p");

        description.textContent = isOwner
          ? "Postingan ini milik akun kamu."
          : "Kamu sedang melihat postingan pengguna lain.";

        Object.assign(description.style, {
          margin: "0 0 14px",
          color: "var(--mx-muted, #aaa4c2)",
          fontSize: "13px",
          lineHeight: "1.55"
        });

        panel.appendChild(description);

        // BAGIKAN KE TEMAN.
        makeButton(
          "👤  Bagikan ke Teman",
          function () {
            closeMenu();

            if (
              typeof window.openShareToFriend === "function"
            ) {
              window.openShareToFriend(post);
            } else {
              showToast(
                "Fitur Bagikan ke Teman belum terhubung.",
                true
              );
            }
          }
        );

        // BAGIKAN KE GRUP.
        makeButton(
          "👨‍👩‍👧  Bagikan ke Grup",
          function () {
            closeMenu();

            if (
              typeof window.openShareToGroup === "function"
            ) {
              window.openShareToGroup(post);
            } else {
              showToast(
                "Fitur Bagikan ke Grup belum terhubung.",
                true
              );
            }
          }
        );

        // SALIN TAUTAN.
        makeButton(
          "🔗  Salin tautan",
          async function () {
            const url = new URL(window.location.href);

            url.hash = "post-" + post.id;

            try {
              if (
                navigator.clipboard &&
                window.isSecureContext
              ) {
                await navigator.clipboard.writeText(
                  url.href
                );

                closeMenu();

                showToast(
                  "Tautan postingan berhasil disalin.",
                  false
                );
              } else {
                closeMenu();

                window.prompt(
                  "Salin tautan postingan:",
                  url.href
                );
              }
            } catch (error) {
              console.error(
                "MEXA gagal menyalin tautan:",
                error
              );

              closeMenu();

              window.prompt(
                "Salin tautan postingan:",
                url.href
              );
            }
          }
        );

        if (isOwner) {
          // EDIT HANYA UNTUK PEMILIK.
          makeButton(
            "✏️  Edit postingan",
            function () {
              showEditor();
            }
          );

          // HAPUS HANYA UNTUK PEMILIK.
          makeButton(
            "🗑️  Hapus postingan",
            function () {
              showDeleteConfirmation();
            },
            true
          );
        } else {
          // LAPOR HANYA UNTUK PENGUNJUNG.
          makeButton(
            "⚑  Laporkan postingan",
            function () {
              closeMenu();

              if (
                typeof window.openReportPost === "function"
              ) {
                window.openReportPost(post);
              } else {
                showToast(
                  "Fitur laporan belum terhubung ke sistem moderasi.",
                  true
                );
              }
            },
            true
          );
        }

        makeButton("Tutup", closeMenu);
      }

      showMenu();
    } catch (error) {
      console.error(
        "MEXA POST SYSTEM gagal membuka menu:",
        error
      );

      showToast(
        "Menu gagal dibuka. Periksa sesi login dan akses postingan.",
        true
      );
    }
  }

  /* =====================================================
     SAMBUNGAN UNTUK functions-post.js
     ===================================================== */

  window.MEXA_POST_SYSTEM = {
    version: VERSION,
    openMenu: openMenu,
    getPostContext: getPostContext
  };

  // Kompatibilitas untuk kode lama.
  window.openPostMenu = openMenu;

  console.log(
    "MEXA POST SYSTEM CONTROL " + VERSION + " aktif."
  );

})(window, document);
