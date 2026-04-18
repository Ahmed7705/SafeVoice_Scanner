/**
 * SafeVoice Scanner - Core Application Logic
 * Voice-guided cybersecurity tool for visually impaired users.
 * Handles: Speech, QR scanning, URL checking, theming, i18n, and history.
 */

// ==============================================================================
// Translations
// ==============================================================================
const TRANSLATIONS = {
  en: {
    welcomeVoice: "Welcome to SafeVoice Scanner. Your secure link and QR code checker. Please type or paste a URL to check, or press the QR button to scan a code.",
    heroTitle: 'SafeVoice <span class="gradient-text">Scanner</span>',
    heroSubtitle: "Secure link & QR code checker for everyone",
    scanQrLabel: "Scan QR Code",
    urlPlaceholder: "Paste or type a URL here...",
    scanButton: "Scan",
    historyTitle: "Scan History",
    clearHistory: "Clear",
    historyEmpty: "No scans yet. Check a URL or scan a QR code to get started.",
    resultSafeTitle: "Safe",
    resultDangerousTitle: "Dangerous",
    resultDismiss: "Auto-closing in a few seconds...",
    loadingText: "Analyzing link...",
    loadingVoice: "Analyzing the link, please wait.",
    voiceSafe: "The link is safe. You can proceed.",
    voiceDangerous: "Warning! The link is dangerous. Do not open it.",
    voiceQrSafe: "The QR code is safe. You can proceed.",
    voiceQrDangerous: "Warning! The QR code is dangerous. Do not open it.",
    errorNoUrl: "Please enter a URL to check.",
    errorGeneral: "An error occurred. Please try again.",
    heuristicLabel: "Heuristic",
    apiLabel: "API",
    safe: "Safe",
    dangerous: "Dangerous",
    justNow: "Just now",
    minutesAgo: "min ago",
    hoursAgo: "hr ago",
    daysAgo: "d ago",
    langLabel: "AR",
    typeUrl: "URL",
    typeQr: "QR",
  },
  ar: {
    welcomeVoice: "مرحباً بك في سيف فويس سكانر. فاحص الروابط ورموز QR الآمن. الصق أو اكتب رابط للفحص، أو اضغط زر QR لمسح رمز.",
    heroTitle: 'سيف فويس <span class="gradient-text">سكانر</span>',
    heroSubtitle: "فاحص الروابط ورموز QR الآمن للجميع",
    scanQrLabel: "مسح رمز QR",
    urlPlaceholder: "الصق أو اكتب الرابط هنا...",
    scanButton: "فحص",
    historyTitle: "سجل الفحص",
    clearHistory: "مسح",
    historyEmpty: "لا توجد عمليات فحص بعد. افحص رابط أو امسح رمز QR للبدء.",
    resultSafeTitle: "آمن",
    resultDangerousTitle: "خطير",
    resultDismiss: "سيتم الإغلاق تلقائياً...",
    loadingText: "جاري تحليل الرابط...",
    loadingVoice: "جاري تحليل الرابط، يرجى الانتظار.",
    voiceSafe: "الرابط آمن. يمكنك المتابعة.",
    voiceDangerous: "تحذير! الرابط خطير. لا تفتحه.",
    voiceQrSafe: "رمز QR آمن. يمكنك المتابعة.",
    voiceQrDangerous: "تحذير! رمز QR خطير. لا تفتحه.",
    errorNoUrl: "يرجى إدخال رابط للفحص.",
    errorGeneral: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    heuristicLabel: "تحليل",
    apiLabel: "API",
    safe: "آمن",
    dangerous: "خطير",
    justNow: "الآن",
    minutesAgo: "دقيقة",
    hoursAgo: "ساعة",
    daysAgo: "يوم",
    langLabel: "EN",
    typeUrl: "رابط",
    typeQr: "QR",
  }
};

// ==============================================================================
// State
// ==============================================================================
let currentLang = localStorage.getItem("sv_lang") || "en";
let currentTheme = localStorage.getItem("sv_theme") || "system";
let qrScanner = null;
let isScanning = false;
let resultTimer = null;

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
function t(k) { return TRANSLATIONS[currentLang][k] || k; }

