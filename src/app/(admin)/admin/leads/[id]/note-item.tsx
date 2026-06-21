"use client";

import * as React from "react";
import { Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteLeadNote, editLeadNote, togglePinNote } from "./actions";

export type Note = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string | null;
  isPinned: boolean;
  canModify: boolean;
};

export default function NoteItem({
  leadId,
  note,
}: {
  leadId: string;
  note: Note;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(note.body);
  const [pending, startTransition] = React.useTransition();

  function saveEdit() {
    const body = draft.trim();
    if (!body || body === note.body) {
      setEditing(false);
      setDraft(note.body);
      return;
    }
    const fd = new FormData();
    fd.set("leadId", leadId);
    fd.set("noteId", note.id);
    fd.set("body", body);
    startTransition(async () => {
      const res = await editLeadNote(fd);
      if (res.ok) {
        toast.success("Note updated.");
        setEditing(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  function pin() {
    const fd = new FormData();
    fd.set("leadId", leadId);
    fd.set("noteId", note.id);
    fd.set("pinned", note.isPinned ? "0" : "1");
    startTransition(async () => {
      const res = await togglePinNote(fd);
      if (!res.ok) toast.error(res.error);
    });
  }

  function remove() {
    if (!window.confirm("Delete this note? This can't be undone.")) return;
    const fd = new FormData();
    fd.set("leadId", leadId);
    fd.set("noteId", note.id);
    startTransition(async () => {
      const res = await deleteLeadNote(fd);
      if (res.ok) toast.success("Note deleted.");
      else toast.error(res.error);
    });
  }

  return (
    <li
      className={`rounded-md border p-3 text-sm ${
        note.isPinned
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-secondary/30"
      }`}
    >
      {editing ? (
        <div className="grid gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={4000}
            autoFocus
            aria-label="Edit note"
            className="border-border bg-background focus:ring-ring w-full rounded-md border p-2 text-sm focus:ring-2 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={pending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 rounded-md px-3 text-xs font-medium disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(note.body);
              }}
              disabled={pending}
              className="text-muted-foreground hover:text-foreground h-8 rounded-md px-2 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <p className="whitespace-pre-line">{note.body}</p>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={pin}
                disabled={pending}
                aria-label={note.isPinned ? "Unpin note" : "Pin note"}
                title={note.isPinned ? "Unpin" : "Pin to top"}
                className={`rounded p-1 transition-colors ${
                  note.isPinned
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {note.isPinned ? (
                  <PinOff className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Pin className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
              {note.canModify ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    disabled={pending}
                    aria-label="Edit note"
                    className="text-muted-foreground hover:text-primary rounded p-1 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={remove}
                    disabled={pending}
                    aria-label="Delete note"
                    className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </>
              ) : null}
            </div>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            {new Date(note.createdAt).toLocaleString("en-US")}
            {note.updatedAt ? " · edited" : ""}
            {note.isPinned ? " · pinned" : ""}
          </p>
        </>
      )}
    </li>
  );
}
