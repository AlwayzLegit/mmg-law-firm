import { NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/supabase/admin";

// One-off seeding endpoint: pulls generated imagery into the `media` bucket
// from the (egress-capable) Vercel runtime. Removed immediately after use.
// Gated by a single-use token; returns 404 on mismatch so it isn't probeable.
const TOKEN = "seed_3f9a2c71b8e64d05ab7c1e9d4f206a8c";
const BUCKET = "media";
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
]);
const MAX_BYTES = 12 * 1024 * 1024;

const ITEMS: Array<{ name: string; src: string }> = [
  {
    name: "pa-car-accidents.webp",
    src: "https://mcp-tools-z-image-turbo.hf.space/--replicas/hdlsf/gradio_api/file=/tmp/gradio/7bf56fa1ab67c7fd77232b9aed4639c69d4e645d86179f669581b86a2d0adc50/image.webp",
  },
  {
    name: "pa-truck-accidents.webp",
    src: "https://mcp-tools-z-image-turbo.hf.space/--replicas/hdlsf/gradio_api/file=/tmp/gradio/85926c340b2924d5ee8d9bb9b27eb2c4c032f8c83b34c4e81bc3c18f32c700b8/image.webp",
  },
  {
    name: "pa-motorcycle-accidents.webp",
    src: "https://mcp-tools-z-image-turbo.hf.space/--replicas/hdlsf/gradio_api/file=/tmp/gradio/0f646bc7c73fc4763a6dfc29e207deeb6bef060d6514e8b04e4d68ea1184610e/image.webp",
  },
  {
    name: "pa-pedestrian-accidents.webp",
    src: "https://mcp-tools-z-image-turbo.hf.space/--replicas/hdlsf/gradio_api/file=/tmp/gradio/9f998efdf5990abdd6c4db96ab31e61cd586ac13d81211a7c94c4846bb108af5/image.webp",
  },
  {
    name: "pa-bicycle-accidents.webp",
    src: "https://mcp-tools-z-image-turbo.hf.space/--replicas/hdlsf/gradio_api/file=/tmp/gradio/9c00fdc560772c58d1a9b2c56c030629c13d84b96c2e5aead66d58a0ca56b21b/image.webp",
  },
  {
    name: "pa-slip-and-fall.webp",
    src: "https://mcp-tools-qwen-image.hf.space/--replicas/n459v/gradio_api/file=/tmp/gradio/cfde3e844d9dc3812718b74bbcc86c3dcf69d06dae3fa96cfaf94a24306eaba0/image.webp",
  },
  {
    name: "pa-wrongful-death.webp",
    src: "https://mcp-tools-z-image-turbo.hf.space/--replicas/hdlsf/gradio_api/file=/tmp/gradio/d0d3cb3abd2ce01e54c4793e2a64fa5f3ab7c2102ddc8ca89c9b0ede1f55c339/image.webp",
  },
  {
    name: "pa-dog-bites.webp",
    src: "https://mcp-tools-z-image-turbo.hf.space/--replicas/hdlsf/gradio_api/file=/tmp/gradio/52143740f359aa39010ab5b4d31f25e2cff78c47bfb271cc5c1b816441622980/image.webp",
  },
  {
    name: "pa-rideshare-accidents.webp",
    src: "https://mcp-tools-z-image-turbo.hf.space/--replicas/hdlsf/gradio_api/file=/tmp/gradio/fba8e4cc2307cd8f25b360c019ebb9673af83a2df3126350a72d80a8d9f09659/image.webp",
  },
  {
    name: "loc-ca-boulevard.webp",
    src: "https://mcp-tools-z-image-turbo.hf.space/--replicas/hdlsf/gradio_api/file=/tmp/gradio/8c4ecc4cec5bb32a7d32edfff60d0ae68e7824385885ee7ba8a5214664b30c83/image.webp",
  },
  {
    name: "loc-courthouse.webp",
    src: "https://mcp-tools-z-image-turbo.hf.space/--replicas/hdlsf/gradio_api/file=/tmp/gradio/28beff22aacb3dc990feb3a265bf14485cc96e9904228c721880920d30808eae/image.webp",
  },
  {
    name: "loc-scales-of-justice.webp",
    src: "https://mcp-tools-z-image-turbo.hf.space/--replicas/hdlsf/gradio_api/file=/tmp/gradio/dfb3923c76cec9060527db3dd95d781214d1ba55aa5d9c5b4dcf857b88d62557/image.webp",
  },
  {
    name: "loc-ca-highway.webp",
    src: "https://mcp-tools-z-image-turbo.hf.space/--replicas/hdlsf/gradio_api/file=/tmp/gradio/54049a0fc95e0a46a7ce121de0c06e2f580cb23a0e45cbcdc5a9f9eedc56c81b/image.webp",
  },
  {
    name: "loc-downtown.webp",
    src: "https://mcp-tools-z-image-turbo.hf.space/--replicas/hdlsf/gradio_api/file=/tmp/gradio/59fd9289c3df5575ace6510d16769153f8478793ba43ce6c977394c96a946df7/image.webp",
  },
  {
    name: "loc-civic.webp",
    src: "https://mcp-tools-z-image-turbo.hf.space/--replicas/hdlsf/gradio_api/file=/tmp/gradio/f23b86ae3158f3f5f111be25e007986d5d82a10f98457333745083e4b55d6df0/image.webp",
  },
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("key") !== TOKEN) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = getServiceSupabase();
  const results: Array<{ name: string; ok: boolean; detail: string }> = [];

  for (const item of ITEMS) {
    try {
      const resp = await fetch(item.src, {
        redirect: "follow",
        signal: AbortSignal.timeout(25_000),
      });
      if (!resp.ok) {
        results.push({
          name: item.name,
          ok: false,
          detail: `src ${resp.status}`,
        });
        continue;
      }
      const type = (resp.headers.get("content-type") ?? "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      if (!ALLOWED.has(type)) {
        results.push({ name: item.name, ok: false, detail: `type ${type}` });
        continue;
      }
      const buf = new Uint8Array(await resp.arrayBuffer());
      if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) {
        results.push({
          name: item.name,
          ok: false,
          detail: `bytes ${buf.byteLength}`,
        });
        continue;
      }
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(item.name, buf, { contentType: type, upsert: true });
      if (error) {
        results.push({ name: item.name, ok: false, detail: error.message });
        continue;
      }
      results.push({ name: item.name, ok: true, detail: `${buf.byteLength}b` });
    } catch (err) {
      results.push({
        name: item.name,
        ok: false,
        detail: err instanceof Error ? err.message : "error",
      });
    }
  }

  const ok = results.filter((r) => r.ok).length;
  return NextResponse.json({ ok, total: ITEMS.length, results });
}
