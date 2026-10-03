"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { authInput, authLabel, authPrimary, authSecondary } from "@/components/admin/auth-split";
import { cn } from "@/lib/utils";
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
      <div className="mt-6 rounded-[10px] border border-[#15803d]/30 bg-[rgba(22,163,74,.1)] p-4 text-sm">
        We sent a one-time sign-in link to <span className="font-semibold">{email}</span>. Open it on this device to
        continue — the link expires in one hour and verifies this device.
      </div>
    );
  }

  if (mode === "verify") {
    return (
      <form onSubmit={onVerify} className="mt-6 grid gap-3.5" noValidate>
        <button
          type="button"
          onClick={() => setMode("password")}
          className="text-stone hover:text-foreground inline-flex items-center gap-1.5 text-[13px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
        <p className="text-stone text-[13.5px]">
          New device detected. Enter the 6-digit code we emailed to{" "}
          <strong className="text-foreground font-semibold">{email || "your inbox"}</strong> to verify and remember this
          device for 30 days.
        </p>
        {!email ? (
          <label className={authLabel}>
            Email
            <input
              type="email"
              autoComplete="email"
              placeholder="you@mmg-lawfirm.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              className={authInput}
            />
          </label>
        ) : null}
        <label className={authLabel}>
          Verification code
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.currentTarget.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            className={cn(authInput, "font-display h-14 text-center text-2xl font-semibold tracking-[0.5em]")}
          />
        </label>
        <button type="submit" disabled={busy || code.length !== 6} className={authPrimary}>
          {busy ? "Verifying…" : "Verify and sign in"}
        </button>
        <p className="text-stone text-[12.5px]">
          Didn&apos;t get it?{" "}
          <button type="button" onClick={onResend} disabled={busy} className="text-gold-deep font-semibold hover:underline disabled:opacity-50">
            Resend code
          </button>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={onPassword} className="mt-6 grid gap-3.5" noValidate>
      <label className={authLabel}>
        Email
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          placeholder="you@mmg-lawfirm.com"
          className={authInput}
        />
      </label>
      <label className={authLabel}>
        <span className="flex justify-between">
          <span>Password</span>
          <button
            type="button"
            onClick={onMagicLink}
            disabled={busy}
            className="text-gold-deep font-medium normal-case tracking-normal hover:underline disabled:opacity-50"
          >
            Forgot?
          </button>
        </span>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          placeholder="••••••••••"
          className={authInput}
        />
      </label>
      <button type="submit" disabled={busy || !email || !password} className={authPrimary}>
        {busy ? "Signing in…" : "Continue"}
      </button>
      <div className="text-stone flex items-center gap-3 text-xs">
        <span className="bg-ink/12 h-px flex-1" />
        or
        <span className="bg-ink/12 h-px flex-1" />
      </div>
      <button type="button" onClick={onMagicLink} disabled={busy} className={authSecondary}>
        Email me a magic link
      </button>
      <p className="text-stone text-xs">New devices need a one-time email code in addition to your password.</p>
    </form>
  );
}
