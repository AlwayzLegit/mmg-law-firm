import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/sign-out";

/**
 * Sign out via a server action (form POST) so the session cookies are cleared
 * server-side, then the action redirects to /login. More reliable than a
 * client-only signOut.
 */
export default function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        aria-label="Sign out"
        className="gap-2"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        <span>Sign out</span>
      </Button>
    </form>
  );
}
