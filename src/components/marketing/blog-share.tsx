import { Mail } from "lucide-react";

import { CopyLinkButton } from "./blog-share-copy";

/**
 * Server-rendered "share this post" links. No JS — each anchor opens the
 * platform's share intent (X, LinkedIn, email). Copy-link is a tiny client
 * island; everything else is plain anchors so the sidebar stays light.
 */
export function BlogShare({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const items = [
    {
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      icon: XIcon,
    },
    {
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      icon: LinkedInIcon,
    },
    {
      label: "Share by email",
      href: `mailto:?subject=${t}&body=${u}`,
      icon: Mail,
    },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map(({ label, href, icon: Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener"
          aria-label={label}
          className="border-border text-muted-foreground hover:border-primary/40 hover:text-primary inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors"
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </a>
      ))}
      <CopyLinkButton url={url} />
    </div>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45zM5.34 7.44a2.07 2.07 0 1 1 0-4.15 2.07 2.07 0 0 1 0 4.15zm1.77 13.01H3.56V9h3.55zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.46C23.21 24 24 23.22 24 22.27V1.73C24 .77 23.21 0 22.23 0z" />
    </svg>
  );
}

/** Plain X glyph — lucide's Twitter bird is the old brand. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
