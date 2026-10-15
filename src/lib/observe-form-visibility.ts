/** Start form-only work near the viewport or on the visitor's first interaction. */
export function observeFormVisibility(
  widget: HTMLElement,
  activate: () => void,
) {
  const target = widget.closest("form") ?? widget;
  let stopped = false;
  let observer: IntersectionObserver | null = null;

  const cleanup = () => {
    stopped = true;
    observer?.disconnect();
    target.removeEventListener("focusin", start);
    target.removeEventListener("pointerdown", start);
  };
  const start = () => {
    if (stopped) return;
    cleanup();
    activate();
  };

  target.addEventListener("focusin", start);
  target.addEventListener("pointerdown", start, { passive: true });

  // Do not strand visitors on older browsers or when they focused before hydration.
  if (
    typeof IntersectionObserver === "undefined" ||
    (document.activeElement && target.contains(document.activeElement))
  ) {
    start();
    return cleanup;
  }

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) start();
    },
    { rootMargin: "400px 0px" },
  );
  observer.observe(target);
  return cleanup;
}
