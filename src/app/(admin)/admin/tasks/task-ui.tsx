"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Plus, Trash2, User2 } from "lucide-react";

import { adminBtn, adminInput } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

import { createTask, toggleTask, deleteTask } from "./actions";

export type TaskItem = {
  id: string;
  title: string;
  dueAt: string | null;
  done: boolean;
  leadId: string | null;
  leadName: string | null;
  assigneeLabel: string | null;
};

function dueMeta(iso: string | null, done: boolean) {
  if (!iso) return { label: null as string | null, overdue: false };
  const d = new Date(iso);
  const now = new Date();
  const overdue = !done && d.getTime() < now.getTime();
  const label = d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return { label, overdue };
}

export function TaskList({
  tasks,
  showLead = true,
  emptyText = "No tasks.",
}: {
  tasks: TaskItem[];
  showLead?: boolean;
  emptyText?: string;
}) {
  const [pending, startTransition] = React.useTransition();

  function toggle(id: string, done: boolean) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("done", done ? "1" : "0");
    startTransition(async () => {
      const res = await toggleTask(fd);
      if (!res.ok) toast.error(res.error);
    });
  }

  function remove(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const res = await deleteTask(fd);
      if (!res.ok) toast.error(res.error);
    });
  }

  if (tasks.length === 0) {
    return <p className="text-stone m-0 text-[13px]">{emptyText}</p>;
  }

  return (
    <ul className="divide-line m-0 list-none divide-y p-0">
      {tasks.map((t) => {
        const { label, overdue } = dueMeta(t.dueAt, t.done);
        return (
          <li key={t.id} className="flex items-start gap-3 py-2.5 first:pt-0">
            <button
              type="button"
              onClick={() => toggle(t.id, !t.done)}
              disabled={pending}
              aria-label={t.done ? "Mark not done" : "Mark done"}
              className={cn(
                "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-[6px] border transition-colors",
                t.done
                  ? "border-ink bg-ink text-gold"
                  : "border-ink/25 hover:border-gold",
              )}
            >
              {t.done ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "m-0 text-[13px] font-medium",
                  t.done && "text-stone font-normal line-through",
                )}
              >
                {t.title}
              </p>
              <div className="text-stone mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                {label ? (
                  <span className={cn(overdue && "font-semibold text-[#b91c1c]")}>
                    {overdue ? "Overdue · " : "Due "}
                    {label}
                  </span>
                ) : null}
                {showLead && t.leadId && t.leadName ? (
                  <Link
                    href={`/admin/leads/${t.leadId}`}
                    className="text-stone hover:text-gold-deep no-underline hover:underline"
                  >
                    {t.leadName}
                  </Link>
                ) : null}
                {t.assigneeLabel ? (
                  <span className="inline-flex items-center gap-1">
                    <User2 className="h-3 w-3" aria-hidden />
                    {t.assigneeLabel}
                  </span>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => remove(t.id)}
              disabled={pending}
              aria-label="Delete task"
              className="text-stone mt-0.5 flex-none hover:text-[#b91c1c]"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function AddTaskForm({ leadId }: { leadId?: string }) {
  const [title, setTitle] = React.useState("");
  const [due, setDue] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createTask(fd);
      if (res.ok) {
        setTitle("");
        setDue("");
        toast.success("Task added.");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      {leadId ? <input type="hidden" name="lead_id" value={leadId} /> : null}
      <input
        type="text"
        name="title"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        placeholder="Add a task…"
        maxLength={300}
        required
        className={cn(adminInput, "min-w-[12rem] flex-1")}
      />
      <input
        type="datetime-local"
        name="due_at"
        value={due}
        onChange={(e) => setDue(e.currentTarget.value)}
        aria-label="Due date"
        className={cn(adminInput, "text-stone w-auto")}
      />
      <button
        type="submit"
        disabled={pending || title.trim().length === 0}
        className={adminBtn.ink}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add
      </button>
    </form>
  );
}
