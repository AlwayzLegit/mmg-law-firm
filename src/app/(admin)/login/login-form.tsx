"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  loginWithPassword,
  verifyDeviceCode,
  sendDeviceCode,
  sendMagicLink,
} from "@/lib/auth/login-actions";

type Mode = "password" | "verify";

export default function LoginForm({
  next,
  verify,
}: {
  next?: string;
  verify?: boolean;
}) {
  const [mode, setMode] = React.useState<Mode>(verify ? "verify" : "password");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [linkSent, setLinkSent] = React.useState(false);

  function go(redirect: string) {
    // Full navigation so the server sees the freshly written auth + device
    // cookies on the next request.
    window.location.href = redirect;
  }

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
      if ("step" in res) {
        setMode("verify");
        toast.message("We emailed a 6-digit code to verify this device.");
        return;
      }
      go(res.redirect);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!code) return;
    setBusy(true);
    try {
      const res = await verifyDeviceCode({ email, code, next });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if ("redirect" in res) go(res.redirect);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }
    setBusy(true);
    try {
      const res = await sendDeviceCode({ email });
      if (!res.ok) toast.error(res.error ?? "Couldn't send the code.");
      else toast.success("New code sent.");
    } finally {
      setBusy(false);
    }
  }

  async function onMagicLink() {
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }
    setBusy(true);
    try {
      const res = await sendMagicLink({ email, next });
      if (!res.ok) toast.error(res.error ?? "Couldn't send the link.");
      else setLinkSent(true);
    } finally {
      setBusy(false);
    }
  }

  if (linkSent) {
    return (
      <div className="mt-6 rounded-md border border-success/40 bg-success/10 p-4 text-sm text-foreground">
        We sent a one-time sign-in link to{" "}
        <span className="font-medium">{email}</span>. Open it on this device to
        continue — the link expires in one hour and verifies this device.
      </div>
    );
  }

  if (mode === "verify") {
    return (
      <form onSubmit={onVerify} className="mt-6 grid gap-3" noValidate>
        <p className="text-sm text-muted-foreground">
          New device detected. Enter the 6-digit code we emailed to{" "}
          <span className="font-medium">{email || "your inbox"}</span> to verify
          and remember this device for 30 days.
        </p>
        {!email ? (
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
        ) : null}
        <label htmlFor="code" className="text-sm font-medium">
          Verification code
        </label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          required
          value={code}
          onChange={(e) =>
            setCode(e.currentTarget.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="123456"
        />
        <Button type="submit" disabled={busy || code.length !== 6}>
          {busy ? "Verifying..." : "Verify & sign in"}
        </Button>
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onResend}
            disabled={busy}
            className="text-primary hover:underline disabled:opacity-50"
          >
            Resend code
          </button>
          <button
            type="button"
            onClick={() => setMode("password")}
            className="text-muted-foreground hover:underline"
          >
            ← Back
          </button>
        </div>
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
      <div className="mt-1 text-center text-xs text-muted-foreground">
        <button
          type="button"
          onClick={onMagicLink}
          disabled={busy}
          className="text-primary hover:underline disabled:opacity-50"
        >
          Email me a sign-in link instead
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        New devices need a one-time email code in addition to your password.
      </p>
    </form>
  );
}
