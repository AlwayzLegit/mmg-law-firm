"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginWithPassword } from "@/lib/auth/login-actions";

/** Email + password. Password recovery lives on its own page (/forgot-password). */
export default function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
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
    </form>
  );
}
