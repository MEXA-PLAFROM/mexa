/* =====================================================
MEXA PLATFORM — POST CREATE
File: post-create.js
===================================================== */

(function () {
"use strict";

if (window.MEXAPostCreateLoaded) return;
window.MEXAPostCreateLoaded = true;

const API_URL =
"https://yozylignolfvkemuhfse.supabase.co/functions/v1/mexa-api";

let isSubmitting = false;

async function getCurrentUser() {
const client = window.mexaSupabase;
if (!client?.auth) return null;

const { data, error } = await client.auth.getSession();

if (error || !data?.session?.user) return null;

window.currentUser = data.session.user;
window.mexaCurrentUser = data.session.user;

return data.session.user;

}

function getComposer() {
return document.querySelector(
"#mexaPostContent, #postContent, #postText, " +
"#mexaComposerInput, textarea[name='content'], " +
"[contenteditable='true'][data-post-content]"
);
}

function getContent(input) {
if (!input) return "";

return String(
  input.isContentEditable
    ? input.innerText
    : input.value || ""
).trim();

}

function setStatus(message, isError) {
let status = document.getElementById("mexaPostCreateStatus");

if (!status) {
  status = document.createElement("div");
  status.id = "mexaPostCreateStatus";
  status.setAttribute("role", "status");
  status.style.cssText =
    "margin:8px 0;padding:10px;border-radius:10px;font-size:14px;";

  const composer = document.getElementById("mexa-composer");
  (composer || document.body).appendChild(status);
}

status.textContent = message;
status.style.color = isError ? "#ff667a" : ""

}

async function createPost() {
if (isSubmitting) return;

const input = getComposer();
const content = getContent(input);

if (!content) {
  setStatus("Tulis sesuatu sebelum memposting.", true);
  input?.focus();
  return;
}

isSubmitting = true;

const buttons = Array.from(document.querySelectorAll(
  "#mexaPublishPost, #mexaSubmitPost, " +
  "[data-create-post]"
));

buttons.forEach(button => {
  button.dataset.wasDisabled = String(button.disabled);
  button.disabled = true;
});

try {
  setStatus("Memeriksa sesi login...", false);

  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
  }

  setStatus("Menyimpan postingan...", false);

  const sessionResult =
    await window.mexaSupabase.auth.getSession();

  const accessToken = sessionResult.data?.session?.access_token;

  if (!accessToken) {
    throw new Error("Token login tidak tersedia. Silakan login kembali.");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + accessToken,
      "apikey": "sb_publishable_XTj3R7a5ItH0lo3pVLomrQ_-mZ-I-Uo"
    },
    body: JSON.stringify({
      action: "create_post",
      user_id: user.id,
      content: content
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false || result.error) {
    throw new Error(
      result.error ||
      result.message ||
      "Server gagal menyimpan postingan (HTTP " +
      response.status + ")."
    );
  }

  if (input.isContentEditable) {
    input.innerText = "";
  } else {
    input.value = "";
  }

  setStatus("Postingan berhasil disimpan!", false);

  if (typeof window.MEXA_LOAD_FEED === "function") {
    await window.MEXA_LOAD_FEED();
  } else {
    document.dispatchEvent(new CustomEvent("mexa:refresh-feed"));
  }
} catch (error) {
  console.error("MEXA gagal membuat postingan:", error);
  setStatus(
    "Postingan gagal: " + (error.message || "Kesalahan server."),
    true
  );
} finally {
  isSubmitting = false;

  buttons.forEach(button => {
    button.disabled = button.dataset.wasDisabled === "true";
    delete button.dataset.wasDisabled;
  });
}

}

window.MEXACreatePost = createPost;

document.addEventListener("click", function (event) {
if (!(event.target instanceof Element)) return;

const button = event.target.closest(
  "#mexaPublishPost, #mexaSubmitPost, [data-create-post]"
);

if (!button) return;

event.preventDefault();
createPost();

});

document.addEventListener("submit", function (event) {
const form = event.target;

if (
  form instanceof HTMLFormElement &&
  form.matches("#mexaPostForm, #mexaPostFormHome")
) {
  event.preventDefault();
  createPost();
}

});

console.log("MEXA PLATFORM: post-create siap.");
})();
