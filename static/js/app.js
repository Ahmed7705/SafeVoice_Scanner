/**
 * SafeVoice Scanner - Core Application Logic
 * Voice-guided cybersecurity tool for visually impaired users.
 * Handles: Speech, QR scanning, URL checking, theming, i18n, and history.
 */

// ==============================================================================
// Translations (English & Arabic)
// ==============================================================================
const TRANSLATIONS = {
  en: {
    welcomeVoice: "Welcome to SafeVoice Scanner. Your secure link and QR code checker. Please choose: press 1 to check a URL, or press 2 to scan a QR code.",
    heroTitle: 'SafeVoice <span class="gradient-text">Scanner</span>',
    heroSubtitle: "Secure link & QR code checker for everyone",
    checkUrlLabel: "Check URL",
    checkUrlDesc: "Paste or type a link",
    scanQrLabel: "Scan QR Code",
    scanQrDesc: "Use your camera",
    urlPlaceholder: "Paste or type a URL here...",
    scanButton: "Scan",
    stopCamera: "Stop Camera",
    historyTitle: "📋 Scan History",
    clearHistory: "Clear",
    historyEmpty: "No scans yet. Start by checking a URL or scanning a QR code.",
    historyEmptyIcon: "🔍",
    resultSafe: "The link is safe",
    resultDangerous: "Warning! The link is dangerous",
    resultSafeTitle: "Safe",
    resultDangerousTitle: "Dangerous",
    resultDismiss: "Tap anywhere to dismiss",
    loadingText: "Analyzing link...",
    loadingVoice: "Analyzing the link. Please wait.",
    voiceSafe: "The link is safe. You can proceed.",
    voiceDangerous: "Warning! The link is dangerous. Do not open it.",
    errorNoUrl: "Please enter a URL to check.",
    errorGeneral: "An error occurred. Please try again.",
    heuristicLabel: "Heuristic Score",
    apiLabel: "API Result",
    typeUrl: "URL",
    typeQr: "QR",
    langLabel: "AR",
    safe: "Safe",
    dangerous: "Dangerous",
    ago: "ago",
    justNow: "Just now",
    minutesAgo: "min ago",
    hoursAgo: "hr ago",
    daysAgo: "d ago",
  },
  ar: {
    welcomeVoice: "مرحباً بك في سيف فويس سكانر. فاحص الروابط ورموز QR الآمن. اختر: اضغط 1 لفحص رابط، أو اضغط 2 لمسح رمز QR.",
    heroTitle: 'سيف فويس <span class="gradient-text">سكانر</span>',
    heroSubtitle: "فاحص الروابط ورموز QR الآمن للجميع",
    checkUrlLabel: "فحص رابط",
    checkUrlDesc: "الصق أو اكتب رابط",
    scanQrLabel: "مسح رمز QR",
    scanQrDesc: "استخدم الكاميرا",
    urlPlaceholder: "الصق أو اكتب الرابط هنا...",
    scanButton: "فحص",
    stopCamera: "إيقاف الكاميرا",
    historyTitle: "📋 سجل الفحص",
    clearHistory: "مسح",
    historyEmpty: "لا توجد عمليات فحص بعد. ابدأ بفحص رابط أو مسح رمز QR.",
    historyEmptyIcon: "🔍",
    resultSafe: "الرابط آمن",
    resultDangerous: "تحذير! الرابط خطير",
    resultSafeTitle: "آمن",
    resultDangerousTitle: "خطير",
    resultDismiss: "اضغط في أي مكان للإغلاق",
    loadingText: "جاري تحليل الرابط...",
    loadingVoice: "جاري تحليل الرابط. يرجى الانتظار.",
    voiceSafe: "الرابط آمن. يمكنك المتابعة.",
    voiceDangerous: "تحذير! الرابط خطير. لا تفتحه.",
    errorNoUrl: "يرجى إدخال رابط للفحص.",
    errorGeneral: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    heuristicLabel: "درجة التحليل",
    apiLabel: "نتيجة API",
    typeUrl: "رابط",
    typeQr: "QR",
    langLabel: "EN",
    safe: "آمن",
    dangerous: "خطير",
    ago: "مضت",
    justNow: "الآن",
    minutesAgo: "دقيقة",
    hoursAgo: "ساعة",
    daysAgo: "يوم",
  }
};

// ==============================================================================
// Application State
// ==============================================================================
let currentLang = localStorage.getItem("sv_lang") || "en";
let currentTheme = localStorage.getItem("sv_theme") || "system";
let qrScanner = null;
let isScanning = false;

// ==============================================================================
// DOM References
// ==============================================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ==============================================================================
// Theme Management
// ==============================================================================
function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.setAttribute("data-theme", resolved);
  const btn = $("#theme-toggle");
  if (btn) btn.textContent = resolved === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
  // Cycle: system -> light -> dark -> system
  if (currentTheme === "system") {
    currentTheme = getSystemTheme() === "dark" ? "light" : "dark";
  } else if (currentTheme === "light") {
    currentTheme = "dark";
  } else {
    currentTheme = "light";
  }
  localStorage.setItem("sv_theme", currentTheme);
  applyTheme(currentTheme);
}

