/** Runs before the Google config command. Kept as a testable inline bootstrap:
 * no runtime SDK import, public pageview/advertising/consent behavior unchanged. */
export function googleAnalyticsInit(gaId: string): string {
  const id = JSON.stringify(gaId).replace(/</g, "\\u003c");
  return `(function () {
var id = ${id};
var privatePath = /^\\/(?:admin|login|onboarding|auth)(?:\\/|$)/i;
function decodedPath(path) { try { return decodeURIComponent(path); } catch (_) { return path; } }
if (privatePath.test(decodedPath(window.location.pathname))) {
  window['ga-disable-' + id] = true;
  return;
}
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
var config = { send_page_view: true };
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
})();`;
}
