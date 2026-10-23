"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/auth/login-actions";

export default function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      await requestPasswordReset({ email });
      setSent(true);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-6 grid gap-4">
        <div className="rounded-md border border-success/40 bg-success/10 p-4 text-sm text-foreground">
          If <span className="font-medium">{email}</span> belongs to an admin
          account, a password-reset email is on its way. The link works once
          and expires in one hour.
        </div>
        <p className="text-xs text-muted-foreground">
          Nothing after a few minutes? Check your spam folder, then ask the
          firm owner to confirm your address is on the Admins list.
        </p>
        <Link
          href="/login"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-3" noValidate>
      <label htmlFor="email" className="text-sm font-medium">
        Email
      </label>
      <Input
        id="email"
        type="email"
        autoComplete="email"
        autoFocus
        required
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        placeholder="you@example.com"
      />
      <Button type="submit" disabled={busy || !email}>
        {busy ? "Sending..." : "Send reset link"}
      </Button>
      <Link
        href="/login"
        className="mt-1 text-center text-xs text-muted-foreground hover:underline"
      >
        ← Back to sign in
      </Link>
    </form>
  );
}
