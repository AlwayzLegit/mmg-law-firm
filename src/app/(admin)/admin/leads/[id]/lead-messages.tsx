"use client";

import * as React from "react";
import { toast } from "sonner";
import { Mail, MessageSquare, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MESSAGE_TEMPLATES, fillTemplate } from "@/lib/data/message-templates";

import { sendLeadMessage } from "./message-actions";

export type LeadMessage = {
  id: string;
  channel: "sms" | "email";
  direction: "outbound" | "inbound";
  subject: string | null;
  body: string;
  status: string;
  error: string | null;
  createdAt: string;
  authorLabel: string | null;
};

type Props = {
  leadId: string;
  fullName: string | null;
  hasPhone: boolean;
  hasEmail: boolean;
  messages: LeadMessage[];
};

export default function LeadMessages({
  leadId,
  fullName,
  hasPhone,
  hasEmail,
  messages,
}: Props) {
  // Default to whichever channel the lead can actually receive.
  const [channel, setChannel] = React.useState<"sms" | "email">(
    hasPhone ? "sms" : "email",
  );
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const templates = MESSAGE_TEMPLATES.filter((t) => t.channel === channel);
  const channelDisabled = channel === "sms" ? !hasPhone : !hasEmail;

  function applyTemplate(id: string) {
    const t = MESSAGE_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setBody(fillTemplate(t.body, fullName));
    if (t.channel === "email" && t.subject) {
      setSubject(fillTemplate(t.subject, fullName));
    }
  }

  function onSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await sendLeadMessage(fd);
      if (res.ok) {
        toast.success(channel === "sms" ? "Text sent." : "Email sent.");
        setBody("");
        setSubject("");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Channel toggle */}
      <div className="flex gap-1 rounded-lg bg-secondary p-1">
        {(["sms", "email"] as const).map((c) => {
          const Icon = c === "sms" ? MessageSquare : Mail;
          const able = c === "sms" ? hasPhone : hasEmail;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              disabled={!able}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                channel === c
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                !able && "cursor-not-allowed opacity-40",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {c === "sms" ? "Text" : "Email"}
            </button>
          );
        })}
      </div>

      <form onSubmit={onSend} className="space-y-3">
        <input type="hidden" name="leadId" value={leadId} />
        <input type="hidden" name="channel" value={channel} />

        {/* Template picker */}
        {templates.length > 0 ? (
          <select
            aria-label="Insert a template"
            defaultValue=""
            onChange={(e) => {
              if (e.currentTarget.value) applyTemplate(e.currentTarget.value);
              e.currentTarget.value = "";
            }}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-muted-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <option value="">Insert a template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        ) : null}

        {channel === "email" ? (
          <Input
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.currentTarget.value)}
            placeholder="Subject"
            maxLength={200}
          />
        ) : null}

        <Textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.currentTarget.value)}
          rows={channel === "email" ? 6 : 3}
          maxLength={2000}
          placeholder={
            channel === "sms"
              ? "Type a text message…"
              : "Write an email to this lead…"
          }
          required
        />

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {channelDisabled
              ? `No ${channel === "sms" ? "phone number" : "email"} on file.`
              : channel === "sms"
                ? `${body.length}/2000 · standard rates apply`
                : `${body.length}/2000`}
          </p>
          <Button
            type="submit"
            size="sm"
            disabled={pending || channelDisabled || body.trim().length === 0}
          >
            <Send className="h-4 w-4" aria-hidden />
            {pending ? "Sending…" : channel === "sms" ? "Send text" : "Send email"}
          </Button>
        </div>
      </form>

      {/* Thread */}
      {messages.length > 0 ? (
        <ul className="space-y-3 border-t border-border pt-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </ul>
      ) : (
        <p className="border-t border-border pt-4 text-sm text-muted-foreground">
          No messages yet. Texts and emails you send appear here, along with any
          replies.
        </p>
      )}
    </div>
  );
}

function MessageBubble({ message: m }: { message: LeadMessage }) {
  const outbound = m.direction === "outbound";
  const Icon = m.channel === "sms" ? MessageSquare : Mail;
  return (
    <li className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
          outbound
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-foreground",
        )}
      >
        {m.subject ? (
          <p
            className={cn(
              "mb-1 text-xs font-semibold",
              outbound ? "text-primary-foreground/90" : "text-foreground",
            )}
          >
            {m.subject}
          </p>
        ) : null}
        <p className="whitespace-pre-line">{m.body}</p>
        <p
          className={cn(
            "mt-1.5 flex items-center gap-1 text-[11px]",
            outbound ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          <Icon className="h-3 w-3" aria-hidden />
          {outbound ? (m.authorLabel ?? "Sent") : "Reply"}
          {" · "}
          {new Date(m.createdAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
          {m.status === "failed" ? (
            <span className="font-medium text-destructive"> · failed</span>
          ) : null}
        </p>
      </div>
    </li>
  );
}
