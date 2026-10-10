
(function () {
  "use strict";

  if (window.MEXAPostOwnerActions) return;

  let modal = null;
  let activePost = null;
  let busy = false;

  function notify(message, isError = false) {
    if (typeof window.showToast === "function") {
      window.showToast(message, isError ? "error" : "success");
    } else {
      (isError ? console.error : console.info)("MEXA:", message);
    }
  }

  function getId(post) {
    if (typeof post === "string" || typeof post === "number") {
      return String(post);
    }
    return String(post?.id || post?.post_id || post?.postId || "");
  }

  async function isOwner(post) {
    const user = await window.MEXAApi.currentUser();
    const ownerId = post?.user_id || post?.userId ||
      post?.author_id || post?.authorId;

    return Boolean(user && ownerId && user.id === ownerId);
  }

  function closeEditor() {
    if (modal) modal.remove();
    modal = null;
    activePost = null;
    busy = false;
  }

  function makeEditor(post) {
    closeEditor();
    activePost = post;

    modal = document.createElement("div");
    modal.className = "mexa-owner-overlay";
    modal.innerHTML = `
      <section class="mexa-owner-dialog"
        role="dialog" aria-modal="true"
        aria-labelledby="mexa-owner-title">
        <header class="mexa-owner-header">
          <div>
            <h2 id="mexa-owner-title">Edit postingan</h2>
            <p>Perubahan akan tersimpan di MEXA.</p>
          </div>
          <button type="button" data-close
            aria-label="Tutup editor">✕</button>
        </header>

        <label for="mexa-owner-content">Isi postingan</label>
        <textarea id="mexa-owner-content"
          rows="7" maxlength="20000"></textarea>

        <p class="mexa-owner-status" aria-live="polite"></p>

        <footer class="mexa-owner-footer">
          <button type="button" data-close>Batal</button>
          <button type="button" data-save>Simpan perubahan</button>
        </footer>
      </section>
    `;

    if (!document.getElementById("mexa-owner-style")) {
      const style = document.createElement("style");
      style.id = "mexa-owner-style";
      style.textContent = `
        .mexa-owner-overlay {
          position: fixed; inset: 0; z-index: 999999;
          display: grid; place-items: center; padding: 18px;
          background: rgba(5, 3, 15, .78);
          backdrop-filter: blur(12px);
        }
        .mexa-owner-dialog {
          width: min(100%, 560px); max-height: 90vh;
          overflow: auto; box-sizing: border-box;
          padding: 22px; border-radius: 22px;
          color: #f7f3ff; background: #151126;
          border: 1px solid #393052;
          box-shadow: 0 24px 80px #0009;
          font: inherit;
        }
        .mexa-owner-header, .mexa-owner-footer {
          display: flex; align-items: center;
          justify-content: space-between; gap: 12px;
        }
        .mexa-owner-header { margin-bottom: 20px; }
        .mexa-owner-header h2 { margin: 0 0 5px; font-size: 21px; }
        .mexa-owner-header p { margin: 0; color: #b8afce; font-size: 13px; }
        .mexa-owner-dialog label { display: block; margin-bottom: 8px; }
        .mexa-owner-dialog textarea {
          box-sizing: border-box; width: 100%; resize: vertical;
          min-height: 150px; padding: 14px; border-radius: 14px;
          color: #fff; background: #0c0918;
          border: 1px solid #40365b; font: inherit;
        }
        .mexa-owner-dialog button {
          cursor: pointer; padding: 10px 14px;
          border-radius: 12px; color: #fff;
          background: #28213e; border: 1px solid #4b4068;
          font: inherit;
        }
        .mexa-owner-dialog [data-save] {
          background: linear-gradient(120deg, #7545db, #4b65d9);
          border: 0; font-weight: 700;
        }
        .mexa-owner-dialog button:disabled { opacity: .55; cursor: wait; }
        .mexa-owner-status { min-height: 20px; color: #c4b5fd; font-size: 13px; }
        .mexa-owner-footer { justify-content: flex-end; margin-top: 16px; }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(modal);

    const textarea = modal.querySelector("#mexa-owner-content");
    textarea.value = post.content || "";

    modal.querySelectorAll("[data-close]").forEach(button => {
      button.addEventListener("click", closeEditor);
    });

    modal.addEventListener("click", event => {
      if (event.target === modal) closeEditor();
    });

    modal.querySelector("[data-save]").addEventListener("click", saveEdit);
    textarea.focus();
  }

  async function editPost(post) {
    if (!window.MEXAApi) {
      notify("MEXA API Client belum dimuat.", true);
      return;
    }

    try {
      if (!(await isOwner(post))) {
        notify("Kamu hanya bisa mengedit postingan milikmu.", true);
        return;
      }

      makeEditor(post);
    } catch (error) {
      notify(error.message || "Gagal membuka editor.", true);
    }
  }

  async function saveEdit() {
    if (busy || !activePost || !modal) return;

    const post = activePost;
    const content = modal.querySelector("#mexa-owner-content").value.trim();
    const status = modal.querySelector(".mexa-owner-status");
    const button = modal.querySelector("[data-save]");

    if (!content && !post.image_url) {
      status.textContent = "Isi postingan tidak boleh kosong.";
      return;
    }

    busy = true;
    button.disabled = true;
    status.textContent = "Menyimpan perubahan...";

    try {
      const result = await window.MEXAApi.request("update_post", {
        post_id: getId(post),
        content,
        ...(post.image_url ? { image_url: post.image_url } : {})
      });

      if (!result.post) {
        throw new Error("Server tidak mengembalikan postingan terbaru.");
      }

      closeEditor();
      await refreshFeed();
      notify("Postingan berhasil diperbarui.");
    } catch (error) {
      busy = false;
      if (button.isConnected) button.disabled = false;
      if (status.isConnected) {
        status.textContent = error.message || "Gagal menyimpan.";
      }
    }
  }

  async function deletePost(postOrId) {
    if (busy) return;

    const postId = getId(postOrId);
    if (!postId) {
      notify("ID postingan tidak ditemukan.", true);
      return;
    }

    let post = typeof postOrId === "object" ? postOrId : null;

    if (!post && Array.isArray(window.MEXA_POSTS)) {
      post = window.MEXA_POSTS.find(item => getId(item) === postId);
    }

    if (!post || !(await isOwner(post))) {
      notify("Postingan tidak ditemukan atau bukan milikmu.", true);
      return;
    }

    if (!window.confirm("Hapus postingan ini secara permanen?")) {
      return;
    }

    busy = true;

    try {
      await window.MEXAApi.request("delete_post", {
        post_id: postId
      });

      await refreshFeed();
      notify("Postingan berhasil dihapus.");
    } catch (error) {
      notify(error.message || "Gagal menghapus postingan.", true);
    } finally {
      busy = false;
    }
  }

  async function refreshFeed() {
    if (typeof window.MEXA_LOAD_FEED === "function") {
      await window.MEXA_LOAD_FEED();
    } else if (window.MEXAPostFeed?.refreshHome) {
      await window.MEXAPostFeed.refreshHome();
    }

    window.dispatchEvent(new CustomEvent("mexa:posts-updated"));
  }

  window.editPost = editPost;
  window.deletePost = deletePost;

  window.MEXAPostOwnerActions = Object.freeze({
    edit: editPost,
    remove: deletePost,
    refresh: refreshFeed
  });

  console.info("MEXA Post Owner Actions siap.");
})();
