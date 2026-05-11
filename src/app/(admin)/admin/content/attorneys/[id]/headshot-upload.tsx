"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { uploadAttorneyHeadshot } from "../actions";

type Props = {
  id: string;
  currentUrl: string | null;
  alt: string;
};

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

export default function HeadshotUpload({ id, currentUrl, alt }: Props) {
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  function onPick() {
    inputRef.current?.click();
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Headshot must be under 4 MB.");
      e.currentTarget.value = "";
      return;
    }
    const fd = new FormData();
    fd.set("id", id);
    fd.set("file", file);
    startTransition(async () => {
      const result = await uploadAttorneyHeadshot(fd);
      if (result.ok) toast.success("Headshot uploaded.");
      else toast.error(result.error);
    });
    e.currentTarget.value = "";
  }

  return (
    <div className="grid gap-3">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-border bg-secondary">
        {currentUrl ? (
          // Plain <img> in admin — avoids the next/image remotePatterns gymnastics
          // for arbitrary upload paths.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt={alt}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            No headshot uploaded
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={onChange}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onPick}
        disabled={pending}
        className="w-full gap-1.5"
      >
        <Upload className="h-3.5 w-3.5" aria-hidden />
        {pending
          ? "Uploading..."
          : currentUrl
            ? "Replace headshot"
            : "Upload headshot"}
      </Button>

      <p className="text-xs text-muted-foreground">
        JPEG, PNG, or WebP, up to 4 MB. Aim for a 4:5 portrait crop, ~1200 ×
        1500 px. Goes to the public{" "}
        <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">
          attorney-headshots
        </code>{" "}
        bucket.
      </p>
    </div>
  );
}
