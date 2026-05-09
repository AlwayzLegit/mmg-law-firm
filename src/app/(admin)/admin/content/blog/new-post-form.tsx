"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { createBlogPostAndRedirect } from "./actions";

export default function NewPostForm() {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        New post
      </Button>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createBlogPostAndRedirect(fd);
      if (result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <Input
        name="title"
        autoFocus
        required
        minLength={2}
        maxLength={160}
        placeholder="Post title"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        className="h-9 w-72"
      />
      <Button type="submit" size="sm" disabled={pending || !title.trim()}>
        {pending ? "Creating..." : "Create draft"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen(false);
          setTitle("");
        }}
        disabled={pending}
      >
        Cancel
      </Button>
    </form>
  );
}
