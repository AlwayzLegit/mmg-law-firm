import { cn } from "@/lib/utils";

/**
 * Infinite marquee band under the hero. Pure CSS (`--animate-marquee`); the
 * list is duplicated so the loop is seamless. Items are decorative repeats
 * of facts already stated in the hero, so the duplicate is aria-hidden.
 */
export function Ticker({ items, className }: { items: string[]; className?: string }) {
  const row = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="m-0 flex list-none items-center p-0"
    >
      {items.map((t, i) => (
        <li
          key={i}
          className="text-cream/70 inline-flex items-center gap-[18px] px-[18px] text-[12.5px] font-semibold tracking-[0.14em] uppercase whitespace-nowrap"
        >
          {t}
          <span aria-hidden className="bg-gold h-[5px] w-[5px] rounded-full" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className={cn("flex h-12 items-center overflow-hidden", className)}>
      <div className="animate-marquee flex w-max motion-reduce:animate-none">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
