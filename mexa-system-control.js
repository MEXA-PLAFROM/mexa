/* =====================================================
   MEXA SYSTEM CONTROL 1
   Pusat koordinasi modul MEXA
   Versi 1.0
   ===================================================== */

(function (window, document) {
  "use strict";

  // Hindari inisialisasi ganda.
  if (window.MEXA_SYSTEM) {
    console.warn("MEXA SYSTEM CONTROL sudah aktif.");
    return;
  }

  const VERSION = "1.0.0";
  const startedAt = Date.now();

  const modules = Object.create(null);
  const errors = [];

  let initialized = false;

  function log(message, data) {
    if (data !== undefined) {
      console.log("[MEXA SYSTEM]", message, data);
    } else {
      console.log("[MEXA SYSTEM]", message);
    }
  }

  function reportError(moduleName, error) {
    const entry = {
      module: moduleName,
      message: error instanceof Error
        ? error.message
        : String(error),
      time: new Date().toISOString()
    };

    errors.push(entry);

    // Simpan maksimal 50 laporan terakhir.
    if (errors.length > 50) {
      errors.shift();
    }

    console.error("[MEXA SYSTEM]", entry);

    document.dispatchEvent(
      new CustomEvent("mexa:system-error", {
        detail: entry
      })
    );

    return entry;
  }

  function register(name, details) {
    if (!name || typeof name !== "string") {
      return false;
    }

    modules[name] = Object.assign(
      {},
      modules[name] || {},
      details || {},
      {
        name: name,
        registeredAt: Date.now()
      }
    );

    log("Modul terdaftar: " + name);

    document.dispatchEvent(
      new CustomEvent("mexa:module-registered", {
        detail: {
          name: name,
          module: modules[name]
        }
      })
    );

    return true;
  }

  function getModules() {
    return Object.keys(modules).map(function (name) {
      return Object.assign({}, modules[name]);
    });
  }

  function getErrors() {
    return errors.map(function (entry) {
      return Object.assign({}, entry);
    });
  }

  function checkSystem() {
    const checks = [];

    function addCheck(name, ok, message) {
      checks.push({
        name: name,
        status: ok ? "ready" : "missing",
        message: message
      });
    }

    addCheck(
      "DOM",
      Boolean(document.body),
      document.body
        ? "Halaman HTML tersedia."
        : "Elemen body belum tersedia."
    );

    addCheck(
      "Theme",
      Boolean(
        window.MEXA_THEME &&
        typeof window.MEXA_THEME.set === "function" &&
        typeof window.MEXA_THEME.open === "function"
      ),
      window.MEXA_THEME
        ? "API tema ditemukan."
        : "API tema belum ditemukan."
    );

    addCheck(
      "Home",
      Boolean(document.getElementById("mexa-composer")),
      document.getElementById("mexa-composer")
        ? "Area Home ditemukan."
        : "Area Home belum ditemukan."
    );

    addCheck(
      "Navigation",
      Boolean(document.getElementById("mx-main-menu")),
      document.getElementById("mx-main-menu")
        ? "Tombol menu utama ditemukan."
        : "Tombol menu utama belum ditemukan."
    );

    addCheck(
      "Feed",
      Boolean(document.getElementById("mexaFeedList")),
      document.getElementById("mexaFeedList")
        ? "Wadah feed ditemukan."
        : "Wadah feed belum ditemukan."
    );

    addCheck(
      "Supabase API",
      Boolean(window.MEXA_API || window.mexaAPI),
      window.MEXA_API || window.mexaAPI
        ? "Referensi API ditemukan."
        : "API belum terdeteksi secara global."
    );

    return {
      version: VERSION,
      initialized: initialized,
      uptimeMs: Date.now() - startedAt,
      checks: checks,
      modules: getModules(),
      errors: getErrors()
    };
  }

  function refresh() {
    const report = checkSystem();

    document.dispatchEvent(
      new CustomEvent("mexa:system-check", {
        detail: report
      })
    );

    log("Pemeriksaan sistem selesai.", report);

    return report;
  }

  function emit(eventName, detail) {
    if (
      typeof eventName !== "string" ||
      !eventName.startsWith("mexa:")
    ) {
      throw new Error(
        "Nama event harus diawali dengan mexa:"
      );
    }

    document.dispatchEvent(
      new CustomEvent(eventName, {
        detail: detail || {}
      })
    );
  }

  function safeRun(moduleName, callback) {
    if (typeof callback !== "function") {
      throw new TypeError(
        "Callback harus berupa fungsi."
      );
    }

    try {
      return callback();
    } catch (error) {
      reportError(moduleName, error);
      return undefined;
    }
  }

  function init() {
    if (initialized) return;

    initialized = true;

    register("system-control", {
      status: "ready",
      version: VERSION
    });

    register("themes", {
      status: window.MEXA_THEME ? "detected" : "pending"
    });

    register("home", {
      status: document.getElementById("mexa-composer")
        ? "detected"
        : "pending"
    });

    register("navigation", {
      status: document.getElementById("mx-main-menu")
        ? "detected"
        : "pending"
    });

    // Periksa ulang tema ketika pengguna menggantinya.
    document.addEventListener(
      "mexa:themechange",
      function (event) {
        log("Tema berubah.", event.detail);
      }
    );

    // Catat kesalahan JavaScript global.
    window.addEventListener("error", function (event) {
      reportError("javascript", event.message || "Kesalahan JavaScript");
    });

    // Catat penolakan Promise yang tidak ditangani.
    window.addEventListener(
      "unhandledrejection",
      function (event) {
        reportError(
          "promise",
          event.reason || "Promise gagal"
        );
      }
    );

    log("MEXA SYSTEM CONTROL " + VERSION + " aktif.");

    refresh();

    document.dispatchEvent(
      new CustomEvent("mexa:system-ready", {
        detail: {
          version: VERSION
        }
      })
    );
  }

  // API pusat untuk digunakan modul MEXA.
  window.MEXA_SYSTEM = {
    version: VERSION,
    register: register,
    modules: getModules,
    errors: getErrors,
    check: checkSystem,
    refresh: refresh,
    emit: emit,
    safeRun: safeRun
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})(window, document);
