"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { draftBlogPostWithAIAndRedirect } from "./actions";

export default function AiDraftForm() {
  const [open, setOpen] = React.useState(false);
  const [topic, setTopic] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Draft with AI
      </Button>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (topic.trim().length < 8) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await draftBlogPostWithAIAndRedirect(fd);
      if (result && !result.ok) toast.error(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <Input
        name="topic"
        autoFocus
        required
        minLength={8}
        maxLength={400}
        placeholder="Topic — e.g. what to do after a rideshare crash in Glendale"
        value={topic}
        onChange={(e) => setTopic(e.currentTarget.value)}
        className="h-9 w-96"
      />
      <Button
        type="submit"
        size="sm"
        disabled={pending || topic.trim().length < 8}
      >
        {pending ? "Drafting…" : "Draft"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen(false);
          setTopic("");
        }}
        disabled={pending}
      >
        Cancel
      </Button>
    </form>
  );
}
