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
// Load the 196 KB library after the page, so it doesn't compete with the
// hero and CSS on phones. Commands above wait in dataLayer until it runs.
// Not next/script lazyOnload: on production it never loaded the library
// (requestIdleCallback with no timeout). Idle with a 3 s cap, then load.
function loadGtag() {
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(s);
}
function schedule() {
  if (window.requestIdleCallback) window.requestIdleCallback(loadGtag, { timeout: 3000 });
  else setTimeout(loadGtag, 1500);
}
if (typeof document.createElement !== 'function') return;
if (document.readyState === 'complete') schedule();
else window.addEventListener('load', schedule, { once: true });
})();`;
}
