/** Runs before the Google config command. Kept as a testable inline bootstrap:
 * no runtime SDK import, public pageview/advertising/consent behavior unchanged. */
export function googleAnalyticsInit(gaId: string): string {
  const id = JSON.stringify(gaId).replace(/</g, "\\u003c");
  return `(function () {
var id = ${id};
var privatePath = /^\\/(?:admin|login|forgot-password|reset-password|onboarding|auth)(?:\\/|$)/i;
function decodedPath(path) { try { return decodeURIComponent(path); } catch (_) { return path; } }
if (privatePath.test(decodedPath(window.location.pathname))) {
  window['ga-disable-' + id] = true;
  return;
}
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
// Google Signals beacons to stats.g.doubleclick.net, which the CSP blocks on
// purpose (no advertising hosts), so it only ever produced a console error.
var config = { send_page_view: true, allow_google_signals: false };
try {
  var ref = new URL(document.referrer);
  var host = ref.hostname.replace(/^www\\./, '');
  var own = window.location.hostname.replace(/^www\\./, '');
  if ((host === own || host === 'mmg-lawfirm.com') && privatePath.test(decodedPath(ref.pathname))) {
    config.page_referrer = '';
  }
} catch (_) {}
window.gtag('js', new Date());
window.gtag('config', id, config);
// Load the 196 KB library when the visitor first touches, scrolls, types or
// moves the mouse, or after 20 s for one who only reads. Loaded on a timer
// it cost phones about 0.5 s of main-thread work right after the page
// appeared. Commands above wait in dataLayer until it runs. A visitor who
// leaves within 20 s without interacting is not counted (owner-approved
// trade-off, 2026-11-09). Same rule as afterFirstInteraction in
// after-page-idle.ts, which this inline script cannot import.
function loadGtag() {
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(s);
}
if (typeof document.createElement !== 'function' || typeof window.addEventListener !== 'function') return;
var events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart', 'wheel'];
var opts = { capture: true, passive: true };
var started = false;
var timer;
function start() {
  if (started) return;
  started = true;
  for (var i = 0; i < events.length; i++) window.removeEventListener(events[i], start, opts);
  clearTimeout(timer);
  // Not inside the event handler: the tap or scroll must stay responsive.
  if (window.requestIdleCallback) window.requestIdleCallback(loadGtag, { timeout: 2000 });
  else setTimeout(loadGtag, 200);
}
for (var i = 0; i < events.length; i++) window.addEventListener(events[i], start, opts);
timer = setTimeout(start, 20000);
})();`;
}
