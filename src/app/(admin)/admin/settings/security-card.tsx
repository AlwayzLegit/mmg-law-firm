"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setPassword, signOutOtherDevices } from "./actions";

export default function SecurityCard() {
  const [busy, setBusy] = React.useState(false);

  async function onSetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    try {
      const res = await setPassword(new FormData(form));
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Password updated.");
        form.reset();
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSignOutOthers() {
    setBusy(true);
    try {
      const res = await signOutOtherDevices();
      if (!res.ok) toast.error(res.error);
      else toast.success("Other devices signed out. They'll need a new code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Security</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <form onSubmit={onSetPassword} className="grid gap-3" noValidate>
          <div className="grid gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Set a password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
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
          <Button type="submit" disabled={busy} className="w-fit">
            {busy ? "Saving..." : "Save password"}
          </Button>
          <p className="text-xs text-muted-foreground">
            After setting a password you can sign in with email + password. New
            devices still require a one-time email code.
          </p>
        </form>

        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium">Trusted devices</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Verified devices skip the email code for 30 days. Sign out other
            devices if you&apos;ve lost one or want to force re-verification.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onSignOutOthers}
            disabled={busy}
            className="mt-3 w-fit"
          >
            Sign out other devices
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
