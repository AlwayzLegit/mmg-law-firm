"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { revokeApiKey } from "./actions";

export default function RevokeButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      className="border-destructive/30 text-destructive hover:bg-destructive/10"
      onClick={() => {
        if (!window.confirm(`Revoke “${name}”? Anything using it stops working immediately.`)) return;
        const fd = new FormData();
        fd.set("id", id);
        startTransition(async () => {
          const r = await revokeApiKey(fd);
          if (r.ok) toast.success("Key revoked.");
          else toast.error(r.error);
        });
      }}
    >
      {pending ? "…" : "Revoke"}
    </Button>
  );
}
