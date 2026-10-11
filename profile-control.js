
(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const state = {
    user: null,
    profile: null,
    loading: false,
    saving: false
  };

  function notify(text, isError = false) {
    const box = $("message");
    if (!box) return;

    box.textContent = text;
    box.classList.add("show");
    box.style.borderColor = isError ? "#ff6b81" : "var(--blue)";
  }

  function clearNotice() {
    $("message")?.classList.remove("show");
  }

  function setLoading(loading) {
    state.loading = Boolean(loading);
    document.documentElement.dataset.profileLoading =
      state.loading ? "true" : "false";
  }

  function setSaving(saving) {
    state.saving = Boolean(saving);

    const button = $("saveProfile");
    if (!button) return;

    button.disabled = state.saving;
    button.textContent = state.saving
      ? "Menyimpan..."
      : "Simpan Perubahan";
  }

  function setUser(user) {
    state.user = user || null;
  }

  function setProfile(profile) {
    state.profile = profile || null;
  }

  function getState() {
    return {
      user: state.user,
      profile: state.profile,
      loading: state.loading,
      saving: state.saving
    };
  }

  function syncTheme() {
    window.MEXAProfileTheme?.sync();
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncTheme();
  });

  document.addEventListener("mexa:profile-theme-applied", () => {
    document.documentElement.dataset.profileReady = "true";
  });

  window.MEXAProfileControl = {
    state: getState,
    setUser,
    setProfile,
    notify,
    clearNotice,
    setLoading,
    setSaving,
    syncTheme
  };
})();
