"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TextareaAutosize from "react-textarea-autosize";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  /** form field name — used by the surrounding <form> on submit */
  name: string;
  /** Card title shown above the editor. */
  title: string;
  /** Hint shown beneath the textarea. */
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  minRows?: number;
  maxLength?: number;
  placeholder?: string;
};

export default function MarkdownEditField({
  name,
  title,
  hint,
  value,
  onChange,
  minRows = 6,
  maxLength = 8000,
  placeholder,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between text-base">
          <span>{title}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {value.length} chars
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
              name={name}
              minRows={minRows}
              maxLength={maxLength}
              value={value}
              onChange={(e) => onChange(e.currentTarget.value)}
              placeholder={placeholder}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {hint ? (
              <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
            ) : null}
          </TabsContent>
          <TabsContent value="preview">
            {value.trim() === "" ? (
              <p className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
                Nothing to preview yet.
              </p>
            ) : (
              <div className="prose prose-neutral max-w-none rounded-md border border-border bg-background p-4 [&_p]:leading-relaxed [&_p]:text-muted-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {value}
                </ReactMarkdown>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
