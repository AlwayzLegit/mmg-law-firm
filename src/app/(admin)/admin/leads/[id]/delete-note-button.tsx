"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteLeadNote } from "./actions";

export default function DeleteNoteButton({
  leadId,
  noteId,
}: {
  leadId: string;
  noteId: string;
}) {
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    if (!window.confirm("Delete this note? This can't be undone.")) return;
    const fd = new FormData();
    fd.set("leadId", leadId);
    fd.set("noteId", noteId);
    startTransition(async () => {
      const result = await deleteLeadNote(fd);
      if (result.ok) toast.success("Note deleted.");
      else toast.error(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label="Delete note"
      className="text-muted-foreground hover:text-destructive shrink-0 rounded p-1 transition-colors disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}
