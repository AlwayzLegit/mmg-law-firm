// Copies + optimizes every design asset referenced by the generated pages
// into public/v3 and writes src/components/v3/v3-assets.ts (path → dims).
// usage: node assets.mjs <assets.json> <designProjectDir> <repoRoot>
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [, , LIST, PROJ, REPO] = process.argv;
const list = JSON.parse(fs.readFileSync(LIST, "utf8"));
const outRoot = path.join(REPO, "public", "v3");
const map = {};
let inBytes = 0;
let outBytes = 0;
const missing = [];

function svgDims(buf) {
  const s = buf.toString("utf8", 0, Math.min(buf.length, 4000));
  const vb = /viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(s);
  const w = /\bwidth="([\d.]+)(px)?"/.exec(s);
  const h = /\bheight="([\d.]+)(px)?"/.exec(s);
  if (w && h) return [Math.round(+w[1]), Math.round(+h[1])];
  if (vb) return [Math.round(+vb[1]), Math.round(+vb[2])];
  return [64, 64];
}

for (const rel of list) {
  const src = path.join(PROJ, decodeURIComponent(rel));
  if (!fs.existsSync(src)) {
    missing.push(rel);
    continue;
  }
  const ext = path.extname(rel).toLowerCase();
  const base = rel.replace(/^uploads\//, "");
  const buf = fs.readFileSync(src);
  inBytes += buf.length;
  let outRel = base;
  let w = 0;
  let h = 0;
  let out;
  if ([".png", ".jpg", ".jpeg"].includes(ext)) {
    outRel = base.replace(/\.(png|jpe?g)$/i, ".webp");
    const img = sharp(buf);
    const meta = await img.metadata();
    const big = /backgrounds|hero|banner|photos|portraits|assets/i.test(rel);
    const maxW = big ? 1920 : 1200;
    let pipe = sharp(buf);
    if (meta.width > maxW) pipe = pipe.resize({ width: maxW });
    out = await pipe.webp({ quality: big ? 74 : 80, alphaQuality: 90, effort: 5 }).toBuffer();
    const m2 = await sharp(out).metadata();
    w = m2.width;
    h = m2.height;
  } else if (ext === ".webp") {
    const meta = await sharp(buf).metadata();
    if (meta.width > 1920) {
      out = await sharp(buf).resize({ width: 1920 }).webp({ quality: 74 }).toBuffer();
      const m2 = await sharp(out).metadata();
      w = m2.width;
      h = m2.height;
    } else {
      out = buf;
      w = meta.width;
      h = meta.height;
    }
  } else if (ext === ".svg") {
    out = buf;
    [w, h] = svgDims(buf);
  } else {
    out = buf;
  }
  const dest = path.join(outRoot, outRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, out);
  outBytes += out.length;
  map[rel] = { src: "/v3/" + outRel.split("/").map(encodeURIComponent).join("/"), w, h };
}

const ts = `// Generated: design asset paths → optimized public files + intrinsic size.
export type V3Asset = { src: string; w: number; h: number };
export const V3_ASSETS: Record<string, V3Asset> = ${JSON.stringify(map, null, 1)};
`;
fs.writeFileSync(path.join(REPO, "src/components/v3/v3-assets.ts"), ts);
console.log(`assets ${Object.keys(map).length}, in ${(inBytes / 1e6).toFixed(1)}MB → out ${(outBytes / 1e6).toFixed(1)}MB`);
if (missing.length) console.log("MISSING", missing);
