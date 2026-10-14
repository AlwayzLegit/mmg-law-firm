import "server-only";

import { createHash } from "node:crypto";

import { getServiceSupabase } from "@/lib/supabase/admin";

import type { ApiPrincipal } from "./auth";
import { json } from "./auth";

/**
 * Idempotency for POST routes. Callers send `Idempotency-Key: <≤128 chars>`.
 * The key is scoped to the principal. A replay with the same payload returns
 * the stored response (plus `Idempotency-Replayed: true`); a replay with a
 * different payload is a 422; a concurrent duplicate is a 409. Server errors
 * (5xx) are not stored so the client can retry.
 */
export const IDEMPOTENCY_HEADER = "idempotency-key";
const TTL_HOURS = 24;

type StoredRow = {
  request_hash: string;
  state: "in_progress" | "done";
  response_status: number | null;
  response_body: unknown;
  expires_at: string;
};

export function requestHash(method: string, path: string, rawBody: string): string {
  return createHash("sha256")
    .update(`${method.toUpperCase()}\n${path}\n${rawBody}`)
    .digest("hex");
}

export async function withIdempotency(
  req: Request,
  principal: ApiPrincipal,
  rawBody: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  const key = (req.headers.get(IDEMPOTENCY_HEADER) ?? "").trim();
  if (!key) return handler();
  if (key.length > 128) {
    return json(400, { error: "Idempotency-Key must be 128 characters or fewer." });
  }

  const principalId = principal.id ?? "legacy";
  const path = new URL(req.url).pathname;
  const hash = requestHash(req.method, path, rawBody);
  const supabase = getServiceSupabase();

  const { error: insertErr } = await supabase.from("api_idempotency").insert({
    principal: principalId,
    idem_key: key,
    request_hash: hash,
    state: "in_progress",
    expires_at: new Date(Date.now() + TTL_HOURS * 3600 * 1000).toISOString(),
  });

  if (insertErr) {
    if (insertErr.code !== "23505") {
      // Storage trouble should never block the real request.
      console.warn("[idempotency] insert failed:", insertErr.message);
      return handler();
    }
    const { data } = await supabase
      .from("api_idempotency")
      .select("request_hash, state, response_status, response_body, expires_at")
      .eq("principal", principalId)
      .eq("idem_key", key)
      .maybeSingle();
    const row = data as StoredRow | null;
    if (!row) return handler();

    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await supabase
        .from("api_idempotency")
        .delete()
        .eq("principal", principalId)
        .eq("idem_key", key);
      return withIdempotency(req, principal, rawBody, handler);
    }
    if (row.request_hash !== hash) {
      return json(422, {
        error: "Idempotency-Key was already used with a different payload.",
      });
    }
    if (row.state === "in_progress") {
      return json(409, { error: "A request with this Idempotency-Key is still in progress." });
    }
    return new Response(JSON.stringify(row.response_body ?? null), {
      status: row.response_status ?? 200,
      headers: {
        "content-type": "application/json",
        "idempotency-replayed": "true",
      },
    });
  }

  let response: Response;
  try {
    response = await handler();
  } catch (err) {
    await supabase
      .from("api_idempotency")
      .delete()
      .eq("principal", principalId)
      .eq("idem_key", key);
    throw err;
  }

  if (response.status >= 500) {
    await supabase
      .from("api_idempotency")
      .delete()
      .eq("principal", principalId)
      .eq("idem_key", key);
    return response;
  }

  const text = await response.clone().text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  await supabase
    .from("api_idempotency")
    .update({ state: "done", response_status: response.status, response_body: body })
    .eq("principal", principalId)
    .eq("idem_key", key);

  // Opportunistic sweep of expired rows (~5% of calls) so no cron is needed.
  if (Math.random() < 0.05) {
    void supabase
      .from("api_idempotency")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .then(
        () => undefined,
        () => undefined,
      );
  }

  return response;
}
