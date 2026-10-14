import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { json, type ApiPrincipal } from "./auth";
import { hasScope } from "./scopes";
import { getActiveSettings } from "@/lib/content-agent/instructions";

/**
 * Shared publish gate for the blog API (POST create / PATCH update).
 * Returns a 403 Response when the caller may not publish, or null when allowed.
 *
 * Rules: `blog:publish` scope is always required; beyond that, the owner's
 * `auto_publish` setting in the active agent instructions must be on — unless
 * the key also carries `agent:admin` (an owner-operated key).
 */
export async function publishPolicyDenial(
  supabase: SupabaseClient,
  principal: ApiPrincipal,
): Promise<Response | null> {
  if (!hasScope(principal.scopes, "blog:publish")) {
    return json(403, {
      error:
        "Publishing requires the blog:publish scope. Create the post as a draft instead.",
      required: ["blog:publish"],
    });
  }
  if (hasScope(principal.scopes, "agent:admin")) return null;
  const settings = await getActiveSettings(supabase);
  if (!settings.auto_publish) {
    return json(403, {
      error:
        "auto_publish is off in the agent instructions. Create the post as a draft (needs_review) and let an admin publish it.",
    });
  }
  return null;
}
