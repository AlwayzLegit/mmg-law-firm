"use client";

import * as React from "react";

/**
 * Reveal-on-scroll. The children are ALWAYS in the server HTML; this island
 * only adds a fade/translate once the browser confirms IntersectionObserver
 * exists and motion is allowed. Safety nets (visibility change, print, 8 s
 * timeout) guarantee content is never left hidden — mirrors fx.js in the
 * design handoff.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
}: {
  children: React.ReactNode;
  /** Stagger in ms. */
  delay?: number;
  as?: "div" | "section" | "li" | "article";
  className?: string;
}) {
  const ref = React.useRef<HTMLElement | null>(null);
  const [state, setState] = React.useState<"idle" | "pending" | "in">("idle");

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window) || reduce || document.hidden) return;
    // Already on screen → no animation (avoids a flash on first paint).
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    setState("pending");
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      setState("in");
      io.disconnect();
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && show()),
      { threshold: 0.06, rootMargin: "0px 0px -4% 0px" },
    );
    io.observe(el);
    const onVis = () => document.hidden && show();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeprint", show);
    const t = setTimeout(show, 8000);
    return () => {
      io.disconnect();
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeprint", show);
    };
  }, []);

  return (
    <Tag
      // @ts-expect-error — polymorphic ref
      ref={ref}
      className={[className, state === "pending" ? "reveal-pending" : "", state === "in" ? "reveal-in" : ""]
        .filter(Boolean)
        .join(" ")}
      style={state === "in" && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
