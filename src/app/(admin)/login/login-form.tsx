"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  loginWithPassword,
  requestPasswordReset,
} from "@/lib/auth/login-actions";

type Mode = "password" | "reset" | "reset-sent";

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

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      await requestPasswordReset({ email });
      setMode("reset-sent");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "reset-sent") {
    return (
      <div className="mt-6 grid gap-4">
        <div className="rounded-md border border-success/40 bg-success/10 p-4 text-sm text-foreground">
          If <span className="font-medium">{email}</span> belongs to an admin
          account, a password-reset link is on its way. It works once and
          expires in one hour.
        </div>
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

  if (mode === "reset") {
    return (
      <form onSubmit={onReset} className="mt-6 grid gap-3" noValidate>
        <p className="text-sm text-muted-foreground">
          Enter your admin email and we&apos;ll send a link to choose a new
          password.
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
          {busy ? "Sending..." : "Send reset link"}
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
          onClick={() => setMode("reset")}
          disabled={busy}
          className="text-primary hover:underline disabled:opacity-50"
        >
          Forgot password?
        </button>
      </div>
    </form>
  );
}
