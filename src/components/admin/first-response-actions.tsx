"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Phone, PhoneOff } from "lucide-react";
import { toast } from "sonner";

import { logContact } from "@/app/(admin)/admin/leads/[id]/actions";

/**
 * One-tap first response for a lead in the speed-to-lead queue: a tel: link
 * to place the call, then "Called" / "Voicemail" to log the touch. Logging
 * adds the standard note, moves a new lead to "contacted" and assigns it to
 * whoever tapped, so the lead leaves the queue and the response time is
 * recorded from a real action rather than a status edit later.
 */
export default function FirstResponseActions({
  leadId,
  phoneTel,
  phoneDisplay,
}: {
  leadId: string;
  phoneTel: string;
  phoneDisplay: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function log(kind: "called" | "voicemail", label: string) {
    const fd = new FormData();
    fd.set("leadId", leadId);
    fd.set("kind", kind);
    startTransition(async () => {
      const res = await logContact(fd);
      if (res.ok) {
        toast.success(`Logged: ${label}.`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  const btn =
    "border-border hover:bg-secondary inline-flex min-h-8 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-none flex-wrap items-center gap-1.5">
      <a href={`tel:${phoneTel}`} className={`${btn} text-primary`} aria-label={`Call ${phoneDisplay}`}>
        <Phone className="h-3.5 w-3.5" aria-hidden />
        <span className="tabular-nums">{phoneDisplay}</span>
      </a>
      <button type="button" className={btn} disabled={pending} onClick={() => log("called", "Called")}>
        Called
      </button>
      <button type="button" className={btn} disabled={pending} onClick={() => log("voicemail", "Voicemail")}>
        <PhoneOff className="text-muted-foreground h-3.5 w-3.5" aria-hidden />
        Voicemail
      </button>
    </div>
  );
}
