"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { upsertTemplate, toggleTemplate, deleteTemplate } from "./actions";

export type TemplateRow = {
  id: string;
  label: string;
  channel: "sms" | "email";
  subject: string | null;
  body: string;
  sort_order: number;
  is_active: boolean;
};

const selectCls =
  "h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

export default function TemplateManager({
  templates,
}: {
  templates: TemplateRow[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-3 text-sm font-semibold">New template</h2>
          <TemplateForm />
        </CardContent>
      </Card>

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No templates yet. Create one above.
        </p>
      ) : (
        templates.map((t) => (
          <Card key={t.id} className={cn(!t.is_active && "opacity-60")}>
            <CardContent className="pt-6">
              <TemplateForm template={t} />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function TemplateForm({ template: t }: { template?: TemplateRow }) {
  const [channel, setChannel] = React.useState<"sms" | "email">(
    t?.channel ?? "sms",
  );
  const [pending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await upsertTemplate(fd);
      if (res.ok) {
        toast.success(t ? "Template saved." : "Template created.");
        if (!t) formRef.current?.reset();
      } else {
        toast.error(res.error);
      }
    });
  }

  function onToggle() {
    const fd = new FormData();
    fd.set("id", t!.id);
    fd.set("active", t!.is_active ? "0" : "1");
    startTransition(async () => {
      const res = await toggleTemplate(fd);
      if (!res.ok) toast.error(res.error);
    });
  }

  function onDelete() {
    const fd = new FormData();
    fd.set("id", t!.id);
    startTransition(async () => {
      const res = await deleteTemplate(fd);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      {t ? <input type="hidden" name="id" value={t.id} /> : null}
      <div className="flex flex-wrap gap-2">
        <Input
          name="label"
          defaultValue={t?.label ?? ""}
          placeholder="Label (e.g. SMS · Follow-up)"
          maxLength={120}
          required
          className="min-w-[14rem] flex-1"
        />
        <select
          name="channel"
          value={channel}
          onChange={(e) => setChannel(e.currentTarget.value as "sms" | "email")}
          aria-label="Channel"
          className={selectCls}
        >
          <option value="sms">SMS</option>
          <option value="email">Email</option>
        </select>
        <Input
          name="sort_order"
          type="number"
          defaultValue={t?.sort_order ?? 0}
          min={0}
          max={9999}
          aria-label="Sort order"
          className="w-20"
        />
      </div>

      {channel === "email" ? (
        <Input
          name="subject"
          defaultValue={t?.subject ?? ""}
          placeholder="Email subject"
          maxLength={200}
        />
      ) : null}

      <Textarea
        name="body"
        defaultValue={t?.body ?? ""}
        rows={channel === "email" ? 6 : 3}
        maxLength={2000}
        placeholder="Message body — use {{first}} for the lead's first name"
        required
      />

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          <code className="bg-secondary rounded px-1 py-0.5">{"{{first}}"}</code>{" "}
          → lead&apos;s first name
        </p>
        <div className="flex items-center gap-2">
          {t ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onToggle}
                disabled={pending}
              >
                {t.is_active ? "Disable" : "Enable"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onDelete}
                disabled={pending}
                aria-label="Delete template"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </>
          ) : null}
          <Button type="submit" size="sm" disabled={pending}>
            {t ? "Save" : (
              <>
                <Plus className="h-4 w-4" aria-hidden />
                Create
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
