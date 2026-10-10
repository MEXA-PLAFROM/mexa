
/* =====================================================
   MEXA POST SYSTEM CONTROL
   Versi 2.0.0
   Pemilik, pengunjung, menu, edit, hapus, dan bagikan.
   ===================================================== */

(function (window, document) {
  "use strict";

  // Hindari memuat versi yang sama dua kali.
  if (
    window.MEXA_POST_SYSTEM &&
    window.MEXA_POST_SYSTEM.version === "2.0.0"
  ) {
    console.warn("MEXA POST SYSTEM CONTROL sudah aktif.");
    return;
  }

  const VERSION = "2.0.0";

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
     BACA IDENTITAS LOGIN DAN PEMILIK POSTINGAN
     ===================================================== */

  async function getPostContext(postId) {
    const client = getClient();

    const sessionResponse = await client.auth.getSession();

    if (sessionResponse.error) {
      throw sessionResponse.error;
    }

    const session =
      sessionResponse.data &&
      sessionResponse.data.session;

    const viewer =
      session && session.user
        ? session.user
        : null;

    // Pemilik diambil langsung dari database.
    const postResponse = await client
      .from("posts")
      .select("id,user_id,content,image_url,created_at")
      .eq("id", postId)
      .maybeSingle();

    if (postResponse.error) {
      throw postResponse.error;
    }

    const post = postResponse.data;

    if (!post) {
      throw new Error(
        "Postingan tidak ditemukan atau tidak bisa dibaca."
      );
    }

    const viewerId =
      viewer && viewer.id
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

    // Catat hasil pemeriksaan tanpa mencetak ID pengguna.
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
     MUAT ULANG FEED SETELAH AKSI
     ===================================================== */

  function refreshFeed() {
    if (
      window.MEXAPosts &&
      typeof window.MEXAPosts.load === "function"
    ) {
      return window.MEXAPosts.load();
    }

    if (typeof window.MEXA_LOAD_FEED === "function") {
      return window.MEXA_LOAD_FEED();
    }

    return Promise.resolve([]);
  }

  /* =====================================================
     PESAN STATUS PREMIUM
     ===================================================== */

  function makeStatusNotice(card, message, isError) {
    const notice = document.createElement("div");

    notice.className = isError
      ? "mx-post-edit-success is-error"
      : "mx-post-edit-success";

    notice.setAttribute("role", "status");
    notice.textContent = message;

    const header = card.querySelector(".mx-post-header");

    if (header && header.parentNode === card) {
      header.insertAdjacentElement("afterend", notice);
    } else {
      card.insertAdjacentElement("afterbegin", notice);
    }

    window.setTimeout(function () {
      if (notice.parentNode) {
        notice.remove();
      }
    }, 3500);
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

      // Tutup menu sebelumnya jika masih terbuka.
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

      // Latar menu.
      const overlay = document.createElement("div");

      overlay.id = "mexa-post-menu-overlay";
      overlay.setAttribute("role", "presentation");

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
        backdropFilter: "blur(7px)",
        WebkitBackdropFilter: "blur(7px)"
      });

      // Panel menu.
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
        if (event.target === overlay) {
          closeMenu();
        }
      });

      panel.addEventListener("click", function (event) {
        event.stopPropagation();
      });

      document.addEventListener(
        "keydown",
        handleEscape
      );

      /* =================================================
         PEMBUAT TOMBOL MENU
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
              ? "#743649"
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
          cursor: "pointer"
        });

        button.addEventListener("click", callback);
        panel.appendChild(button);

        return button;
      }

      /* =================================================
         EDITOR LANGSUNG DI KARTU POSTINGAN
         Dibuat sebelum showMenu agar dapat dipanggil menu.
         ================================================= */

      async function showEditor() {
        if (!isOwner) {
          alert(
            "Kamu hanya bisa mengedit postingan milik sendiri."
          );

          closeMenu();
          return;
        }

        // Periksa ulang pemilik sebelum membuka editor.
        try {
          const fresh = await getPostContext(post.id);

          if (
            !fresh.isOwner ||
            fresh.viewerId !== viewerId ||
            fresh.ownerId !== ownerId
          ) {
            alert(
              "Hak pemilik postingan tidak terverifikasi."
            );

            closeMenu();
            return;
          }
        } catch (error) {
          console.error(
            "MEXA gagal memeriksa pemilik:",
            error
          );

          alert("Gagal memeriksa akun. Coba lagi.");
          return;
        }

        const card = document.getElementById(
          "post-" + post.id
        );

        if (!card) {
          closeMenu();
          alert("Kartu postingan tidak ditemukan.");
          return;
        }

        const contentElement = card.querySelector(
          ".mx-post-content"
        );

        if (!contentElement) {
          closeMenu();
          alert("Isi postingan tidak ditemukan.");
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

        // Buat editor di dalam kartu yang sama.
        const editor = document.createElement("section");

        editor.className = "mx-post-inline-editor";
        editor.setAttribute(
          "aria-label",
          "Edit postingan MEXA"
        );

        const heading = document.createElement("div");
        heading.className = "mx-post-edit-heading";

        const headingText = document.createElement("div");

        headingText.className =
          "mx-post-edit-heading-text";

        headingText.textContent = "✏️ Edit postingan";

        const badge = document.createElement("span");

        badge.className = "mx-post-edit-badge";
        badge.textContent = "POSTINGAN KAMU";

        heading.append(headingText, badge);

        // Area untuk mengetik langsung.
        const textarea = document.createElement("textarea");

        textarea.className = "mx-post-inline-textarea";
        textarea.value =
          contentElement.textContent ||
          post.content ||
          "";

        textarea.placeholder = "Tulis perubahan postingan...";

        textarea.setAttribute(
          "aria-label",
          "Isi postingan"
        );

        textarea.spellcheck = true;

        const hint = document.createElement("div");

        hint.className = "mx-post-edit-hint";

        hint.textContent =
          "Edit tulisan di sini. Perubahan akan tersimpan setelah kamu menekan Simpan.";

        const status = document.createElement("div");

        status.className = "mx-post-edit-status";
        status.setAttribute("role", "status");

        status.setAttribute(
          "aria-live",
          "polite"
        );

        const footer = document.createElement("div");
        footer.className = "mx-post-edit-footer";

        const cancelButton =
          document.createElement("button");

        cancelButton.type = "button";
        cancelButton.className = "mx-post-edit-cancel";
        cancelButton.textContent = "Batal";

        const saveButton =
          document.createElement("button");

        saveButton.type = "button";
        saveButton.className = "mx-post-edit-save";

        saveButton.textContent = "Simpan perubahan";

        footer.append(cancelButton, saveButton);

        editor.append(
          heading,
          textarea,
          hint,
          status,
          footer
        );

        // Sembunyikan teks lama sementara editor aktif.
        contentElement.insertAdjacentElement(
          "afterend",
          editor
        );

        contentElement.style.display = "none";

        closeMenu();

        function cancelEditing() {
          contentElement.style.display =
            originalDisplay;

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

        // SIMPAN EDIT
        saveButton.addEventListener(
          "click",
          async function () {
            if (saveButton.disabled) return;

            const newContent =
              textarea.value.trim();

            if (!newContent) {
              status.textContent =
                "Isi postingan tidak boleh kosong.";

              status.classList.add("is-error");
              textarea.focus();

              return;
            }

            saveButton.disabled = true;
            cancelButton.disabled = true;

            saveButton.textContent = "Menyimpan...";

            status.classList.remove("is-error");

            status.textContent =
              "Memeriksa akun dan menyimpan perubahan...";

            try {
              // Validasi ulang agar pengunjung tidak dapat mengedit.
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

              // Perbarui kartu yang sama tanpa memuat ulang feed.
              contentElement.textContent =
                result.data.content;

              contentElement.style.display =
                originalDisplay;

              post.content = result.data.content;

              editor.remove();

              makeStatusNotice(
                card,
                "✓ Perubahan postingan tersimpan",
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

              status.classList.add("is-error");

              saveButton.disabled = false;
              cancelButton.disabled = false;

              saveButton.textContent =
                "Coba simpan lagi";
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
         ISI MENU TITIK TIGA
         ================================================= */

      function showMenu() {
        panel.replaceChildren();

        // Header menu.
        const headingRow =
          document.createElement("div");

        headingRow.className = "mx-post-menu-heading";

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
          color: "var(--mx-text, #fff)"
        });

        const closeButton =
          document.createElement("button");

        closeButton.type = "button";
        closeButton.className = "mx-post-menu-close";
        closeButton.textContent = "×";

        closeButton.setAttribute(
          "aria-label",
          "Tutup menu"
        );

        Object.assign(closeButton.style, {
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          border: "1px solid var(--mx-border, #393052)",
          background: "var(--mx-panel, #211b37)",
          color: "var(--mx-text, #fff)",
          fontSize: "23px",
          cursor: "pointer"
        });

        closeButton.addEventListener(
          "click",
          closeMenu
        );

        headingRow.append(title, closeButton);
        panel.appendChild(headingRow);

        // Keterangan pemilik/pengunjung.
        const description =
          document.createElement("p");

        description.textContent = isOwner
          ? "Postingan ini milik akun kamu."
          : "Kamu sedang melihat postingan pengguna lain.";

        Object.assign(description.style, {
          margin: "0 0 14px",
          color: "var(--mx-muted, #b9b1d0)",
          fontSize: "13px",
          lineHeight: "1.5"
        });

        panel.appendChild(description);

        // BAGIKAN KE TEMAN
        makeButton(
          "👤  Bagikan ke Teman",
          function () {
            closeMenu();

            if (
              typeof window.openShareToFriend ===
              "function"
            ) {
              window.openShareToFriend(post);
            } else {
              alert(
                "Fitur Bagikan ke Teman belum terhubung."
              );
            }
          }
        );

        // BAGIKAN KE GRUP
        makeButton(
          "👨‍👩‍👧  Bagikan ke Grup",
          function () {
            closeMenu();

            if (
              typeof window.openShareToGroup ===
              "function"
            ) {
              window.openShareToGroup(post);
            } else {
              alert(
                "Fitur Bagikan ke Grup belum terhubung."
              );
            }
          }
        );

        // SALIN TAUTAN
        makeButton(
          "🔗  Salin tautan",
          async function () {
            const url = new URL(
              window.location.href
            );

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

                alert(
                  "Tautan postingan berhasil disalin."
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
          // EDIT HANYA UNTUK PEMILIK
          makeButton(
            "✏️  Edit postingan",
            function () {
              showEditor();
            }
          );

          // HAPUS HANYA UNTUK PEMILIK
          makeButton(
            "🗑️  Hapus postingan",
            async function () {
              const confirmed = window.confirm(
                "Yakin ingin menghapus postingan ini?"
              );

              if (!confirmed) return;

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

                await refreshFeed();

                alert(
                  "Postingan berhasil dihapus."
                );
              } catch (error) {
                console.error(
                  "MEXA gagal menghapus postingan:",
                  error
                );

                alert(
                  "Postingan gagal dihapus. Pastikan kamu pemiliknya dan izin RLS aktif."
                );
              }
            },
            true
          );
        } else {
          // LAPORKAN UNTUK PENGUNJUNG
          makeButton(
            "⚑  Laporkan postingan",
            function () {
              closeMenu();

              if (
                typeof window.openReportPost ===
                "function"
              ) {
                window.openReportPost(post);
              } else {
                alert(
                  "Fitur laporan belum terhubung ke sistem moderasi MEXA."
                );
              }
            }
          );
        }

        makeButton("Tutup", closeMenu);
      }

      // Buka menu setelah semua fungsi siap.
      showMenu();
    } catch (error) {
      console.error(
        "MEXA POST SYSTEM gagal membuka menu:",
        error
      );

      alert(
        "Menu gagal dibuka. Periksa sesi login dan akses postingan."
      );
    }
  }

  /* =====================================================
     API GLOBAL KONTROL POSTINGAN
     ===================================================== */

  window.MEXA_POST_SYSTEM = {
    version: VERSION,
    openMenu: openMenu,
    getPostContext: getPostContext
  };

  // Kompatibilitas dengan tombol titik tiga lama.
  window.openPostMenu = openMenu;

  console.log(
    "MEXA POST SYSTEM CONTROL " + VERSION + " aktif."
  );

})(window, document);
