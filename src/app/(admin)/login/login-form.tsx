"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  loginWithPassword,
  requestSignInLink,
} from "@/lib/auth/login-actions";

type Mode = "password" | "link" | "link-sent";

/**
 * Two ways in, nothing else:
 *
 * 1. Email + password (the everyday path).
 * 2. "Email me a sign-in link" — one self-service recovery for every stuck
 *    state: forgot the password, invite link expired before they chose one,
 *    first owner bootstrapped from the CLI. The link signs them in and lands
 *    on the choose-a-password page.
 */
export default function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = React.useState<Mode>("password");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function onPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      const res = await loginWithPassword({ email, password, next });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // Full navigation so the server sees the freshly written auth cookies.
      window.location.href = res.redirect;
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      await requestSignInLink({ email });
      setMode("link-sent");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "link-sent") {
    return (
      <div className="mt-6 grid gap-4">
        <div className="rounded-md border border-success/40 bg-success/10 p-4 text-sm text-foreground">
          If <span className="font-medium">{email}</span> belongs to an admin
          account, a sign-in link is on its way. Open it on any device; it
          works once and expires in one hour. It signs you in and asks you to
          choose a password.
        </div>
        <p className="text-xs text-muted-foreground">
          Nothing after a few minutes? Check spam, then ask the firm owner to
          confirm your address is on the Admins list.
        </p>
        <button
          type="button"
          onClick={() => setMode("password")}
          className="text-left text-xs text-muted-foreground hover:underline"
        >
          ← Back to sign in
        </button>
      </div>
    );
  }

  if (mode === "link") {
    return (
      <form onSubmit={onLink} className="mt-6 grid gap-3" noValidate>
        <p className="text-sm text-muted-foreground">
          Forgot your password, or never set one? Enter your admin email and
          we&apos;ll send a one-time link that signs you in so you can choose
          a password.
        </p>
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
          {busy ? "Sending..." : "Email me a sign-in link"}
        </Button>
        <button
          type="button"
          onClick={() => setMode("password")}
          className="text-left text-xs text-muted-foreground hover:underline"
        >
          ← Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onPassword} className="mt-6 grid gap-3" noValidate>
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
      <label htmlFor="password" className="text-sm font-medium">
        Password
      </label>
      <Input
        id="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
        placeholder="••••••••"
      />
      <Button type="submit" disabled={busy || !email || !password}>
        {busy ? "Signing in..." : "Sign in"}
      </Button>
      <div className="mt-1 text-center text-xs">
        <button
          type="button"
          onClick={() => setMode("link")}
          disabled={busy}
          className="text-primary hover:underline disabled:opacity-50"
        >
          Forgot password, or never set one? Email me a sign-in link
        </button>
      </div>
    </form>
  );
}