// ==============================================================================
// Theme
// ==============================================================================
function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.setAttribute("data-theme", resolved);
  const icon = $("#theme-icon");
  if (icon) {
    icon.className = resolved === "dark"
      ? "ph-bold ph-sun"
      : "ph-bold ph-moon";
  }
}

function toggleTheme() {
  if (currentTheme === "system") {
    currentTheme = getSystemTheme() === "dark" ? "light" : "dark";
  } else {
    currentTheme = currentTheme === "light" ? "dark" : "light";
  }
  localStorage.setItem("sv_theme", currentTheme);
  applyTheme(currentTheme);
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (currentTheme === "system") applyTheme("system");
});

// ==============================================================================
// Language
// ==============================================================================
function applyLanguage() {
  const isAr = currentLang === "ar";
  document.documentElement.setAttribute("dir", isAr ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", currentLang);

  $$("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.placeholder = t(key);
    } else {
      el.innerHTML = t(key);
    }
  });

  const langBtn = $("#lang-toggle");
  if (langBtn) langBtn.textContent = t("langLabel");
}

function toggleLanguage() {
  currentLang = currentLang === "en" ? "ar" : "en";
  localStorage.setItem("sv_lang", currentLang);
  applyLanguage();
  renderLocalHistory();
}

// ==============================================================================
// Speech (Server-side Google TTS for reliable Arabic + English support)
// ==============================================================================

let currentAudio = null;       // Track currently playing audio
let currentTtsAbort = null;    // AbortController for pending TTS fetch

/**
 * Speak text using server-side Google Text-to-Speech.
 * Cancels any previous speech (both pending fetch and playing audio).
 * @param {string} text - Text to speak
 * @param {string} lang - Language code ('en' or 'ar')
 */
function speak(text, lang) {
  // Cancel any pending TTS fetch request
  if (currentTtsAbort) {
    currentTtsAbort.abort();
    currentTtsAbort = null;
  }

  // Stop any currently playing audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }

  // Create new AbortController for this request
  const controller = new AbortController();
  currentTtsAbort = controller;

  fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text, lang: lang }),
    signal: controller.signal
  })
  .then(res => {
    if (!res.ok) throw new Error("TTS request failed");
    return res.blob();
  })
  .then(blob => {
    // Check if this request was cancelled while waiting
    if (controller.signal.aborted) return;

    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);
    currentAudio.play().catch(err => {
      console.warn("Audio autoplay blocked:", err);
    });
    currentAudio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
    };
    currentTtsAbort = null;
  })
  .catch(err => {
    if (err.name !== "AbortError") {
      console.error("TTS error:", err);
    }
  });
}

/**
 * Stop any currently playing speech audio and cancel pending requests.
 */
