"use client";

/**
 * Live "how this looks in search + social" preview for content editors.
 * Renders a Google-style result snippet and an Open Graph card from the
 * same fields the page will emit. Pure presentation — no data fetching.
 */
export default function SeoPreview({
  path,
  title,
  description,
  imageUrl,
}: {
  path: string;
  title: string;
  description: string;
  imageUrl?: string;
}) {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mmg-lawfirm.com"
  ).replace(/\/$/, "");
  const host = base.replace(/^https?:\/\//, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const displayTitle = title.trim() || "Untitled";
  const displayDesc = description.trim();
  const titleTooLong = displayTitle.length > 60;
  const descLen = displayDesc.length;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Google result snippet */}
      <div className="border-border bg-card rounded-lg border p-4">
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-[0.18em] uppercase">
          Google result
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {host}
          <span className="text-muted-foreground/70">{cleanPath}</span>
        </p>
        <p className="mt-0.5 line-clamp-1 text-lg leading-tight text-[#1a0dab] dark:text-[#8ab4f8]">
          {displayTitle}
        </p>
        {displayDesc ? (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
            {displayDesc}
          </p>
        ) : (
          <p className="text-warning mt-1 text-sm italic">
            No meta description — Google will guess one from the page.
          </p>
        )}
        <p className="text-muted-foreground mt-2 text-[11px]">
          Title {displayTitle.length} chars
          {titleTooLong ? " (may be truncated past ~60)" : ""} · Description{" "}
          {descLen}/160 ideal
        </p>
      </div>

      {/* Open Graph / social card */}
      <div className="border-border bg-card overflow-hidden rounded-lg border">
        <div className="border-border text-muted-foreground border-b px-4 py-2 text-xs font-medium tracking-[0.18em] uppercase">
          Social card
        </div>
        <div className="bg-secondary relative aspect-[1.91/1] w-full">
          {imageUrl ? (
            // Arbitrary user-entered URL; next/image would need every host
            // allow-listed, so a plain <img> is intentional here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
              No image — a default OG image is used
            </div>
          )}
        </div>
        <div className="px-4 py-3">
          <p className="text-muted-foreground text-[11px] uppercase">{host}</p>
          <p className="mt-0.5 line-clamp-2 text-sm font-medium">
            {displayTitle}
          </p>
          {displayDesc ? (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              {displayDesc}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
