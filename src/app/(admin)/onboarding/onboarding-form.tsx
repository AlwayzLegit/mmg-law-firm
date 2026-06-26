"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <form onSubmit={onSubmit} className="mt-6 grid gap-3" noValidate>
      <div className="grid gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          required
          minLength={10}
          placeholder="At least 10 characters"
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="confirm" className="text-sm font-medium">
          Confirm password
        </label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          placeholder="Re-enter password"
        />
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving..." : "Set password & continue"}
      </Button>
      <p className="text-muted-foreground text-xs">
        This device is remembered for 30 days. New devices will still need a
        one-time email code in addition to your password.
      </p>
    </form>
  );
}