// Listen for system theme changes
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (currentTheme === "system") applyTheme("system");
});

// ==============================================================================
// Language Management
// ==============================================================================
function t(key) {
  return TRANSLATIONS[currentLang][key] || key;
}

function applyLanguage() {
  const isAr = currentLang === "ar";
  document.documentElement.setAttribute("dir", isAr ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", currentLang);

  // Update all translatable elements
  const els = $$("[data-i18n]");
  els.forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.placeholder = t(key);
    } else {
      el.innerHTML = t(key);
    }
  });

  // Update language button text
  const langBtn = $("#lang-toggle");
  if (langBtn) langBtn.textContent = t("langLabel");
}

function toggleLanguage() {
  currentLang = currentLang === "en" ? "ar" : "en";
  localStorage.setItem("sv_lang", currentLang);
  applyLanguage();
  loadHistory();
}

// ==============================================================================
// Speech Engine (Web Speech API)
// ==============================================================================
function speak(text, lang) {
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === "ar" ? "ar-SA" : "en-US";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;

  // Try to find a matching voice
  const voices = window.speechSynthesis.getVoices();
  const targetLang = lang === "ar" ? "ar" : "en";
  const matchedVoice = voices.find(v => v.lang.startsWith(targetLang));
  if (matchedVoice) utterance.voice = matchedVoice;

  window.speechSynthesis.speak(utterance);
}

function welcomeMessage() {
  // Small delay to ensure voices are loaded
  setTimeout(() => {
    speak(t("welcomeVoice"), currentLang);
  }, 800);
}

// Ensure voices are loaded
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {};
}

// ==============================================================================
// Panel Management
// ==============================================================================
function showPanel(panelId) {
  // Hide all panels
  $$(".panel").forEach(p => p.classList.remove("visible"));

  // Deactivate all action cards
  $$(".action-card").forEach(c => c.classList.remove("active"));

  // Show the selected panel
  const panel = $(`#${panelId}`);
  if (panel) panel.classList.add("visible");

  // Activate the corresponding card
  const cardId = panelId === "url-panel" ? "card-url" : "card-qr";
  const card = $(`#${cardId}`);
  if (card) card.classList.add("active");

  // If QR panel, start scanner
  if (panelId === "qr-panel") {
    startQrScanner();
  } else {
    stopQrScanner();
    // Focus on URL input
    setTimeout(() => {
      const input = $("#url-input");
      if (input) input.focus();
    }, 100);
  }
}

// ==============================================================================
// URL Checking
// ==============================================================================
async function checkUrl(url, scanType = "url") {
  if (!url || !url.trim()) {
    speak(t("errorNoUrl"), currentLang);
    return;
  }

  // Show loading
  showLoading(true);
  speak(t("loadingVoice"), currentLang);

  try {
    const response = await fetch("/api/check-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), scan_type: scanType })
    });

    const data = await response.json();
    showLoading(false);

    if (data.error) {
      speak(t("errorGeneral"), currentLang);
      return;
    }

    // Show result
    showResult(data);

    // Refresh history
    loadHistory();
  } catch (err) {
    console.error("Check URL error:", err);
    showLoading(false);
    speak(t("errorGeneral"), currentLang);
  }
}

function handleUrlSubmit() {
  const input = $("#url-input");
  if (input) {
    checkUrl(input.value, "url");
  }
}

// ==============================================================================
// QR Code Scanner
// ==============================================================================
function startQrScanner() {
  if (isScanning || !window.Html5Qrcode) return;

  const reader = $("#qr-reader");
  if (!reader) return;

  qrScanner = new Html5Qrcode("qr-reader");
  isScanning = true;

  qrScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      // QR code successfully scanned
      stopQrScanner();
      checkUrl(decodedText, "qr");
    },
    (errorMessage) => {
      // QR scan error (e.g., no QR in frame) - silently ignore
    }
  ).catch(err => {
    console.error("QR Scanner start error:", err);
    isScanning = false;
  });
}

function stopQrScanner() {
  if (qrScanner && isScanning) {
    qrScanner.stop().then(() => {
      isScanning = false;
      qrScanner = null;
    }).catch(() => {
      isScanning = false;
      qrScanner = null;
    });
  }
}

// ==============================================================================
// Loading Overlay
// ==============================================================================
function showLoading(show) {
  const overlay = $("#loading-overlay");
  if (overlay) {
    if (show) {
      overlay.classList.add("visible");
    } else {
      overlay.classList.remove("visible");
    }
  }
}

