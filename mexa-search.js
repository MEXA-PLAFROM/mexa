
/* =========================================================
   MEXA GLOBAL SEARCH v1.0
   File: mexa-search.js
   Menggunakan koneksi window.mexaSupabase yang sudah ada.
   ========================================================= */
(() => {
  "use strict";

  if (window.MEXA_SEARCH?.version === "1.0.0") return;

  const VERSION = "1.0.0";
  const DEBOUNCE_MS = 300;
  const LIMIT = 8;

  const TABLES = {
    groups: [
      "groups",
      "mexa_groups",
      "user_groups"
    ],
    communities: [
      "communities",
      "mexa_communities"
    ],
    reels: [
      "reels",
      "mexa_reels",
      "videos",
      "mexa_videos"
    ]
  };

  const availableTables = {};
  let timer = null;
  let requestNumber = 0;
  let activeCategory = "all";
  let lastResults = null;

  const categories = [
    { id: "all", label: "Semua" },
    { id: "users", label: "Pengguna" },
    { id: "posts", label: "Postingan" },
    { id: "groups", label: "Grup" },
    { id: "communities", label: "Komunitas" },
    { id: "reels", label: "Reels" }
  ];

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  function getClient() {
    return window.mexaSupabase || window.MEXA_SUPABASE || null;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function cleanText(value, max = 180) {
    return String(value ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);
  }

  function firstValue(object, keys) {
    for (const key of keys) {
      const value = object?.[key];
      if (value !== undefined && value !== null &&
          String(value).trim() !== "") {
        return value;
      }
    }
    return "";
  }

  function normalise(value) {
    return String(value ?? "").trim().toLocaleLowerCase("id");
  }

  function matchesQuery(row, query, keys) {
    const haystack = keys
      .map(key => cleanText(row?.[key], 1000))
      .join(" ")
      .toLocaleLowerCase("id");

    const words = normalise(query)
      .split(/\s+/)
      .filter(Boolean);

    return words.length > 0 &&
      words.every(word => haystack.includes(word));
  }

  function getSearchElements() {
    const input = $(
      ".mx-search-box input[type='search'], " +
      ".mx-search-box input"
    );

    if (!input) return null;

    const box = input.closest(".mx-search-box");
    if (!box) return null;

    let panel = $("#mexa-search-results");

    if (!panel) {
      panel = document.createElement("section");
      panel.id = "mexa-search-results";
      panel.className = "mx-search-results";
      panel.hidden = true;
      panel.setAttribute("aria-label", "Hasil pencarian MEXA");

      box.appendChild(panel);
    }

    return { input, box, panel };
  }

  function installStyles() {
    if ($("#mexa-search-styles")) return;

    const style = document.createElement("style");
    style.id = "mexa-search-styles";
    style.textContent = `
      .mx-search-box {
        position: relative;
        z-index: 1002;
      }

      .mx-search-results {
        position: absolute;
        z-index: 1001;
        top: calc(100% + 8px);
        left: 0;
        width: min(560px, 92vw);
        max-height: min(72vh, 620px);
        overflow: auto;
        padding: 12px;
        color: var(--mx-text, #f6f3ff);
        background: var(--mx-panel, #141027);
        border: 1px solid var(--mx-border, #2a2441);
        border-radius: 16px;
        box-shadow: 0 18px 50px #0008;
      }

      .mx-search-results[hidden] {
        display: none !important;
      }

      .mx-search-category-list {
        display: flex;
        gap: 7px;
        overflow-x: auto;
        padding: 2px 0 12px;
      }

      .mx-search-category {
        flex: 0 0 auto;
        padding: 7px 11px;
        color: var(--mx-muted, #aaa4c2);
        background: transparent;
        border: 1px solid var(--mx-border, #2a2441);
        border-radius: 999px;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
      }

      .mx-search-category.is-active {
        color: var(--mx-text, #fff);
        background: var(--mx-purple, #8b5cf6);
        border-color: transparent;
      }

      .mx-search-heading {
        margin: 4px 0 9px;
        font-size: 13px;
        font-weight: 700;
      }

      .mx-search-result {
        display: flex;
        align-items: center;
        gap: 11px;
        width: 100%;
        box-sizing: border-box;
        padding: 10px 8px;
        color: inherit;
        text-decoration: none;
        border-radius: 10px;
      }

      .mx-search-result:hover,
      .mx-search-result:focus-visible {
        background: #ffffff0d;
        outline: none;
      }

      .mx-search-result img,
      .mx-search-result .mx-search-icon {
        flex: 0 0 42px;
        width: 42px;
        height: 42px;
        border-radius: 12px;
        object-fit: cover;
        background: #29213f;
      }

      .mx-search-result img.mx-search-avatar {
        border-radius: 50%;
      }

      .mx-search-icon {
        display: grid;
        place-items: center;
        font-size: 20px;
      }

      .mx-search-copy {
        min-width: 0;
        flex: 1;
      }

      .mx-search-name {
        overflow-wrap: anywhere;
        font-size: 13px;
        font-weight: 700;
      }

      .mx-search-description {
        margin-top: 3px;
        color: var(--mx-muted, #aaa4c2);
        font-size: 12px;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }

      .mx-search-kind {
        display: block;
        margin-top: 3px;
        color: var(--mx-cyan, #00e5ff);
        font-size: 10px;
      }

      .mx-search-message {
        padding: 18px 8px;
        color: var(--mx-muted, #aaa4c2);
        text-align: center;
        font-size: 13px;
      }

      .mx-search-footer {
        padding-top: 8px;
        border-top: 1px solid var(--mx-border, #2a2441);
        color: var(--mx-muted, #aaa4c2);
        font-size: 11px;
        line-height: 1.5;
      }

      @media (max-width: 600px) {
        .mx-search-results {
          position: fixed;
          top: 72px;
          left: 4vw;
          width: 92vw;
          max-height: calc(100dvh - 100px);
          box-sizing: border-box;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function safeImageUrl(value) {
    const url = String(value ?? "").trim();
    if (!url) return "";

    try {
      const parsed = new URL(url, location.href);
      if (!["http:", "https:"].includes(parsed.protocol)) return "";
      return parsed.href;
    } catch {
      return "";
    }
  }

  function resultLink(kind, row) {
    const id = firstValue(row, ["id", "user_id", "group_id"]);
    const userId = firstValue(row, ["user_id", "owner_id", "created_by"]);
    const slug = firstValue(row, ["slug", "username"]);
    const query = new URLSearchParams();

    if (id) query.set("id", id);
    if (userId) query.set("user_id", userId);
    if (slug) query.set("slug", slug);

    if (kind === "users") return "./Profil.html?" + query.toString();
    if (kind === "groups") return "./Grup.html?" + query.toString();
    if (kind === "communities") {
      return "./Grup.html?type=community&" + query.toString();
    }
    if (kind === "reels") return "./Reels.html?" + query.toString();

    return "./index.html#post-" + encodeURIComponent(String(id || ""));
  }

  function makeResult(kind, row) {
    let name = "";
    let description = "";
    let image = "";
    let icon = "⌕";
    let avatar = false;

    if (kind === "users") {
      name = firstValue(row, ["display_name", "full_name", "name", "username"])
        || "Pengguna MEXA";
      const username = firstValue(row, ["username", "handle"]);
      description = username ? "@" + String(username).replace(/^@/, "") : "Profil pengguna";
      image = firstValue(row, ["avatar_url", "photo_url", "profile_image"]);
      icon = "♙";
      avatar = true;
    } else if (kind === "posts") {
      name = firstValue(row, ["display_name", "username", "author_name"])
        || "Postingan MEXA";
      description = firstValue(row, ["content", "caption", "text"])
        || "Postingan";
      image = firstValue(row, ["image_url", "media_url", "thumbnail_url"]);
      icon = "▤";
    } else if (kind === "groups" || kind === "communities") {
      name = firstValue(row, ["name", "group_name", "community_name", "title"])
        || "Tanpa nama";
      description = firstValue(row, ["description", "bio", "about"])
        || (kind === "groups" ? "Grup MEXA" : "Komunitas MEXA");
      image = firstValue(row, [
        "avatar_url", "image_url", "cover_url", "photo_url"
      ]);
      icon = kind === "groups" ? "♧" : "◉";
    } else {
      name = firstValue(row, ["title", "name", "caption", "content"])
        || "Video Reels";
      description = firstValue(row, ["description", "caption", "content"])
        || "Video MEXA";
      image = firstValue(row, [
        "thumbnail_url", "cover_url", "image_url", "video_thumbnail"
      ]);
      icon = "▶";
    }

    const href = resultLink(kind, row);
    const safeImage = safeImageUrl(image);
    const imageHTML = safeImage
      ? `<img ${avatar ? 'class="mx-search-avatar"' : ""}
          src="${escapeHTML(safeImage)}"
          alt=""
          loading="lazy"
          referrerpolicy="no-referrer">`
      : `<span class="mx-search-icon" aria-hidden="true">${icon}</span>`;

    const kindLabel = categories.find(item => item.id === kind)?.label || kind;

    return `
      <a class="mx-search-result"
         href="${escapeHTML(href)}"
         data-search-kind="${escapeHTML(kind)}"
         data-search-id="${escapeHTML(firstValue(row, ["id", "user_id"]))}">
        ${imageHTML}
        <span class="mx-search-copy">
          <span class="mx-search-name">${escapeHTML(cleanText(name, 90))}</span>
          <span class="mx-search-description">${escapeHTML(cleanText(description, 160))}</span>
          <span class="mx-search-kind">${escapeHTML(kindLabel)}</span>
        </span>
      </a>`;
  }

  function render(panel, query, results, message = "") {
    const categoryHTML = categories.map(category => `
      <button type="button"
        class="mx-search-category ${activeCategory === category.id ? "is-active" : ""}"
        data-search-category="${category.id}"
        aria-pressed="${activeCategory === category.id}">
        ${category.label}
      </button>
    `).join("");

    const list = activeCategory === "all"
      ? categories.slice(1).flatMap(category =>
          (results[category.id] || []).map(row => ({
            kind: category.id,
            row
          }))
        )
      : (results[activeCategory] || []).map(row => ({
          kind: activeCategory,
          row
        }));

    const limited = list.slice(0, activeCategory === "all" ? 30 : LIMIT);

    let body = "";

    if (message) {
      body = `<div class="mx-search-message">${escapeHTML(message)}</div>`;
    } else if (!limited.length) {
      body = `<div class="mx-search-message">
        Tidak ada hasil untuk “${escapeHTML(query)}”.
        Coba kata kunci lain.
      </div>`;
    } else {
      let lastKind = "";

      body = limited.map(item => {
        const heading = activeCategory === "all" && item.kind !== lastKind
          ? `<div class="mx-search-heading">${categories.find(c => c.id === item.kind)?.label || item.kind}</div>`
          : "";

        lastKind = item.kind;
        return heading + makeResult(item.kind, item.row);
      }).join("");
    }

    panel.innerHTML = `
      <div class="mx-search-category-list">${categoryHTML}</div>
      ${body}
      <div class="mx-search-footer">
        Hasil berasal dari data yang dapat diakses akun ini.
        Sebagian kategori memerlukan tabel Supabase yang sesuai.
      </div>
    `;
    panel.hidden = false;
  }

  async function queryProfiles(client, query) {
    const columns = "id,username,display_name,avatar_url";
    const { data, error } = await client
      .from("profiles")
      .select(columns)
      .or(
        `username.ilike.%${query.replace(/[,%()]/g, " ")}%,` +
        `display_name.ilike.%${query.replace(/[,%()]/g, " ")}%`
      )
      .limit(LIMIT);

    if (error) throw error;
    return data || [];
  }

  async function queryPosts(client, query) {
    const term = query.replace(/[,%()]/g, " ").trim();
    const { data, error } = await client
      .from("posts")
      .select("id,user_id,content,image_url,created_at")
      .ilike("content", `%${term}%`)
      .order("created_at", { ascending: false })
      .limit(LIMIT);

    if (error) throw error;
    return data || [];
  }

  async function queryCandidateTable(client, category, query) {
    if (availableTables[category] === null) return [];

    const candidates = availableTables[category]
      ? [availableTables[category]]
      : TABLES[category];

    for (const table of candidates) {
      try {
        const { data, error } = await client
          .from(table)
          .select("*")
          .limit(100);

        if (error) continue;

        availableTables[category] = table;

        const keys = [
          "name", "title", "description", "bio", "about",
          "username", "group_name", "community_name",
          "caption", "content", "slug"
        ];

        return (data || [])
          .filter(row => matchesQuery(row, query, keys))
          .slice(0, LIMIT);
      } catch (_) {
        // Tabel kandidat tidak tersedia atau tidak dapat diakses.
      }
    }

    availableTables[category] = null;
    return [];
  }

  async function search(query) {
    const elements = getSearchElements();
    if (!elements) return;

    const { panel } = elements;
    const client = getClient();
    const requestId = ++requestNumber;

    if (!client) {
      render(panel, query, {}, "Koneksi Supabase belum tersedia. Periksa auth-client.js.");
      return;
    }

    render(panel, query, {}, "Sedang mencari…");

    const results = {
      users: [],
      posts: [],
      groups: [],
      communities: [],
      reels: []
    };

    const jobs = [
      queryProfiles(client, query).then(data => {
        results.users = data;
      }).catch(error => {
        console.warn("[MEXA Search] profiles:", error.message);
      }),

      queryPosts(client, query).then(data => {
        results.posts = data;
      }).catch(error => {
        console.warn("[MEXA Search] posts:", error.message);
      }),

      ...["groups", "communities", "reels"].map(category =>
        queryCandidateTable(client, category, query)
          .then(data => {
            results[category] = data;
          })
          .catch(error => {
            console.warn("[MEXA Search]", category, error.message);
          })
      )
    ];

    await Promise.all(jobs);

    if (requestId !== requestNumber) return;

    lastResults = results;
    render(panel, query, results);
  }

  function closeResults() {
    const panel = $("#mexa-search-results");
    if (panel) panel.hidden = true;
  }

  function init() {
    const elements = getSearchElements();
    if (!elements) {
      console.warn("[MEXA Search] Kolom pencarian tidak ditemukan.");
      return;
    }

    installStyles();

    const { input, panel } = elements;

    input.setAttribute("autocomplete", "off");
    input.setAttribute("aria-controls", "mexa-search-results");
    input.setAttribute("aria-expanded", "false");

    input.addEventListener("input", () => {
      clearTimeout(timer);

      const query = input.value.trim();
      activeCategory = "all";
      input.setAttribute("aria-expanded", query.length >= 2 ? "true" : "false");

      if (query.length < 2) {
        requestNumber++;
        panel.hidden = true;
        panel.innerHTML = "";
        return;
      }

      timer = setTimeout(() => search(query), DEBOUNCE_MS);
    });

    panel.addEventListener("click", event => {
      const categoryButton = event.target.closest("[data-search-category]");
      if (categoryButton) {
        activeCategory = categoryButton.dataset.searchCategory;
        if (lastResults) render(panel, input.value.trim(), lastResults);
        return;
      }

      const resultLink = event.target.closest("[data-search-kind]");
      if (resultLink) {
        const detail = {
          kind: resultLink.dataset.searchKind,
          id: resultLink.dataset.searchId,
          href: resultLink.href
        };

        window.dispatchEvent(new CustomEvent("mexa:search-open", {
          detail
        }));
      }
    });

    document.addEventListener("click", event => {
      if (!event.target.closest(".mx-search-box") &&
          !event.target.closest("#mexa-search-results")) {
        closeResults();
        input.setAttribute("aria-expanded", "false");
      }
    });

    input.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeResults();
        input.setAttribute("aria-expanded", "false");
      }

      if (event.key === "Enter" && !panel.hidden) {
        const first = panel.querySelector(".mx-search-result");
        if (first) {
          event.preventDefault();
          first.click();
        }
      }
    });

    window.MEXA_SEARCH = {
      version: VERSION,
      search,
      close: closeResults,
      refresh: () => {
        lastResults = null;
        const query = input.value.trim();
        if (query.length >= 2) search(query);
      }
    };

    console.info("[MEXA Search] v" + VERSION + " siap.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