function stopSpeech() {
  if (currentTtsAbort) {
    currentTtsAbort.abort();
    currentTtsAbort = null;
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

function welcomeMessage() {
  setTimeout(() => speak(t("welcomeVoice"), currentLang), 1000);
}

// ==============================================================================
// QR Scanner
// ==============================================================================
function toggleQrPanel() {
  const panel = $("#qr-panel");
  if (panel.classList.contains("visible")) {
    closeQrPanel();
  } else {
    panel.classList.add("visible");
    startQrScanner();
  }
}

function closeQrPanel() {
  stopQrScanner();
  const panel = $("#qr-panel");
  if (panel) panel.classList.remove("visible");
}

async function startQrScanner() {
  if (isScanning || !window.Html5Qrcode) return;

  // First, explicitly request camera permission
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    // Permission granted — stop the test stream, let html5-qrcode handle it
    stream.getTracks().forEach(track => track.stop());
  } catch (err) {
    console.error("Camera permission error:", err);
    // Show error message to user
    const area = $(".qr-scanner-area");
    if (area) {
      area.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:250px;color:#fff;padding:20px;text-align:center;">
        <i class="ph-bold ph-camera-slash" style="font-size:48px;margin-bottom:16px;opacity:.6"></i>
        <div style="font-size:1rem;font-weight:600;margin-bottom:8px;">${currentLang === "ar" ? "لا يمكن الوصول للكاميرا" : "Camera Access Denied"}</div>
        <div style="font-size:.85rem;opacity:.7;">${currentLang === "ar" ? "يرجى السماح بالوصول للكاميرا من إعدادات المتصفح" : "Please allow camera access in your browser settings"}</div>
      </div>`;
    }
    speak(currentLang === "ar" ? "لا يمكن الوصول للكاميرا. يرجى السماح بالوصول من إعدادات المتصفح" : "Camera access denied. Please allow camera access in your browser settings.", currentLang);
    return;
  }

  // Camera permission granted — start scanning
  qrScanner = new Html5Qrcode("qr-reader");
  isScanning = true;
  qrScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (text) => { closeQrPanel(); checkUrl(text, "qr"); },
    () => {}
  ).catch((err) => {
    console.error("QR scanner start error:", err);
    isScanning = false;
  });
}

function stopQrScanner() {
  if (qrScanner && isScanning) {
    qrScanner.stop().then(() => { isScanning = false; qrScanner = null; }).catch(() => { isScanning = false; qrScanner = null; });
  }
  // Reset the scanner area HTML for next use
  const reader = $("#qr-reader");
  if (reader) reader.innerHTML = "";
}

// ==============================================================================
// URL Checking
// ==============================================================================
async function checkUrl(url, scanType = "url") {
  if (!url || !url.trim()) { speak(t("errorNoUrl"), currentLang, TRANSLATIONS.en.errorNoUrl); return; }
  showLoading(true);
  speak(t("loadingVoice"), currentLang, TRANSLATIONS.en.loadingVoice);
  try {
    const res = await fetch("/api/check-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), scan_type: scanType })
    });
    const data = await res.json();
    showLoading(false);
    if (data.error) { speak(t("errorGeneral"), currentLang, TRANSLATIONS.en.errorGeneral); return; }
    showResult(data);
    // Save to local history (per-device, private)
    saveToLocalHistory(data);
    renderLocalHistory();
  } catch (err) {
    console.error("Check URL error:", err);
    showLoading(false);
    speak(t("errorGeneral"), currentLang, TRANSLATIONS.en.errorGeneral);
  }
}

function handleUrlSubmit() {
  const input = $("#url-input");
  if (input) checkUrl(input.value, "url");
}

// ==============================================================================
// Loading
// ==============================================================================
function showLoading(show) {
  const o = $("#loading-overlay");
  if (o) o.classList.toggle("visible", show);
}

// ==============================================================================
// Result Overlay (auto-dismiss after 5s)
// ==============================================================================
function showResult(data) {
  const overlay = $("#result-overlay");
  if (!overlay) return;

  // Clear any existing timer
  if (resultTimer) { clearTimeout(resultTimer); resultTimer = null; }

  const isSafe = data.result === "safe";
  overlay.classList.remove("safe", "dangerous");
  overlay.classList.add(isSafe ? "safe" : "dangerous");

  // Icon
  const iconEl = $("#result-icon");
  iconEl.className = isSafe
    ? "ph-bold ph-check-circle"
    : "ph-bold ph-warning-circle";

  $("#result-title").textContent = isSafe ? t("resultSafeTitle") : t("resultDangerousTitle");
  $("#result-url").textContent = data.url;

  // Details
  const det = $("#result-details");
  det.innerHTML = "";
  const mkBadge = (icon, text) => {
    const s = document.createElement("span");
    s.className = "result-badge";
    s.innerHTML = `<i class="ph-bold ${icon}"></i> ${text}`;
    return s;
  };
  det.appendChild(mkBadge("ph-chart-bar", `${t("heuristicLabel")}: ${data.heuristic_score}/100`));
  det.appendChild(mkBadge("ph-cloud-check", `${t("apiLabel")}: ${data.api_result}`));
  if (data.threat_types?.length) {
    data.threat_types.forEach(tt => det.appendChild(mkBadge("ph-warning", tt)));
  }

  $("#result-dismiss-text").textContent = t("resultDismiss");

  // Progress bar animation
  const bar = $("#result-progress-bar");
  bar.classList.remove("animate");
  // Force reflow then start animation
  void bar.offsetWidth;
  bar.classList.add("animate");

  overlay.classList.add("visible");

  // Speak result - use QR-specific message if scan_type is 'qr'
  const isQr = data.scan_type === "qr";
  let voiceKey;
  if (isQr) {
    voiceKey = isSafe ? "voiceQrSafe" : "voiceQrDangerous";
  } else {
    voiceKey = isSafe ? "voiceSafe" : "voiceDangerous";
  }
  speak(t(voiceKey), currentLang);

  // Auto dismiss after 5 seconds
  resultTimer = setTimeout(() => {
    dismissResult();
  }, 5000);
}

function dismissResult() {
  const overlay = $("#result-overlay");
  if (overlay) overlay.classList.remove("visible");
  if (resultTimer) { clearTimeout(resultTimer); resultTimer = null; }
  stopSpeech();
  // Clear URL input for next scan
  const input = $("#url-input");
  if (input) { input.value = ""; input.focus(); }
}

// ==============================================================================
// History (stored in localStorage — private per device)
// ==============================================================================
const HISTORY_KEY = "sv_scan_history";
const MAX_HISTORY = 50;

function getLocalHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch { return []; }
}

function saveToLocalHistory(data) {
  const history = getLocalHistory();
  history.unshift({
    url: data.url,
    result: data.result,
    scan_type: data.scan_type,
    heuristic_score: data.heuristic_score,
    api_result: data.api_result,
    timestamp: new Date().toISOString()
  });
  // Keep only last MAX_HISTORY items
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function renderLocalHistory() {
  const list = $("#history-list");
  if (!list) return;
  const history = getLocalHistory();
  if (!history.length) {
    list.innerHTML = `<div class="history-empty"><div class="history-empty-icon"><i class="ph-bold ph-magnifying-glass"></i></div><div>${t("historyEmpty")}</div></div>`;
    return;
  }
  list.innerHTML = history.map(item => {
    const safe = item.result === "safe";
    const icon = safe ? "ph-check-circle" : "ph-warning-circle";
    const resultText = safe ? t("safe") : t("dangerous");
    const typeText = item.scan_type === "qr" ? t("typeQr") : t("typeUrl");
    const time = formatTime(item.timestamp);
    return `<div class="history-item" role="listitem"><div class="history-status-icon ${item.result}"><i class="ph-bold ${icon}"></i></div><div class="history-info"><div class="history-url" title="${item.url}">${item.url}</div><div class="history-meta"><i class="ph-bold ph-clock"></i> ${time} &middot; ${typeText}</div></div><span class="history-result ${item.result}">${resultText}</span></div>`;
  }).join("");
}

function clearScanHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderLocalHistory();
}

function formatTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("justNow");
  if (m < 60) return `${m} ${t("minutesAgo")}`;
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h} ${t("hoursAgo")}`;
  return `${Math.floor(diff / 86400000)} ${t("daysAgo")}`;
}

// ==============================================================================
// Keyboard
// ==============================================================================
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.key === "Escape") { dismissResult(); showLoading(false); closeQrPanel(); }
});

// ==============================================================================
// Init
// ==============================================================================
document.addEventListener("DOMContentLoaded", () => {
  applyTheme(currentTheme);
  applyLanguage();
  renderLocalHistory();
  welcomeMessage();

  // Focus URL input immediately
  setTimeout(() => { const i = $("#url-input"); if (i) i.focus(); }, 300);

  $("#theme-toggle")?.addEventListener("click", toggleTheme);
  $("#lang-toggle")?.addEventListener("click", toggleLanguage);
  $("#scan-btn")?.addEventListener("click", handleUrlSubmit);
  $("#qr-toggle-btn")?.addEventListener("click", toggleQrPanel);
  $("#close-qr-btn")?.addEventListener("click", closeQrPanel);
  $("#result-overlay")?.addEventListener("click", dismissResult);
  $("#clear-history-btn")?.addEventListener("click", clearScanHistory);
  $("#url-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") handleUrlSubmit(); });
});
