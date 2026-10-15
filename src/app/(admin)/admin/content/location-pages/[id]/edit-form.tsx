"use client";

import * as React from "react";
import { toast } from "sonner";

import MarkdownEditField from "@/components/admin/markdown-edit-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { updateLocationPage } from "../actions";

type Props = {
  id: string;
  intro_md: string;
  local_angle_md: string;
  meta_description: string;
};

export default function EditForm(props: Props) {
  const [intro, setIntro] = React.useState(props.intro_md);
  const [angle, setAngle] = React.useState(props.local_angle_md);
  const [meta, setMeta] = React.useState(props.meta_description);
  const [pending, startTransition] = React.useTransition();

  const dirty =
    intro !== props.intro_md ||
    angle !== props.local_angle_md ||
    meta !== props.meta_description;

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // Body edits must not rewrite frozen metadata or unrelated fields.
    if (intro === props.intro_md) fd.delete("intro_md");
    if (angle === props.local_angle_md) fd.delete("local_angle_md");
    if (meta === props.meta_description) fd.delete("meta_description");
    startTransition(async () => {
      const result = await updateLocationPage(fd);
      if (result.ok) {
        toast.success("Changes saved. Review date unchanged.");
      } else {
        toast.error(result.error);
      }
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
        name="local_angle_md"
        title="Local angle (required to publish)"
        value={angle}
        onChange={setAngle}
        minRows={8}
        maxLength={20000}
        placeholder="What's specific to this city x practice combination? Roads, courthouses, common collision patterns, demographic context, local insurance trends. Avoid templated content — write something only this firm could write about this place."
        hint="Markdown supported. Leave empty to keep the page from rendering publicly. Per CRPC §7.1 don't paraphrase across cities — each angle should be genuinely local."
      />

      <MarkdownEditField
        name="intro_md"
        title="Intro"
        value={intro}
        onChange={setIntro}
        minRows={4}
        maxLength={8000}
        placeholder="Optional one-paragraph hero intro shown above the local angle. Leave empty to use a generic city x practice intro."
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
            placeholder="What appears under the page title in Google. Aim for 140-160 chars."
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          {dirty ? "You have unsaved changes." : "All changes saved."}
        </p>
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
