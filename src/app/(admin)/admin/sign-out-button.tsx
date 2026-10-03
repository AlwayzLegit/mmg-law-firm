import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/sign-out";

/**
 * Sign out via a server action (form POST) so the session cookies are cleared
 * server-side, then the action redirects to /login. More reliable than a
 * client-only signOut. `variant="rail"` renders the inline text link used in
 * the admin rail's user card.
 */
export default function SignOutButton({ variant = "button" }: { variant?: "button" | "rail" }) {
  if (variant === "rail") {
    return (
      <form action={signOutAction} className="inline">
        <button type="submit" className="hover:text-cream text-cream/55 cursor-pointer underline-offset-2 hover:underline">
          Sign out
        </button>
      </form>
    );
  }
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" size="sm" aria-label="Sign out" className="gap-2">
        <LogOut className="h-4 w-4" aria-hidden />
        <span>Sign out</span>
      </Button>
    </form>
  );
}
