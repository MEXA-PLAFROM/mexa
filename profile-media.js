
/* =====================================================
   MEXA MEDIA — FOTO & VIDEO
   Tema: Midnight, Arctic, Emerald, Sunset, Cyberpunk
   Bucket Supabase: media
   ===================================================== */

(function (window, document) {
  "use strict";

  if (window.MEXA_MEDIA_LOADED) return;
  window.MEXA_MEDIA_LOADED = true;

  const BUCKET = "media";
  const MAX_BYTES = 50 * 1024 * 1024;

  let selectedFile = null;
  let input = null;
  let preview = null;
  let notice = null;
  let busy = false;
  let objectUrl = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function getClient() {
    const client = window.mexaSupabase;

    if (
      !client ||
      !client.auth ||
      !client.storage ||
      !client.from
    ) {
      throw new Error(
        "Koneksi Supabase belum siap. Periksa auth-client.js."
      );
    }

    return client;
  }

  function showStatus(message, isError) {
    const target = notice || byId("mexaFeedStatus");
    if (!target) return;

    target.textContent = message || "";
    target.hidden = !message;
    target.classList.toggle("mx-media-error", !!isError);
    target.classList.toggle(
      "mx-media-success",
      !!message && !isError
    );

    target.setAttribute("role", isError ? "alert" : "status");
    target.setAttribute("aria-live", "polite");
  }

  function revokePreview() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  }

  function clearSelection() {
    selectedFile = null;
    revokePreview();

    if (input) input.value = "";

    if (preview) {
      preview.replaceChildren();
      preview.hidden = true;
    }
  }

  function ensureUI() {
    const composer =
      byId("mexa-composer") ||
      byId("mexaPostContent")?.parentElement;

    if (!composer) return;

    notice = byId("mexaMediaStatus");

    if (!notice) {
      notice = document.createElement("div");
      notice.id = "mexaMediaStatus";
      notice.className = "mx-media-status";
      notice.hidden = true;
      composer.appendChild(notice);
    }

    input = byId("mexaMediaInput");

    if (!input) {
      input = document.createElement("input");
      input.id = "mexaMediaInput";
      input.type = "file";
      input.accept = "image/jpeg,video/mp4";
      input.hidden = true;
      input.tabIndex = -1;
      input.setAttribute(
        "aria-label",
        "Pilih foto atau video"
      );
      composer.appendChild(input);
    }

    preview = byId("mexaMediaPreview");

    if (!preview) {
      preview = document.createElement("div");
      preview.id = "mexaMediaPreview";
      preview.className = "mx-media-preview";
      preview.hidden = true;
      composer.appendChild(preview);
    }

    input.removeEventListener("change", onFileSelected);
    input.addEventListener("change", onFileSelected);
  }

  function onFileSelected() {
    const file = input?.files?.[0];
    if (!file) return;

    const isImage = file.type === "image/jpeg";
    const isVideo = file.type === "video/mp4";

    if (!isImage && !isVideo) {
      clearSelection();
      showStatus(
        "Pilih foto JPG/JPEG atau video MP4.",
        true
      );
      return;
    }

    if (file.size > MAX_BYTES) {
      clearSelection();
      showStatus(
        "Ukuran maksimal file adalah 50 MB.",
        true
      );
      return;
    }

    selectedFile = file;
    revokePreview();

    objectUrl = URL.createObjectURL(file);
    preview.replaceChildren();

    const media = document.createElement(
      isVideo ? "video" : "img"
    );

    media.src = objectUrl;
    media.className = "mx-media-preview-item";

    if (isVideo) {
      media.controls = true;
      media.playsInline = true;
    } else {
      media.alt = "Pratinjau foto";
    }

    const toolbar = document.createElement("div");
    toolbar.className = "mx-media-preview-toolbar";

    const label = document.createElement("span");
    label.textContent =
      (isVideo ? "Video: " : "Foto: ") + file.name;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "mx-media-remove";
    remove.textContent = "Hapus";
    remove.addEventListener("click", function () {
      clearSelection();
      showStatus("Media dibatalkan.", false);
    });

    toolbar.append(label, remove);
    preview.append(media, toolbar);
    preview.hidden = false;

    showStatus("Media siap diposting.", false);
  }

  function openPicker(kind) {
    ensureUI();

    if (!input) {
      showStatus(
        "Form posting tidak ditemukan. Periksa ID formulir.",
        true
      );
      return;
    }

    input.accept =
      kind === "video" ? "video/mp4" : "image/jpeg";

    input.value = "";
    input.click();
  }

  function getButtonKind(button) {
    const label = (
      (button.innerText || button.textContent || "") +
      " " +
      (button.getAttribute("aria-label") || "") +
      " " +
      (button.title || "")
    ).toLowerCase();

    if (/foto|photo|gambar|image/.test(label)) {
      return "photo";
    }

    if (/video/.test(label)) {
      return "video";
    }

    return "";
  }

  function isVideoUrl(url) {
    return /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(
      url || ""
    );
  }

  function fixVideoElements(root) {
    const scope = root || document;

    if (scope.matches?.("img.mx-post-image")) {
      replaceImageWithVideo(scope);
    }

    scope.querySelectorAll?.("img.mx-post-image").forEach(
      replaceImageWithVideo
    );
  }

  function replaceImageWithVideo(img) {
    const url = img.getAttribute("src") || img.src;

    if (!isVideoUrl(url)) return;

    const video = document.createElement("video");
    video.className = "mx-post-image mx-post-video";
    video.src = url;
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.style.width = "100%";
    video.style.maxHeight = "520px";
    video.style.objectFit = "contain";

    img.replaceWith(video);
  }

  async function uploadAndPost() {
    if (busy || !selectedFile) return;

    const contentBox = byId("mexaPostContent");
    const content = contentBox
      ? contentBox.value.trim()
      : "";

    busy = true;

    const postButton = byId("mexaPostButton");
    const oldText = postButton
      ? postButton.textContent
      : "";

    if (postButton) {
      postButton.disabled = true;
      postButton.textContent = "Mengunggah…";
    }

    showStatus("Sedang mengunggah media ke MEXA…", false);

    try {
      const client = getClient();
      const userResult = await client.auth.getUser();

      if (userResult.error) throw userResult.error;

      const user = userResult.data?.user;

      if (!user) {
        throw new Error(
          "Sesi login tidak ditemukan. Silakan login kembali."
        );
      }

      const file = selectedFile;
      const ext = (
        file.name.split(".").pop() || "bin"
      ).toLowerCase().replace(/[^a-z0-9]/g, "");

      const path =
        user.id +
        "/" +
        Date.now() +
        "-" +
        Math.random().toString(36).slice(2, 9) +
        "." +
        ext;

      const upload = await client.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        });

      if (upload.error) throw upload.error;

      const publicResult = client.storage
        .from(BUCKET)
        .getPublicUrl(upload.data.path);

      const mediaUrl =
        publicResult?.data?.publicUrl;

      if (!mediaUrl) {
        throw new Error(
          "URL media Supabase tidak tersedia."
        );
      }

      showStatus(
        "Media berhasil diunggah. Menyimpan postingan…",
        false
      );

      const inserted = await client
        .from("posts")
        .insert({
          user_id: user.id,
          content: content,
          image_url: mediaUrl
        })
        .select(
          "id,user_id,content,image_url,created_at"
        )
        .single();

      if (inserted.error) throw inserted.error;

      if (contentBox) contentBox.value = "";

      clearSelection();

      if (
        window.MEXAPosts &&
        typeof window.MEXAPosts.load === "function"
      ) {
        await window.MEXAPosts.load();
      } else if (typeof window.loadPosts === "function") {
        await window.loadPosts();
      }

      fixVideoElements(document);

      showStatus(
        "Berhasil! Postingan tersimpan dan Beranda diperbarui.",
        false
      );

    } catch (error) {
      console.error("MEXA upload gagal:", error);

      showStatus(
        "Upload gagal: " +
          (error?.message || "Kesalahan tidak diketahui"),
        true
      );

    } finally {
      busy = false;

      if (postButton) {
        postButton.disabled = false;
        postButton.textContent = oldText || "Posting";
      }
    }
  }

  // Tombol Foto dan Video
  document.addEventListener("click", function (event) {
    const button = event.target.closest(
      ".mx-create-buttons button"
    );

    if (!button) return;

    const kind = getButtonKind(button);
    if (!kind) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    openPicker(kind);
  }, true);

  // Tombol Posting: proses media hanya jika ada file terpilih.
  document.addEventListener("click", function (event) {
    const button = event.target.closest("#mexaPostButton");

    if (!button || !selectedFile) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    uploadAndPost();
  }, true);

  function init() {
    ensureUI();
    fixVideoElements(document);

    const feed = byId("mexaFeedList");

    if (feed && window.MutationObserver) {
      new MutationObserver(function (records) {
        records.forEach(function (record) {
          record.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) {
              fixVideoElements(node);
            }
          });
        });
      }).observe(feed, {
        childList: true,
        subtree: true
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }

  window.MEXAMedia = {
    clear: clearSelection,
    refreshVideos: function () {
      fixVideoElements(document);
    }
  };
})(window, document);
