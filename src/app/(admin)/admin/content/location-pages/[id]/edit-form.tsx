"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    startTransition(async () => {
      const result = await updateLocationPage(fd);
      if (result.ok) {
        toast.success("Changes saved. last_reviewed_at bumped to now.");
      } else {
        toast.error(result.error);
      }
    });
  }

  // Warn unsaved changes when navigating away.
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-baseline justify-between text-base">
            <span>Local angle (required to publish)</span>
            <span className="text-xs font-normal text-muted-foreground">
              {angle.length} chars
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="edit">
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="edit">
              <TextareaAutosize
                name="local_angle_md"
                minRows={8}
                maxLength={20000}
                value={angle}
                onChange={(e) => setAngle(e.currentTarget.value)}
                placeholder="What's specific to this city × practice combination? Roads, courthouses, common collision patterns, demographic context, local insurance trends. Avoid templated content — write something only this firm could write about this place."
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Markdown supported. Leave empty to keep the page from
                rendering publicly. Per CRPC §7.1 don&apos;t paraphrase across
                cities — each angle should be genuinely local.
              </p>
            </TabsContent>
            <TabsContent value="preview">
              {angle.trim() === "" ? (
                <p className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
                  Nothing to preview yet.
                </p>
              ) : (
                <div className="prose prose-neutral max-w-none rounded-md border border-border bg-background p-4 [&_p]:leading-relaxed [&_p]:text-muted-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {angle}
                  </ReactMarkdown>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-baseline justify-between text-base">
            <span>Intro</span>
            <span className="text-xs font-normal text-muted-foreground">
              {intro.length} chars
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="edit">
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="edit">
              <TextareaAutosize
                name="intro_md"
                minRows={4}
                maxLength={8000}
                value={intro}
                onChange={(e) => setIntro(e.currentTarget.value)}
                placeholder="Optional one-paragraph hero intro shown above the local angle. Leave empty to use a generic city × practice intro."
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </TabsContent>
            <TabsContent value="preview">
              {intro.trim() === "" ? (
                <p className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
                  Nothing to preview yet.
                </p>
              ) : (
                <div className="prose prose-neutral max-w-none rounded-md border border-border bg-background p-4 [&_p]:leading-relaxed [&_p]:text-muted-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {intro}
                  </ReactMarkdown>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
            placeholder="What appears under the page title in Google. Aim for 140–160 chars."
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
