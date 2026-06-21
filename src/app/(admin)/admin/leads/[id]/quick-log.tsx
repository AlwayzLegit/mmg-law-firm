"use client";

import * as React from "react";
import { MessageSquare, Phone, PhoneOff, Mail } from "lucide-react";
import { toast } from "sonner";

import { logContact } from "./actions";

const KINDS = [
  { kind: "called", label: "Called", Icon: Phone },
  { kind: "voicemail", label: "Voicemail", Icon: PhoneOff },
  { kind: "emailed", label: "Emailed", Icon: Mail },
  { kind: "texted", label: "Texted", Icon: MessageSquare },
] as const;

/** One-tap contact logging: adds a standard note and advances a new lead to
 *  contacted. Speeds up recording the all-important first touch. */
export default function QuickLog({ leadId }: { leadId: string }) {
  const [pending, startTransition] = React.useTransition();

  function log(kind: string, label: string) {
    const fd = new FormData();
    fd.set("leadId", leadId);
    fd.set("kind", kind);
    startTransition(async () => {
      const res = await logContact(fd);
      if (res.ok) toast.success(`Logged: ${label}.`);
      else toast.error(res.error);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {KINDS.map(({ kind, label, Icon }) => (
        <button
          key={kind}
          type="button"
          onClick={() => log(kind, label)}
          disabled={pending}
          className="border-border hover:bg-secondary inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
        >
          <Icon className="text-primary h-3.5 w-3.5" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
