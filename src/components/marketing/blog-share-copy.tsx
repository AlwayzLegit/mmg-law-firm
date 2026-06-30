"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Link2 } from "lucide-react";

/** Tiny client island for the copy-link button. */
export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied.");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — long-press the URL bar instead.");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy link to this post"
      className="border-border text-muted-foreground hover:border-primary/40 hover:text-primary inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Link2 className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  );
}
