import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight } from "lucide-react";

import { FIRM } from "@/lib/constants";

type Props = {
  /** Lower-cased practice label for the heading, e.g. "car accidents",
   *  "employment law". */
  practiceLabel: string;
  /** Markdown paragraph from getAttorneyHelp(). */
  body: string;
  id?: string;
};

/**
 * "How our attorney helps with {practice}" — ink card with the "working the
 * file" photo. Names the attorney and describes how he personally handles
 * this kind of matter. Rendered on the practice hub and every city × practice
 * page.
 */
export function AttorneyHelpSection({ practiceLabel, body, id }: Props) {
  return (
    <section
      id={id}
      className="surface-ink bg-background text-foreground mt-14 grid scroll-mt-[130px] grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] overflow-hidden rounded-[18px]"
    >
      <div className="bg-ink-soft relative min-h-[280px]">
        <Image
          src="/brand/working-the-file.webp"
          alt={`${FIRM.attorneyName} working a client file`}
          fill
          sizes="(min-width: 1024px) 420px, 100vw"
          className="object-cover"
        />
      </div>
      <div className="px-[34px] py-8 max-sm:px-6">
        <p className="text-gold m-0 text-[11px] font-semibold tracking-[0.16em] uppercase">Our attorney</p>
        <h2 className="text-cream mt-2.5 text-[clamp(26px,2.6vw,34px)] leading-[1.1] font-semibold tracking-[-0.02em]">
          How {FIRM.attorneyName} helps with {practiceLabel}
        </h2>
        <div className="prose-v2 prose-invert text-cream/74 mt-3.5 text-[15px] leading-[1.65] [&_p]:my-0 [&_p+p]:mt-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </div>
        <Link
          href="/attorneys/mihran-ghazaryan"
          className="text-gold hover:text-gold-light mt-5 inline-flex items-center gap-2 text-[13px] font-semibold no-underline transition-colors"
        >
          Meet {FIRM.attorneyName.split(" ")[0]}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
