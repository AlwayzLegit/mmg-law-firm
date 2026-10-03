"use client";

import * as React from "react";
import { toast } from "sonner";

import { authInput, authLabel, authPrimary } from "@/components/admin/auth-split";
import { setPassword } from "@/app/(admin)/admin/settings/actions";

export default function OnboardingForm() {
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await setPassword(new FormData(e.currentTarget));
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Password set. Welcome!");
      // Full navigation so the server sees the refreshed session/device cookies.
      window.location.href = "/admin";
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-3.5" noValidate>
      <label className={authLabel}>
        New password
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          required
          minLength={10}
          placeholder="At least 10 characters"
          className={authInput}
        />
      </label>
      <label className={authLabel}>
        Confirm password
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          placeholder="Re-enter password"
          className={authInput}
        />
      </label>
      <button type="submit" disabled={busy} className={authPrimary}>
        {busy ? "Saving…" : "Set password & continue"}
      </button>
      <p className="text-stone text-xs">
        This device is remembered for 30 days. New devices will still need a one-time email code in addition to your
        password.
      </p>
    </form>
  );
}
