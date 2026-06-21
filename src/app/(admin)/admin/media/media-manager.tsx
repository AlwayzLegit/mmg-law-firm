"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, CopyMinus, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

import { deleteMedia, removeDuplicateMedia, uploadMedia } from "./actions";

export type MediaItem = { name: string; url: string };

export default function MediaManager({ items }: { items: MediaItem[] }) {
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  function onPick() {
    inputRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const result = await uploadMedia(fd);
      if (result.ok) toast.success("Uploaded.");
      else toast.error(result.error);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function onCopy(url: string) {
    navigator.clipboard.writeText(url).then(
      () => toast.success("URL copied."),
      () => toast.error("Couldn't copy."),
    );
  }

  function onDelete(name: string) {
    if (!window.confirm("Delete this image?")) return;
    const fd = new FormData();
    fd.set("name", name);
    startTransition(async () => {
      const result = await deleteMedia(fd);
      if (result.ok) toast.success("Deleted.");
      else toast.error(result.error);
    });
  }

  function onDedupe() {
    if (
      !window.confirm(
        "Remove duplicate uploads (identical files), keeping one of each?",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await removeDuplicateMedia();
      if (result.ok) {
        toast.success(
          result.removed === 0
            ? "No duplicates found."
            : `Removed ${result.removed} duplicate${result.removed === 1 ? "" : "s"}.`,
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid gap-6">
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
          onChange={onFile}
          className="hidden"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onPick} disabled={pending} className="gap-1.5">
            <Upload className="h-4 w-4" aria-hidden />
            {pending ? "Working…" : "Upload image"}
          </Button>
          <Button
            variant="outline"
            onClick={onDedupe}
            disabled={pending}
            className="gap-1.5"
          >
            <CopyMinus className="h-4 w-4" aria-hidden />
            Remove duplicates
          </Button>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          PNG, JPG, WebP, GIF, AVIF, or SVG · up to 10 MB. Copy a URL and paste
          it into a hero-image field.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No images yet. Upload one above.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <li
              key={m.name}
              className="border-border bg-card overflow-hidden rounded-lg border"
            >
              <div className="bg-secondary aspect-[4/3] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={m.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <button
                  type="button"
                  onClick={() => onCopy(m.url)}
                  className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  Copy URL
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(m.name)}
                  disabled={pending}
                  aria-label={`Delete ${m.name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
