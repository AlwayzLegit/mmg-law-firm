import Image from "next/image";

import { mediaUrl } from "@/lib/media";

/** County "Court information" card beside the courthouse photo. */
export function CourtInfo({ county, seat, address }: { county: string; seat: string; address: string | null }) {
  return (
    <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-3.5">
      <div className="bg-card border-line rounded-2xl border p-6">
        <h2 className="micro-label text-stone m-0">Court information</h2>
        <p className="font-display m-0 mt-2 text-[26px] leading-[1.1] font-semibold tracking-[-0.02em]">
          {county} Superior Court
        </p>
        <p className="text-stone m-0 mt-2.5 text-[14.5px]">
          The county seat is {seat}. Most {county} personal-injury matters are filed in the {county} Superior Court.
        </p>
        {address ? (
          <address className="bg-paper mt-3.5 rounded-xl px-4 py-3.5 text-sm leading-[1.5] whitespace-pre-line not-italic">
            {address}
          </address>
        ) : null}
      </div>
      <div className="bg-ink-soft relative min-h-[220px] overflow-hidden rounded-2xl">
        <Image
          src={mediaUrl("loc-courthouse.webp")}
          alt={`${county} courthouse`}
          fill
          sizes="(min-width: 1024px) 400px, 100vw"
          className="object-cover"
        />
      </div>
    </section>
  );
}