// ==============================================================================
// Result Overlay
// ==============================================================================
function showResult(data) {
  const overlay = $("#result-overlay");
  if (!overlay) return;

  const isSafe = data.result === "safe";

  // Remove previous classes
  overlay.classList.remove("safe", "dangerous");
  overlay.classList.add(isSafe ? "safe" : "dangerous");

  // Update content
  $("#result-icon").textContent = isSafe ? "✅" : "🚨";
  $("#result-title").textContent = isSafe ? t("resultSafeTitle") : t("resultDangerousTitle");
  $("#result-url").textContent = data.url;

  // Build details badges
  const detailsEl = $("#result-details");
  detailsEl.innerHTML = "";

  // Heuristic score badge
  const hBadge = document.createElement("span");
  hBadge.className = "result-badge";
  hBadge.textContent = `${t("heuristicLabel")}: ${data.heuristic_score}/100`;
  detailsEl.appendChild(hBadge);

  // API result badge
  const aBadge = document.createElement("span");
  aBadge.className = "result-badge";
  aBadge.textContent = `${t("apiLabel")}: ${data.api_result}`;
  detailsEl.appendChild(aBadge);

  // Threat type badges
  if (data.threat_types && data.threat_types.length > 0) {
    data.threat_types.forEach(tt => {
      const badge = document.createElement("span");
      badge.className = "result-badge";
      badge.textContent = tt;
      detailsEl.appendChild(badge);
    });
  }

  $("#result-dismiss-text").textContent = t("resultDismiss");

  // Show overlay
  overlay.classList.add("visible");

  // Speak result
  if (isSafe) {
    speak(t("voiceSafe"), currentLang);
  } else {
    speak(t("voiceDangerous"), currentLang);
  }
}

function dismissResult() {
  const overlay = $("#result-overlay");
  if (overlay) overlay.classList.remove("visible");
  window.speechSynthesis.cancel();
}

// ==============================================================================
// Scan History
// ==============================================================================
async function loadHistory() {
  try {
    const response = await fetch("/api/history");
    const data = await response.json();
    renderHistory(data.history || []);
  } catch (err) {
    console.error("Load history error:", err);
  }
}

function renderHistory(history) {
  const list = $("#history-list");
  if (!list) return;

  if (!history.length) {
    list.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon">${t("historyEmptyIcon")}</div>
        <div>${t("historyEmpty")}</div>
      </div>
    `;
    return;
  }

  list.innerHTML = history.map(item => {
    const isSafe = item.result === "safe";
    const resultText = isSafe ? t("safe") : t("dangerous");
    const scanTypeText = item.scan_type === "qr" ? t("typeQr") : t("typeUrl");
    const timeText = formatTime(item.timestamp);

    return `
      <div class="history-item" role="listitem" aria-label="${item.url} - ${resultText}">
        <div class="history-dot ${item.result}"></div>
        <div class="history-info">
          <div class="history-url" title="${item.url}">${item.url}</div>
          <div class="history-meta">${scanTypeText} • ${timeText}</div>
        </div>
        <span class="history-result ${item.result}">${resultText}</span>
      </div>
    `;
  }).join("");
}

async function clearScanHistory() {
  try {
    await fetch("/api/history", { method: "DELETE" });
    loadHistory();
  } catch (err) {
    console.error("Clear history error:", err);
  }
}

function formatTime(isoStr) {
  if (!isoStr) return "";
  const date = new Date(isoStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t("justNow");
  if (diffMin < 60) return `${diffMin} ${t("minutesAgo")}`;
  if (diffHr < 24) return `${diffHr} ${t("hoursAgo")}`;
  return `${diffDay} ${t("daysAgo")}`;
}

// ==============================================================================
// Keyboard Shortcuts (Accessibility)
// ==============================================================================
document.addEventListener("keydown", (e) => {
  // 1 key = Check URL, 2 key = Scan QR
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  if (e.key === "1") {
    showPanel("url-panel");
  } else if (e.key === "2") {
    showPanel("qr-panel");
  } else if (e.key === "Escape") {
    dismissResult();
    showLoading(false);
  }
});

// ==============================================================================
// Initialization
// ==============================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Apply theme
  applyTheme(currentTheme);

  // Apply language
  applyLanguage();

  // Load history
  loadHistory();

  // Welcome voice (only on first visit or page load)
  welcomeMessage();

  // Event Listeners
  $("#theme-toggle")?.addEventListener("click", toggleTheme);
  $("#lang-toggle")?.addEventListener("click", toggleLanguage);
  $("#card-url")?.addEventListener("click", () => showPanel("url-panel"));
  $("#card-qr")?.addEventListener("click", () => showPanel("qr-panel"));
  $("#scan-btn")?.addEventListener("click", handleUrlSubmit);
  $("#stop-qr-btn")?.addEventListener("click", () => {
    stopQrScanner();
    $$(".panel").forEach(p => p.classList.remove("visible"));
    $$(".action-card").forEach(c => c.classList.remove("active"));
  });
  $("#result-overlay")?.addEventListener("click", dismissResult);
  $("#clear-history-btn")?.addEventListener("click", clearScanHistory);

  // URL input enter key
  $("#url-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleUrlSubmit();
  });
});
