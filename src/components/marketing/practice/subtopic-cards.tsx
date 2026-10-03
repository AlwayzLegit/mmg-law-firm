import { createElement } from "react";
import { Scale, ShieldCheck, TriangleAlert, type LucideIcon } from "lucide-react";

import type { Subtopic } from "@/lib/data/practice-area-content";

import { IconTile } from "../primitives/icon-tile";
import { resolveIcon } from "../primitives/resolve-icon";

/** "What we handle" subtopic cards: white, 40px gold icon tile, h3 + body. */
export function SubtopicCards({
  subtopics,
  areaIcon,
  heading = "What we handle",
  id,
}: {
  subtopics: Subtopic[];
  /** Lucide icon name of the practice area (first card). */
  areaIcon: string;
  heading?: string;
  id?: string;
}) {
  if (subtopics.length === 0) return null;
  const icons: LucideIcon[] = [resolveIcon(areaIcon), TriangleAlert, ShieldCheck, Scale];
  return (
    <section id={id} className="mt-14 scroll-mt-[130px]">
      <h2 className="text-display-sm font-semibold">{heading}</h2>
      <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        {subtopics.map((s, i) => (
          <div key={s.title} className="bg-card border-line rounded-[14px] border p-5">
            <IconTile size="md" tone="gold">
              {createElement(icons[i % icons.length], { "aria-hidden": true })}
            </IconTile>
            <h3 className="font-display mt-3.5 text-[21px] leading-[1.2] font-semibold tracking-[-0.01em]">{s.title}</h3>
            <p className="text-stone mt-2 text-sm leading-[1.55]">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
