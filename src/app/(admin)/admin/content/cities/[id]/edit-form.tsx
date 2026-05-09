"use client";

import * as React from "react";
import { toast } from "sonner";

import MarkdownEditField from "@/components/admin/markdown-edit-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { updateCity } from "../actions";

type Props = {
  id: string;
  intro_md: string;
  local_stats_md: string;
  meta_description: string;
};

export default function EditForm(props: Props) {
  const [intro, setIntro] = React.useState(props.intro_md);
  const [stats, setStats] = React.useState(props.local_stats_md);
  const [meta, setMeta] = React.useState(props.meta_description);
  const [pending, startTransition] = React.useTransition();

  const dirty =
    intro !== props.intro_md ||
    stats !== props.local_stats_md ||
    meta !== props.meta_description;

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateCity(fd);
      if (result.ok) toast.success("Saved.");
      else toast.error(result.error);
    });
  }

  React.useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  return (
    <form onSubmit={onSave} className="grid gap-6">
      <input type="hidden" name="id" value={props.id} />

      <MarkdownEditField
        name="intro_md"
        title="City intro"
        value={intro}
        onChange={setIntro}
        minRows={6}
        maxLength={20000}
        placeholder="One-paragraph city-level intro for the hero. Reference local landmarks, neighborhoods, freeways. Stay specific to this city — don't paraphrase across siblings."
        hint="Markdown supported. Distinct content per city defends against the scaled-content-abuse risk."
      />

      <MarkdownEditField
        name="local_stats_md"
        title="Local stats / context"
        value={stats}
        onChange={setStats}
        minRows={5}
        maxLength={20000}
        placeholder="Optional: city-specific traffic context, common collision locations, demographic notes, local insurance trends."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-baseline justify-between text-base">
            <span>Meta description</span>
            <span
              className={`text-xs font-normal ${meta.length > 160 ? "text-destructive" : "text-muted-foreground"}`}
            >
              {meta.length} / 160 ideal
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            name="meta_description"
            maxLength={220}
            value={meta}
            onChange={(e) => setMeta(e.currentTarget.value)}
            placeholder="What appears under the page title in Google."
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {dirty ? "You have unsaved changes." : "All changes saved."}
        </p>
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
