"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setPassword } from "@/app/(admin)/admin/settings/actions";

/**
 * The one "choose a password" form. Used by /onboarding (account set-up),
 * /reset-password and the Security card in settings, so the rules, copy and
 * validation stay identical everywhere an admin sets a password.
 */
export default function PasswordForm({
  submitLabel = "Save password",
  redirectTo,
  signOutAfter = false,
  idPrefix = "pw",
  className,
}: {
  submitLabel?: string;
  /** After the password is stored, do a full navigation here (so the server
   *  sees the refreshed session cookies). Omit to stay put and reset the form. */
  redirectTo?: string;
  /** End the recovery session after saving, so the admin signs in fresh with
   *  the new password (password-reset flow). */
  signOutAfter?: boolean;
  /** Unique prefix for the input ids when two forms share a page. */
  idPrefix?: string;
  className?: string;
}) {
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    try {
      const fd = new FormData(form);
      if (signOutAfter) fd.set("signOut", "1");
      const res = await setPassword(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Password saved.");
      if (redirectTo) {
        window.location.href = redirectTo;
        return;
      }
      form.reset();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={className ?? "grid gap-3"} noValidate>
      <div className="grid gap-1.5">
        <label htmlFor={`${idPrefix}-password`} className="text-sm font-medium">
          New password
        </label>
        <Input
          id={`${idPrefix}-password`}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          placeholder="At least 10 characters"
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={`${idPrefix}-confirm`} className="text-sm font-medium">
          Confirm password
        </label>
        <Input
          id={`${idPrefix}-confirm`}
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          placeholder="Re-enter password"
        />
      </div>
      <Button type="submit" disabled={busy} className="w-fit">
        {busy ? "Saving..." : submitLabel}
      </Button>
      <p className="text-muted-foreground text-xs">
        At least 10 characters.
      </p>
    </form>
  );
}
