
/* =====================================================
   MEXA MEDIA MODULE
   Versi 1.0.0
   Foto/video tanpa mengganti home.js dan functions-post.js
   ===================================================== */

(function (window, document) {
  "use strict";

  if (window.MEXA_MEDIA_MODULE_LOADED) return;
  window.MEXA_MEDIA_MODULE_LOADED = true;

  const BUCKET = "media";
  const MAX_SIZE = 50 * 1024 * 1024;

  let selectedFile = null;
  let previewUrl = null;
  let mediaInput = null;
  let previewPanel = null;
  let busy = false;

  function $(id) {
    return document.getElementById(id);
  }

  function getClient() {
    const client = window.mexaSupabase;

    if (!client || !client.auth || !client.storage) {
      throw new Error(
        "Koneksi Supabase belum tersedia. Periksa auth-client.js."
      );
    }

    return client;
  }

  function status(message, error) {
    const el = $("mexaFeedStatus");

    if (el) {
      el.textContent = message || "";
      el.style.color = error ? "#ff7085" : "#34d399";
    }
  }

  function getExtension(file) {
    const name = file.name || "";
    const dot = name.lastIndexOf(".");

    return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  }

  function releasePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
  }

  function clearMedia() {
    selectedFile = null;
    releasePreview();

    if (mediaInput) mediaInput.value = "";

    if (previewPanel) {
      previewPanel.replaceChildren();
      previewPanel.hidden = true;
    }
  }

  function ensureUI() {
    const composer = $("mexa-composer");
    if (!composer) {
      throw new Error("Area postingan #mexa-composer tidak ditemukan.");
    }

    if (!mediaInput) {
      mediaInput = document.createElement("input");
      mediaInput.type = "file";
      mediaInput.accept = "image/jpeg,video/mp4";
      mediaInput.hidden = true;
      mediaInput.setAttribute("aria-label", "Pilih foto atau video");

      mediaInput.addEventListener("change", onFileSelected);
      composer.appendChild(mediaInput);
    }

    if (!previewPanel) {
      previewPanel = document.createElement("div");
      previewPanel.className = "mexa-media-preview";
      previewPanel.hidden = true;
      previewPanel.style.cssText =
        "margin:12px 0;padding:12px;" +
        "border:1px solid rgba(139,92,246,.5);" +
        "border-radius:14px;background:rgba(20,16,39,.85);";

      composer.appendChild(previewPanel);
    }
  }

  function onFileSelected() {
    const file = mediaInput.files && mediaInput.files[0];
    if (!file) return;

    clearMedia();

    const extension = getExtension(file);
    const isPhoto =
      file.type === "image/jpeg" &&
      (extension === "jpg" || extension === "jpeg");

    const isVideo =
      file.type === "video/mp4" &&
      extension === "mp4";

    if (!isPhoto && !isVideo) {
      alert("Format yang didukung: foto JPG/JPEG atau video MP4.");
      return;
    }

    if (file.size > MAX_SIZE) {
      alert("Ukuran maksimal media adalah 50 MB.");
      return;
    }

    selectedFile = file;
    previewUrl = URL.createObjectURL(file);

    const heading = document.createElement("div");
    heading.textContent =
      (isVideo ? "🎥 Video: " : "📷 Foto: ") + file.name;
    heading.style.cssText =
      "font-size:13px;margin-bottom:10px;color:#ddd6fe;";

    const media = document.createElement(isVideo ? "video" : "img");
    media.src = previewUrl;
    media.style.cssText =
      "display:block;width:100%;max-height:360px;" +
      "object-fit:contain;border-radius:10px;";

    if (isVideo) {
      media.controls = true;
      media.playsInline = true;
      media.preload = "metadata";
    } else {
      media.alt = "Pratinjau foto postingan";
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "✕ Hapus media";
    remove.style.cssText =
      "margin-top:10px;padding:8px 12px;border:0;" +
      "border-radius:8px;cursor:pointer;";

    remove.addEventListener("click", clearMedia);

    previewPanel.replaceChildren(heading, media, remove);
    previewPanel.hidden = false;

    status("Media siap diposting.", false);
  }

  function buttonKind(button) {
    const text = (button.textContent || "").trim().toLowerCase();

    if (text.includes("foto")) return "photo";
    if (text.includes("video")) return "video";
    if (text.includes("perasaan")) return "feeling";

    return "";
  }

  /*
   * Tangkap klik lebih awal agar peringatan lama dari home.js
   * tidak muncul pada tombol Foto dan Video.
   */
  document.addEventListener("click", function (event) {
    const button = event.target.closest(
      ".mx-create-buttons button"
    );

    if (!button) return;

    const kind = buttonKind(button);
    if (!kind) return;

    if (kind === "feeling") return;

    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      ensureUI();

      mediaInput.accept = kind === "video"
        ? "video/mp4"
        : "image/jpeg";

      mediaInput.click();
    } catch (error) {
      console.error("MEXA Media:", error);
      alert(error.message);
    }
  }, true);

  async function uploadSelectedMedia(user) {
    if (!selectedFile) return null;

    const file = selectedFile;
    const extension = getExtension(file);
    const safeName =
      Date.now() + "-" +
      Math.random().toString(36).slice(2, 10) +
      "." + extension;

    const path = user.id + "/" + safeName;
    status("Mengunggah media...", false);

    const result = await getClient().storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });

    if (result.error) {
      throw new Error("Unggah media gagal: " + result.error.message);
    }

    const publicResult = getClient().storage
      .from(BUCKET)
      .getPublicUrl(path);

    const url = publicResult.data &&
      publicResult.data.publicUrl;

    if (!url) {
      throw new Error("URL publik media tidak tersedia.");
    }

    return url;
  }

  async function createMediaPost(content) {
    const client = getClient();
    const auth = await client.auth.getUser();

    if (auth.error) throw auth.error;

    const user = auth.data.user;
    if (!user) throw new Error("Silakan login kembali.");

    const mediaUrl = await uploadSelectedMedia(user);

    status("Menyimpan postingan...", false);

    const result = await client
      .from("posts")
      .insert({
        user_id: user.id,
        content: content,
        image_url: mediaUrl
      })
      .select("id,user_id,content,image_url,created_at")
      .single();

    if (result.error) {
      throw new Error("Gagal menyimpan postingan: " + result.error.message);
    }

    clearMedia();

    if (
      window.MEXAPosts &&
      typeof window.MEXAPosts.load === "function"
    ) {
      await window.MEXAPosts.load();
    }

    return result.data;
  }

  /*
   * Tangkap tombol Posting lebih awal.
   * Tanpa media: tetap gunakan API posting teks yang lama.
   * Dengan media: unggah lalu simpan URL ke posts.image_url.
   */
  document.addEventListener("click", async function (event) {
    const button = event.target.closest("#mexaPostButton");
    if (!button) return;

    // Posting teks biasa tetap dijalankan oleh home.js.
    if (!selectedFile) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (busy) return;

    const textarea = $("mexaPostContent");
    const content = textarea ? textarea.value.trim() : "";

    busy = true;
    button.disabled = true;

    const originalText = button.textContent;
    button.textContent = "Mengunggah...";

    try {
      await createMediaPost(content);

      if (textarea) textarea.value = "";
      status("Postingan foto/video berhasil diterbitkan.", false);
    } catch (error) {
      console.error("MEXA Media gagal:", error);
      status(error.message || "Postingan gagal.", true);
      alert(error.message || "Postingan gagal diterbitkan.");
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = originalText;
    }
  }, true);

  function init() {
    const composer = $("mexa-composer");

    if (composer) {
      try {
        ensureUI();
      } catch (error) {
        console.warn(error.message);
      }
    }

    console.log("MEXA MEDIA MODULE aktif.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.MEXAMedia = {
    clear: clearMedia
  };
})(window, document);
