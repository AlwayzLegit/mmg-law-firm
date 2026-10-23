"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PasswordForm from "@/components/admin/password-form";

import { signOutOtherDevices } from "./actions";

export default function SecurityCard() {
  const [busy, setBusy] = React.useState(false);

  async function onSignOutOthers() {
    setBusy(true);
    try {
      const res = await signOutOtherDevices();
      if (!res.ok) toast.error(res.error);
      else toast.success("Other devices signed out.");
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
        <div>
          <p className="text-sm font-medium">Change password</p>
          <PasswordForm idPrefix="security" className="mt-2 grid gap-3" />
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium">Other sessions</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign out every other browser and device that is signed in as you.
            Use it if you lost a device or signed in somewhere shared.
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
