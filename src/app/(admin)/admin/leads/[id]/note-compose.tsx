"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { addLeadNote } from "./actions";

export default function NoteCompose({ leadId }: { leadId: string }) {
  const [body, setBody] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim()) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addLeadNote(fd);
      if (result.ok) {
        toast.success("Note added.");
        setBody("");
        formRef.current?.reset();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <Textarea
        name="body"
        rows={3}
        maxLength={4000}
        value={body}
        onChange={(e) => setBody(e.currentTarget.value)}
        placeholder="Spoke to client. Sending intake packet. Follow up Friday."
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Notes are visible to firm staff only.
        </p>
        <Button
          type="submit"
          size="sm"
          disabled={pending || !body.trim()}
        >
          {pending ? "Adding..." : "Add note"}
        </Button>
      </div>
    </form>
  );
}
