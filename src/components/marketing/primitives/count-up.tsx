"use client";

import * as React from "react";

/**
 * Animates a number from `from` to `to` on first intersection (1.1 s, cubic
 * ease-out). Server HTML already contains the final value, so crawlers and
 * no-JS users see the real number.
 */
export function CountUp({
  to,
  from = 0,
  className,
  format = (n) => String(n),
}: {
  to: number;
  from?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [value, setValue] = React.useState(to);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window) || document.hidden) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now();
        const dur = 1100;
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          setValue(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [from, to]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {format(value)}
    </span>
  );
}
