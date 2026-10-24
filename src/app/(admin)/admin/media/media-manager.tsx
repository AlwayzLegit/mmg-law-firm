"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, CopyMinus, Link2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  deleteMedia,
  importMediaFromUrl,
  removeDuplicateMedia,
  uploadMedia,
} from "./actions";

export type MediaItem = {
  name: string;
  url: string;
  createdAt?: string | null;
  bytes?: number | null;
};

/** "1792790137186-2ab90974-quid-pro-quo-harassment-california.webp" → the
 *  human part; uploads are prefixed with a timestamp and a short hash. */
export function displayName(name: string): string {
  return name.replace(/^\d{10,}-[0-9a-f]{6,}-/, "");
}

function formatBytes(n: number | null | undefined): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaManager({ items }: { items: MediaItem[] }) {
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [importUrl, setImportUrl] = React.useState("");
  const [importName, setImportName] = React.useState("");
  const [query, setQuery] = React.useState("");

  const q = query.trim().toLowerCase();
  const visible = q
    ? items.filter((m) => m.name.toLowerCase().includes(q))
    : items;

  function onImport() {
    const url = importUrl.trim();
    if (url === "") return;
    const fd = new FormData();
    fd.set("url", url);
    if (importName.trim()) fd.set("name", importName.trim());
    startTransition(async () => {
      const result = await importMediaFromUrl(fd);
      if (result.ok) {
        toast.success(`Imported as ${result.name}.`);
        setImportUrl("");
        setImportName("");
      } else {
        toast.error(result.error);
      }
    });
  }

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

        <div className="border-border mt-4 rounded-lg border border-dashed p-3">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Link2 className="text-primary h-4 w-4" aria-hidden />
            Import from URL
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Fetches a remote image into the bucket (handy for AI-generated
            images). Optionally set a fixed name so code can reference it.
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs">
              <span className="text-muted-foreground">Image URL</span>
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://…/image.webp"
                className="border-border bg-background focus:ring-ring h-9 w-72 rounded-md border px-2 text-sm focus:ring-2 focus:outline-none"
              />
            </label>
            <label className="grid gap-1 text-xs">
              <span className="text-muted-foreground">Name (optional)</span>
              <input
                type="text"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="pa-car-accidents.webp"
                maxLength={80}
                className="border-border bg-background focus:ring-ring h-9 w-56 rounded-md border px-2 text-sm focus:ring-2 focus:outline-none"
              />
            </label>
            <Button
              variant="outline"
              onClick={onImport}
              disabled={pending || importUrl.trim() === ""}
              className="gap-1.5"
            >
              <Link2 className="h-4 w-4" aria-hidden />
              Import
            </Button>
          </div>
        </div>
      </div>

      {items.length > 0 ? (
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground sr-only">Search images</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${items.length} images by file name…`}
            className="border-border bg-background focus:ring-ring h-9 w-full max-w-md rounded-md border px-3 text-sm focus:ring-2 focus:outline-none"
          />
          {q ? (
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              {visible.length} match{visible.length === 1 ? "" : "es"}
            </span>
          ) : null}
        </label>
      ) : null}

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No images yet. Upload one above.
        </p>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">No image matches “{query}”.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((m) => (
            <li
              key={m.name}
              className="border-border bg-card overflow-hidden rounded-lg border"
            >
              <div className="bg-secondary aspect-[4/3] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={displayName(m.name)}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <p
                className="truncate px-2 pt-2 text-xs font-medium"
                title={m.name}
              >
                {displayName(m.name)}
              </p>
              <p className="text-muted-foreground px-2 text-[11px]">
                {[
                  m.createdAt
                    ? new Date(m.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : null,
                  formatBytes(m.bytes),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
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
