
(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  let posts = [];
  let activeType = "all";

  function mediaType(post) {
    const explicit = String(
      post.media_type || post.type || post.kind || ""
    ).toLowerCase();

    const url = String(
      post.media_url || post.image_url || post.video_url || ""
    ).split("?")[0].toLowerCase();

    if (explicit.includes("reel")) return "reels";
    if (explicit.includes("video") || /\.(mp4|webm|mov|m4v)$/.test(url)) {
      return "video";
    }

    if (
      explicit.includes("image") ||
      explicit.includes("photo") ||
      /\.(jpg|jpeg|png|webp|gif|avif)$/.test(url)
    ) {
      return "photo";
    }

    return null;
  }

  function getMediaUrl(post) {
    return post.media_url || post.image_url || post.video_url || "";
  }

  function createCard(post) {
    const type = mediaType(post);
    const url = getMediaUrl(post);
    if (!type || !url) return null;

    const card = document.createElement("article");
    card.className = "media-item";

    let media;

    if (type === "video" || type === "reels") {
      media = document.createElement("video");
      media.src = url;
      media.controls = true;
      media.preload = "metadata";
      media.playsInline = true;
    } else {
      media = document.createElement("img");
      media.src = url;
      media.alt = "Foto postingan MEXA";
      media.loading = "lazy";
    }

    media.addEventListener("error", () => {
      media.remove();
      const error = document.createElement("div");
      error.className = "media-state";
      error.textContent = "Media tidak dapat dimuat.";
      card.appendChild(error);
    });

    card.appendChild(media);

    const label = document.createElement("span");
    label.className = "media-type";
    label.textContent = type === "photo" ? "FOTO" :
      type === "video" ? "VIDEO" : "REELS";
    card.appendChild(label);

    const caption = String(post.content || "").trim();
    if (caption) {
      const text = document.createElement("div");
      text.className = "media-caption";
      text.textContent = caption.slice(0, 180);
      card.appendChild(text);
    }

    return card;
  }

  function render() {
    const container = $("postingan");
    if (!container) return;

    container.innerHTML = "";

    const filtered = posts.filter(post => {
      const type = mediaType(post);
      return type && (activeType === "all" || type === activeType);
    });

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "media-state";
      empty.textContent = "Belum ada media pada kategori ini.";
      container.appendChild(empty);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "media-grid";

    filtered.forEach(post => {
      const card = createCard(post);
      if (card) grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  function setPosts(list) {
    posts = Array.isArray(list) ? list : [];
    const count = $("posts");
    if (count) count.textContent = String(posts.length);
    render();
  }

  function setType(type) {
    activeType = ["all", "photo", "video", "reels"].includes(type)
      ? type : "all";
    render();
  }

  window.MEXAProfilePosts = {
    setPosts,
    setType,
    refresh: render
  };
})();
