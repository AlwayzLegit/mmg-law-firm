"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { siteUrl } from "@/lib/seo/canonical";

export default function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const supabase = getBrowserSupabase();
      const redirectTo = `${siteUrl()}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setSent(true);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-6 rounded-md border border-success/40 bg-success/10 p-4 text-sm text-foreground">
        We sent a one-time sign-in link to{" "}
        <span className="font-medium">{email}</span>. Open it on this device
        to continue. The link expires in one hour.
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
      <Button type="submit" disabled={submitting || !email}>
        {submitting ? "Sending link..." : "Send sign-in link"}
      </Button>
      <p className="text-xs text-muted-foreground">
        We never share your email. Magic link only — no passwords stored.
      </p>
    </form>
  );
}
