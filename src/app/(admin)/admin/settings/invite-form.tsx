"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { inviteAdmin } from "./actions";

export default function InviteForm() {
  const [pending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await inviteAdmin(fd);
      if (result.ok) {
        toast.success(result.resent ? "Invite re-sent." : "Invitation sent.");
        formRef.current?.reset();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <label
          htmlFor="invite-name"
          className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
        >
          Full name
        </label>
        <Input id="invite-name" name="full_name" required minLength={2} />
      </div>
      <div className="grid gap-1.5">
        <label
          htmlFor="invite-email"
          className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
        >
          Email
        </label>
        <Input id="invite-email" name="email" type="email" required />
      </div>
      <div className="grid gap-1.5">
        <label
          htmlFor="invite-role"
          className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
        >
          Role
        </label>
        <select
          id="invite-role"
          name="role"
          defaultValue="staff"
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="intake">intake — read leads only</option>
          <option value="staff">staff — full lead + content management</option>
          <option value="owner">owner — full access incl. invites</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending invite..." : "Send invite"}
      </Button>
      <p className="text-xs text-muted-foreground">
        The invitee gets an email with a one-time link (expires in one hour)
        that opens their account set-up page to choose a password. After that
        they sign in with email and password. Until they do, their row above
        shows &ldquo;Invite pending&rdquo; with resend and copy-link buttons.
      </p>
    </form>
  );
}
