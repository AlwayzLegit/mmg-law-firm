"use client";

import * as React from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SCOPE_DESCRIPTIONS, SCOPES, type Scope } from "@/lib/api/scopes";

import { createApiKey } from "./actions";

/** Sensible default for the daily blog agent: write drafts, never publish. */
const AGENT_PRESET: Scope[] = ["blog:read", "blog:write", "images:read", "images:write", "agent:read", "agent:write"];

export default function CreateKeyForm() {
  const [pending, startTransition] = React.useTransition();
  const [scopes, setScopes] = React.useState<Scope[]>(AGENT_PRESET);
  const [issued, setIssued] = React.useState<{ token: string; name: string } | null>(null);
  const [copied, setCopied] = React.useState(false);
  const ref = React.useRef<HTMLFormElement>(null);

  function toggle(s: Scope) {
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("scopes");
    for (const s of scopes) fd.append("scopes", s);
    startTransition(async () => {
      const r = await createApiKey(fd);
      if (r.ok) {
        setIssued({ token: r.token, name: r.name });
        ref.current?.reset();
        setScopes(AGENT_PRESET);
      } else toast.error(r.error);
    });
  }

  async function copy() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed — select the token and copy it manually.");
    }
  }

  if (issued) {
    return (
      <div className="grid gap-3 text-sm">
        <p className="bg-warning/10 text-warning rounded-md p-3 text-xs font-medium">
          Copy this token now. It is shown once and cannot be recovered — only its hash is stored.
        </p>
        <p className="text-muted-foreground text-xs">Key “{issued.name}”</p>
        <div className="flex items-center gap-2">
          <code className="bg-secondary flex-1 overflow-x-auto rounded-md px-3 py-2 text-xs break-all select-all">{issued.token}</code>
          <Button type="button" size="sm" variant="outline" onClick={copy} className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Use it as <code className="text-xs">Authorization: Bearer &lt;token&gt;</code>. Store it in your automation&apos;s secret store, never in a prompt or a repo.
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={() => setIssued(null)}>Done</Button>
      </div>
    );
  }

  return (
    <form ref={ref} onSubmit={submit} className="grid gap-3 text-sm">
      <label className="grid gap-1.5">
        <span className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">Name</span>
        <Input name="name" required minLength={2} maxLength={80} placeholder="e.g. Cowork daily blog agent" className="h-9 text-sm" />
      </label>
      <fieldset className="grid gap-1.5">
        <legend className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">Scopes</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {SCOPES.map((s) => (
            <label key={s} className={`flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs ${scopes.includes(s) ? "border-primary/40 bg-primary/5" : "border-border"}`}>
              <input type="checkbox" className="mt-0.5 size-3.5" checked={scopes.includes(s)} onChange={() => toggle(s)} />
              <span>
                <code className="font-medium">{s}</code>
                <span className="text-muted-foreground block">{SCOPE_DESCRIPTIONS[s]}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Button type="button" size="xs" variant="ghost" onClick={() => setScopes(AGENT_PRESET)}>Blog agent preset</Button>
          <Button type="button" size="xs" variant="ghost" onClick={() => setScopes([...AGENT_PRESET, "blog:publish"])}>+ publish</Button>
          <Button type="button" size="xs" variant="ghost" onClick={() => setScopes(["*"])}>Everything</Button>
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">Requests / hour</span>
          <Input name="rate_limit_per_hour" type="number" min={1} max={100000} defaultValue={600} className="h-9 text-sm" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">Expires in days (0 = never)</span>
          <Input name="expires_in_days" type="number" min={0} max={3650} defaultValue={0} className="h-9 text-sm" />
        </label>
      </div>
      <label className="grid gap-1.5">
        <span className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">Note</span>
        <Input name="note" maxLength={500} placeholder="Where this key lives (optional)" className="h-9 text-sm" />
      </label>
      <Button type="submit" disabled={pending || scopes.length === 0} className="gap-1.5">
        <KeyRound className="h-4 w-4" aria-hidden /> {pending ? "Creating…" : "Create key"}
      </Button>
    </form>
  );
}
