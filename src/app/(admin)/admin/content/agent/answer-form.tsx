"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { answerAgentQuestion, dismissAgentQuestion } from "./actions";

export default function AnswerForm({ id }: { id: string }) {
  const [pending, startTransition] = React.useTransition();
  const [answer, setAnswer] = React.useState("");

  function submit() {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("answer", answer);
    startTransition(async () => {
      const r = await answerAgentQuestion(fd);
      if (r.ok) {
        toast.success("Answer saved — the agent gets it on its next run.");
        setAnswer("");
      } else toast.error(r.error);
    });
  }
  function dismiss() {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const r = await dismissAgentQuestion(fd);
      if (r.ok) toast.success("Dismissed.");
      else toast.error(r.error);
    });
  }

  return (
    <div className="mt-3 grid gap-2">
      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.currentTarget.value)}
        placeholder="Your answer (plain text or markdown)…"
        className="min-h-20 text-sm"
        maxLength={4000}
      />
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={submit} disabled={pending || !answer.trim()}>
          {pending ? "Saving…" : "Send answer"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={dismiss} disabled={pending}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
