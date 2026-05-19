// ─── Network state + pending send queue ───
// Tracks online/offline and shows a gentle banner.
// Lets callers register flush handlers that run on reconnect.

var listeners = [];
var flushers = [];
var bannerEl = null;
var bannerTextEl = null;

function getBanner() {
  if (!bannerEl) bannerEl = document.getElementById("offlineBanner");
  if (!bannerTextEl) bannerTextEl = document.getElementById("offlineBannerText");
  return bannerEl;
}

export function isOnline() {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

function applyState(online) {
  var b = getBanner();
  if (b) {
    if (online) {
      b.classList.remove("offline-banner-visible");
    } else {
      b.classList.add("offline-banner-visible");
      if (bannerTextEl) {
        bannerTextEl.textContent = "You're offline — messages will send when you're back.";
      }
    }
  }
  for (var i = 0; i < listeners.length; i++) {
    try { listeners[i](online); } catch (e) {}
  }
  if (online) {
    runFlushers();
  }
}

function runFlushers() {
  for (var i = 0; i < flushers.length; i++) {
    try { flushers[i](); } catch (e) {}
  }
}

export function onConnectivityChange(fn) {
  listeners.push(fn);
}

export function registerFlushOnReconnect(fn) {
  flushers.push(fn);
}

export function showReconnectingBanner() {
  var b = getBanner();
  if (b && bannerTextEl) {
    bannerTextEl.textContent = "Reconnecting...";
    b.classList.add("offline-banner-visible");
    setTimeout(function () {
      if (isOnline()) b.classList.remove("offline-banner-visible");
    }, 1400);
  }
}

export function initNetworkMonitor() {
  window.addEventListener("online", function () { applyState(true); });
  window.addEventListener("offline", function () { applyState(false); });
  // initial state — only show if already offline
  if (!isOnline()) applyState(false);
}
