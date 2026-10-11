
(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const avatarInput = $("editAvatarFile");
  const coverInput = $("editCoverFile");
  const avatarPreview = $("avatarPreview");
  const coverPreview = $("coverPreview");

  if (!avatarInput || !coverInput || !avatarPreview || !coverPreview) return;

  function clearPreview(input, preview) {
    if (preview.dataset.objectUrl) {
      URL.revokeObjectURL(preview.dataset.objectUrl);
      delete preview.dataset.objectUrl;
    }
    preview.removeAttribute("src");
    preview.style.display = "none";
    if (input) input.value = "";
  }

  function preview(input, image) {
    input.addEventListener("change", () => {
      const file = input.files?.[0];

      if (!file) {
        clearPreview(null, image);
        return;
      }

      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        alert("Pilih foto JPG, PNG, atau WebP.");
        clearPreview(input, image);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran foto maksimal 5 MB.");
        clearPreview(input, image);
        return;
      }

      if (image.dataset.objectUrl) {
        URL.revokeObjectURL(image.dataset.objectUrl);
      }

      const url = URL.createObjectURL(file);
      image.dataset.objectUrl = url;
      image.src = url;
      image.style.display = "block";
    });
  }

  preview(avatarInput, avatarPreview);
  preview(coverInput, coverPreview);

  window.MEXAProfileMedia = {
    clearPreview() {
      clearPreview(avatarInput, avatarPreview);
      clearPreview(coverInput, coverPreview);
    },

    getFiles() {
      return {
        avatar: avatarInput.files?.[0] || null,
        cover: coverInput.files?.[0] || null
      };
    }
  };
})();
