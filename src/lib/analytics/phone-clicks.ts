import { track } from "./track";

/** One delegated listener owned by the lightweight loader, not the deferred
 * SDK. Records only the existing page-path field, never the phone number,
 * URL query, form values or case narrative. Does not intercept navigation. */
export function startPhoneClickTracking(): () => void {
  function onClick(event: MouseEvent) {
    const target = event.target as Element | null;
    if (!target?.closest?.('a[href^="tel:"]')) return;
    track("phone_click", { pathname: window.location.pathname });
  }
  document.addEventListener("click", onClick, { capture: true });
  return () =>
    document.removeEventListener("click", onClick, { capture: true });
}
