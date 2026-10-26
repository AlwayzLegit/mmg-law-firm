// Converts the Claude Design "Redesign v3" prototype into Next.js TSX page
// components. The prototype's own logic class is executed in Node so each
// click handler can be classified by simulation (navigate / scroll / call /
// print / open-close-toggle UI regions) instead of being translated by hand.
//
// usage (from the repo root): node tools/v3-design/convert.mjs [pageKeys]
//   pageKeys: optional comma-separated subset, e.g. "car,truck"
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseFragment } from "parse5";
import { loadLogic } from "./logic.mjs";
import { ROUTES, PAGE_COMPONENT } from "./routes.mjs";
import { dedupeIds } from "./dedupe-ids.mjs";

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const DESIGN_HTML = path.join(TOOL_DIR, "design", "redesign-v3.dc.html");
const REPO = path.resolve(TOOL_DIR, "..", "..");
const OUT = path.join(TOOL_DIR, "out");
fs.mkdirSync(OUT, { recursive: true });
const { Component, env, template } = loadLogic(DESIGN_HTML);

const OUT_DIR = path.join(REPO, "src/components/v3/pages");
fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------- logic ----
const BASE = new Component();
const INITIAL_STATE = { ...BASE.state, pvW: 1536 };

function valsFor(state, width = 1536) {
  const c = new Component();
  env.width = width;
  c.state = { ...state, pvW: width };
  const v = c.renderVals();
  env.width = 1536;
  return { c, v };
}

const FAKE_EVENT = {
  preventDefault() {},
  stopPropagation() {},
  target: { value: "" },
  currentTarget: null,
};
FAKE_EVENT.currentTarget = FAKE_EVENT.target;

/** Run a handler against `state`. Returns the resulting state + side effects. */
function simulate(state, getHandler) {
  const { c, v } = valsFor(state);
  const h = getHandler(v);
  if (typeof h !== "function") return null;
  env.scrollTo = [];
  env.lastId = undefined;
  env.printed = 0;
  let goPage = null;
  const origGo = c.go.bind(c);
  c.go = (p) => {
    goPage = p;
    origGo(p);
  };
  const origScroll = c.scrollToId?.bind(c);
  let scrollId = null;
  c.scrollToId = (id) => {
    scrollId = id;
    origScroll?.(id);
  };
  try {
    h(FAKE_EVENT);
  } catch (e) {
    return { error: e.message, src: String(h) };
  }
  return {
    state: c.state,
    goPage,
    scrollId: scrollId ?? env.lastId ?? null,
    printed: env.printed > 0,
    src: String(h),
  };
}

/** Flatten vals into path → truthiness for every non-function value
 *  (top-level plus one level into arrays of objects / plain objects). */
function truthMap(v) {
  const m = new Map();
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === "function") continue;
    m.set(k, truthy(val));
    if (Array.isArray(val)) {
      val.forEach((it, i) => {
        if (it && typeof it === "object")
          for (const [pk, pv] of Object.entries(it))
            if (typeof pv !== "function") m.set(`${k}.${i}.${pk}`, truthy(pv));
      });
    }
  }
  return m;
}

function diffTruth(a, b) {
  const on = [];
  const off = [];
  for (const [k, va] of a) {
    const vb = b.get(k);
    if (vb === undefined || va === vb) continue;
    (vb ? on : off).push(k);
  }
  return { on, off };
}

// ------------------------------------------------------------ template ----
const frag = parseFragment(template, { sourceCodeLocationInfo: false });
function findRootDiv(n) {
  for (const ch of n.childNodes ?? []) {
    if (ch.nodeName === "x-dc") return findRootDiv(ch);
    if (ch.nodeName === "div") return ch;
  }
  return null;
}
const ROOT = findRootDiv(frag);
const TOP = ROOT.childNodes.filter((n) => n.nodeName === "sc-if");
const attr = (n, name) => n.attrs?.find((a) => a.name === name)?.value;
const exprOf = (s) => {
  const m = /^\{\{\s*([^}]+?)\s*\}\}$/.exec((s ?? "").trim());
  return m ? m[1] : null;
};

// ------------------------------------------------------------- helpers ----
const ASSETS = new Map(); // design-relative path -> {out, w, h}
function asset(rel) {
  rel = rel.replace(/^\.\//, "");
  if (!ASSETS.has(rel)) ASSETS.set(rel, null);
  return rel;
}
function publicPath(rel) {
  const ext = path.extname(rel).toLowerCase();
  const base = rel.replace(/^uploads\//, "");
  const out = [".png", ".jpg", ".jpeg"].includes(ext)
    ? base.replace(/\.(png|jpe?g)$/i, ".webp")
    : base;
  return "/v3/" + out.split("/").map(encodeURIComponent).join("/");
}

const HOVER = new Map(); // css -> className
function cssClass(kind, css) {
  const key = kind + "|" + css;
  if (!HOVER.has(key)) {
    const h = crypto.createHash("md5").update(key).digest("hex").slice(0, 7);
    HOVER.set(key, `${kind === "hover" ? "vh" : "vf"}-${h}`);
  }
  return HOVER.get(key);
}

const CAMEL_ATTR = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  autocomplete: "autoComplete",
  colspan: "colSpan",
  rowspan: "rowSpan",
  readonly: "readOnly",
  maxlength: "maxLength",
  minlength: "minLength",
  datetime: "dateTime",
  srcset: "srcSet",
  allowfullscreen: "allowFullScreen",
  frameborder: "frameBorder",
  crossorigin: "crossOrigin",
  enctype: "encType",
  "xlink:href": "xlinkHref",
  "xml:space": "xmlSpace",
  "accept-charset": "acceptCharset",
  "http-equiv": "httpEquiv",
};
const BOOL_ATTR = new Set(["required", "disabled", "checked", "hidden", "open", "multiple", "selected", "readonly", "allowfullscreen", "novalidate"]);
const truthy = (x) => !!x && x !== "none" && x !== "false" && x !== "transparent";
const DROP_ATTR = new Set(["hint-placeholder-val", "hint-placeholder-count", "data-screen-label", "value"]);

function jsAttrName(n) {
  if (CAMEL_ATTR[n]) return CAMEL_ATTR[n];
  if (n.startsWith("data-") || n.startsWith("aria-")) return n;
  if (n.includes("-")) return n.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return n;
}

const q = (s) => JSON.stringify(s);

// Firm constants: never hardcode contact info in output.
const FIRM_TEXT = [
  [/(https:\/\/www\.google\.com\/maps\/(?:search|dir)\/\?api=1&(?:query|destination)=)[^"&]*/g, '$1${encodeURIComponent(FIRM.address.street + ", " + FIRM.address.city + ", " + FIRM.address.state + " " + FIRM.address.zip)}'],
  [/\(818\) 539-7969/g, "${FIRM.phone}"],
  [/info@mmg-lawfirm\.com/g, "${FIRM.email}"],
  [/100 W Broadway, Suite 540/g, "${FIRM.address.street}"],
  [/100 W Broadway(?!, Suite)/g, '${FIRM.address.street.split(",")[0]}'],
  [/Glendale, CA 91210/g, "${FIRM.address.city}, ${FIRM.address.state} ${FIRM.address.zip}"],
  [/\b311455\b/g, "${FIRM.barNumber}"],
  [/\+18185397969/g, "${FIRM.phoneTel}"],
  [/Mon–Fri,? 9am–6pm Pacific/g, "${FIRM.hoursShort}"],
  [/Monday–Friday,? 9(?::00)? ?a\.?m\.?–6(?::00)? ?p\.?m\.? Pacific/g, "${FIRM.hoursLong}"],
];
function firmify(s) {
  let out = s;
  let hit = false;
  for (const [re, rep] of FIRM_TEXT) {
    if (re.test(out)) {
      hit = true;
      out = out.replace(re, rep);
    }
    re.lastIndex = 0;
  }
  return { out, hit };
}
/** JS expression for a string attribute value. */
function strExpr(s) {
  const { out, hit } = firmify(s);
  if (!hit) return q(s);
  return "`" + out.replace(/`/g, "\\`").replace(/\\(?!`)/g, "\\\\") + "`";
}
function textJsx(s) {
  const { out, hit } = firmify(s);
  if (hit) return "{`" + out.replace(/`/g, "\\`") + "`}";
  if (/^[\p{L}\p{N} .,:;!?()/\-–—…’‘“”•·×%$#@+=*_|~^\[\]]*$/u.test(s) && !/^\s|\s$/.test(s)) return s;
  return "{" + q(s) + "}";
}

// Text colors from the design that miss WCAG AA (4.5:1) on the ivory/cream
// backgrounds they sit on, mapped to the nearest same-hue shade that passes
// on all of them (worst case #f4ecdb). Only `color` is remapped; borders,
// fills and backgrounds keep the design value. CLAUDE.md §12 requires AA.
const AA_TEXT_COLORS = { "#987022": "#83601d", "#b07f2c": "#845f21" };

/** Apply AA_TEXT_COLORS to a raw `prop: value; …` declaration string. */
function aaTextColors(decls) {
  return decls.replace(/(^|;)(\s*)color(\s*):(\s*)(#[0-9a-f]{6})/gi, (m, sep, s1, s2, s3, hex) =>
    AA_TEXT_COLORS[hex.toLowerCase()] ? `${sep}${s1}color${s2}:${s3}${AA_TEXT_COLORS[hex.toLowerCase()]}` : m,
  );
}

function styleToObj(style, ctx) {
  const decls = [];
  // split on ; not inside parens
  let depth = 0;
  let cur = "";
  for (const ch of style) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === ";" && depth === 0) {
      decls.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) decls.push(cur);
  const props = [];
  const seen = new Map();
  for (const d of decls) {
    const i = d.indexOf(":");
    if (i < 0) continue;
    let prop = d.slice(0, i).trim();
    let val = d.slice(i + 1).trim();
    if (!prop || !val) continue;
    val = subst(val, ctx, true);
    val = val.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, qq, u) => {
      if (/^(https?:|data:|#)/.test(u)) return m;
      const pub = publicPath(asset(u));
      if (ctx.pc && !ctx.inRegion && !ctx.pc.preload && !/\.svg$/i.test(pub)) ctx.pc.preload = pub;
      return `url('${pub}')`;
    });
    val = val.replace(/(^|,)\s*Lato\b/g, "$1var(--font-lato)").replace(/'Libre Baskerville'/g, "var(--font-libre)");
    const key = prop.startsWith("--")
      ? q(prop)
      : prop.startsWith("-webkit-")
        ? "Webkit" + prop.slice(8).replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^./, (c) => c.toUpperCase())
        : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (key === "color" && AA_TEXT_COLORS[val.toLowerCase()]) val = AA_TEXT_COLORS[val.toLowerCase()];
    seen.set(key, val); // last declaration wins (matches CSS)
  }
  // Gold buttons with light text: the design's golds give 2.3–4.1:1, so
  // swap in an AA-safe gold (5.0:1 on #fff8e8).
  const bg = seen.get("background")?.toLowerCase();
  const fg = seen.get("color")?.toLowerCase();
  if (bg && AA_GOLD_BG.has(bg) && fg && LIGHT_TEXT.has(fg)) seen.set("background", AA_GOLD);
  for (const [k, v] of seen) props.push(`${k}:${q(v)}`);
  return props;
}
const AA_GOLD = "#86662f";
const AA_GOLD_BG = new Set(["#b68b3c", "#9a7330", "#a8813f", "#9c7a33", "#c9a03f"]);
const LIGHT_TEXT = new Set(["#fff8e8", "#fffdf8", "#fbf8f1", "#f5f2ea", "#fff", "#ffffff"]);
// Hover backgrounds of those buttons (all used with light text in the design).
const AA_GOLD_HOVER = { "#b68f35": "#755829", "#a27a30": "#755829", "#94712f": "#755829" };

/** Replace {{ expr }} inside an attribute/style string. In style context,
 *  values that differ by viewport become CSS custom properties. */
function subst(s, ctx, inStyle = false) {
  return s.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, e) => {
    const val = resolve(e, ctx);
    if (inStyle && ctx.responsive) {
      const narrow = resolve(e, { ...ctx, v: ctx.vNarrow, locals: ctx.localsNarrow ?? ctx.locals });
      if (narrow !== undefined && String(narrow) !== String(val)) {
        const name = "--v3r-" + e.replace(/[^a-zA-Z0-9]/g, "-");
        RESPONSIVE.set(name, { wide: String(val), narrow: String(narrow) });
        return `var(${name})`;
      }
    }
    return val === undefined || val === null ? "" : String(val);
  });
}
const RESPONSIVE = new Map();

function resolve(e, ctx) {
  const parts = e.split(".");
  let cur;
  if (ctx.locals && parts[0] in ctx.locals) cur = ctx.locals[parts[0]];
  else cur = ctx.v[parts[0]];
  for (const p of parts.slice(1)) cur = cur == null ? undefined : cur[p];
  return cur;
}
function localPath(e, ctx) {
  // stable name for a value path, expanding loop locals to list.index
  const parts = e.split(".");
  if (ctx.localPaths && parts[0] in ctx.localPaths) return [ctx.localPaths[parts[0]], ...parts.slice(1)].join(".");
  return e;
}

// ------------------------------------------------------------ triggers ----
// Each page conversion collects triggers; region keys are resolved in a
// second pass once we know which regions were split per opener.
class PageConv {
  constructor(page) {
    this.page = page;
    this.state0 = { ...INITIAL_STATE, page };
    this.triggers = []; // {id, on:[], off:[], tog:[], self}
    this.openers = new Map(); // truth-path -> [{trigId, state}]
    this.regions = new Map(); // truth-path -> {split:boolean, keys:Set}
    this.unknown = new Set();
    this.forms = 0;
    this.toolInputs = [];
    this.imports = new Set(["FIRM"]);
    this.preload = null;
    this.displayRegions = new Set();
    this.faqs = [];
  }
}

function stateKey(st) {
  return JSON.stringify(st, (k, v) => (typeof v === "function" ? undefined : v));
}
function classify(pc, ctx, handlerExpr) {
  const hpath = localPath(handlerExpr, ctx);
  if (pc.force?.has(hpath)) return pc.force.get(hpath);
  const getH = (v) => {
    // re-resolve via path against fresh vals (locals map to list paths)
    const parts = hpath.split(".");
    let cur = v[parts[0]];
    for (const p of parts.slice(1)) cur = cur == null ? undefined : cur[p];
    return cur;
  };
  const r = simulate(ctx.state, getH);
  if (!r) return { kind: "none" };
  if (r.error) return { kind: "error", msg: r.error };
  if (r.goPage && r.goPage !== ctx.state.page) {
    return { kind: "nav", href: ROUTES[r.goPage]?.path ?? "/", hash: r.scrollId };
  }
  if (r.goPage === ctx.state.page && !r.scrollId) return { kind: "nav", href: ROUTES[r.goPage]?.path ?? "/" };
  if (r.scrollId) return { kind: "scroll", id: r.scrollId };
  if (r.printed) return { kind: "print" };
  const s1 = r.state;
  if (s1.call && !ctx.state.call) return { kind: "tel" };
  if (s1.menu && !ctx.state.menu) return { kind: "nav", href: "/practice-areas" };
  if (s1.aboutMenu && !ctx.state.aboutMenu) return { kind: "nav", href: "/about-the-firm" };
  const t0 = truthMap(valsFor(ctx.state).v);
  const t1 = truthMap(valsFor(s1).v);
  const { on, off } = diffTruth(t0, t1);
  if (!on.length && !off.length) {
    const changed = stateKey(s1) !== stateKey(ctx.state);
    return { kind: changed ? "value" : "pending", state: changed ? s1 : null, getH, from: ctx.state, on: [], off: [], tog: [], self: /currentTarget/.test(r.src) };
  }
  // toggle detection: apply again
  const r2 = simulate(s1, getH);
  const t2 = r2 && !r2.error ? truthMap(valsFor(r2.state).v) : t1;
  const tog = [];
  const on2 = [];
  const off2 = [];
  for (const k of on) (t2.get(k) === t0.get(k) ? tog : on2).push(k);
  for (const k of off) (t2.get(k) === t0.get(k) ? tog : off2).push(k);
  const self = /currentTarget/.test(r.src);
  return { kind: "ui", on: on2, off: off2, tog, state: s1, self, getH, from: ctx.state };
}

function styleLit(props) {
  const o = `{${props.join(",")}}`;
  return o.includes("var(--v3r-") ? `${o} as unknown as CSSProperties` : o;
}
function isDynamic(pc, p) {
  return pc.triggers.some((t) => t.on.includes(p) || t.off.includes(p) || t.tog.includes(p));
}

// --------------------------------------------------------------- emit ----
const VOID = new Set(["img", "input", "br", "hr", "meta", "link", "source", "area", "col", "embed", "track", "wbr"]);
const INLINE_PARENTS = new Set(["button", "p", "span", "a", "h1", "h2", "h3", "h4", "h5", "h6", "label", "strong", "em", "small", "li", "td", "th", "summary"]);

function convChildren(nodes, ctx, parent) {
  const out = [];
  const parentStyle = parent ? attr(parent, "style") ?? "" : "";
  const flexy = /display:\s*(flex|grid|inline-flex|inline-grid)/.test(parentStyle);
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.nodeName === "#text") {
      let t = n.value;
      if (/\{\{/.test(t)) t = subst(t, ctx);
      if (!t.trim()) {
        if (!flexy && !/\n/.test(t) && i > 0 && i < nodes.length - 1) out.push('{" "}');
        else if (!flexy && /\n/.test(t) && i > 0 && i < nodes.length - 1 && parent && INLINE_PARENTS.has(parent.nodeName)) out.push('{" "}');
        continue;
      }
      const lead = /^\s/.test(t) && i > 0 ? '{" "}' : "";
      const trail = /\s$/.test(t) && i < nodes.length - 1 ? '{" "}' : "";
      out.push(lead + textJsx(t.replace(/\s+/g, " ").trim()) + trail);
      continue;
    }
    if (n.nodeName === "#comment") continue;
    const r = conv(n, ctx, parent);
    if (r) out.push(r);
  }
  return out.join("");
}

function conv(n, ctx, parent) {
  const pc = ctx.pc;
  const tag = n.nodeName;
  if (tag === "sc-if") return convIf(n, ctx, parent);
  if (tag === "sc-for") return convFor(n, ctx, parent);
  if (tag === "footer" && !ctx.inRegion) return ""; // unified site footer replaces per-page footers
  if (tag === "template") return convChildren(n.content?.childNodes ?? [], ctx, parent);
  if (tag === "form") return convForm(n, ctx);
  if (tag === "iframe") {
    const src = attr(n, "src") ?? "";
    pc.notes = (pc.notes ?? []).concat(`iframe ${src}`);
    return `<iframe src=${q(src.startsWith("http") ? src : "/v3/" + src)} title=${q(attr(n, "title") ?? "")} style={{${styleToObj(attr(n, "style") ?? "", ctx).join(",")}}} loading="lazy" />`;
  }

  let outTag = tag === "main" ? "div" : tag;
  const props = [];
  let styleProps = attr(n, "style") ? styleToObj(attr(n, "style"), ctx) : [];
  let dispRegion = null;
  {
    const m = /(?:^|;)\s*display:\s*\{\{\s*([^}]+?)\s*\}\}/.exec(attr(n, "style") ?? "");
    if (m) {
      const p = localPath(m[1], ctx);
      const cur = resolve(m[1], ctx);
      if (isDynamic(pc, p)) {
        dispRegion = { key: p, hidden: !truthy(cur) };
        if (!truthy(cur)) styleProps = styleProps.map((d) => (d.startsWith("display:") ? `display:${q(tag === "span" ? "inline-block" : "block")}` : d));
      }
    }
  }
  const classes = [];
  let handler = null;
  let changeHandler = null;
  for (const a of n.attrs ?? []) {
    const name = a.name;
    if (DROP_ATTR.has(name) && !(name === "value" && tag !== "input" && tag !== "textarea" && tag !== "option" && tag !== "select")) continue;
    if (name === "style") continue;
    if (name === "style-hover") {
      classes.push(cssClass("hover", aaTextColors(subst(a.value, ctx))));
      continue;
    }
    if (name === "style-focus") {
      classes.push(cssClass("focus", aaTextColors(subst(a.value, ctx))));
      continue;
    }
    if (name === "onclick") {
      handler = exprOf(a.value);
      continue;
    }
    if (name === "onchange" || name === "oninput") {
      changeHandler = exprOf(a.value);
      continue;
    }
    if (name.startsWith("on")) continue;
    if (name === "data-act") continue;
    let val = a.value;
    if (/\{\{/.test(val) && (name === "aria-expanded" || name === "aria-selected") && exprOf(val)) {
      props.push(`data-v3-${name === "aria-expanded" ? "aria" : "sel"}=${q(localPath(exprOf(val), ctx))}`);
    }
    if (/\{\{/.test(val)) {
      const e = exprOf(val);
      const r = e ? resolve(e, ctx) : subst(val, ctx);
      if (typeof r === "function") continue;
      val = r === undefined || r === null ? "" : String(r);
      if (name.startsWith("aria-") && (val === "true" || val === "false")) {
        props.push(`${name}=${q(val)}`);
        continue;
      }
    }
    if (name === "src" && (tag === "img" || tag === "source")) continue; // handled below
    if (name === "href" && /^uploads\//.test(val)) val = publicPath(asset(val));
    if (BOOL_ATTR.has(name)) {
      props.push(jsAttrName(name));
      continue;
    }
    props.push(`${jsAttrName(name)}={${strExpr(val)}}`);
  }

  if (changeHandler && !ctx.inForm) pc.toolInputs.push(changeHandler);

  // click handlers ---------------------------------------------------------
  if (handler) {
    const k = classify(pc, ctx, handler);
    const extra = [];
    const keepLook = () => {
      // button → anchor: keep UA button defaults the design relied on
      const has = (p) => styleProps.some((s) => s.startsWith(p + ":"));
      if (!has("display")) {
        // <button> centers its content vertically; an <a> with a fixed
        // height needs flex to do the same.
        if (has("height")) extra.push(`display:"inline-flex"`, `alignItems:"center"`, `justifyContent:"center"`);
        else extra.push(`display:"inline-block"`);
      }
      if (!has("color")) extra.push(`color:"inherit"`);
      if (!has("textAlign") && tag === "button") extra.push(`textAlign:"center"`);
      if (!has("cursor")) extra.push(`cursor:"pointer"`);
    };
    const dropType = () => {
      for (const pre of ["type=", "href="]) {
        const i = props.findIndex((p) => p.startsWith(pre));
        if (i >= 0) props.splice(i, 1);
      }
    };
    if (k.kind === "nav") {
      outTag = "Link";
      pc.imports.add("Link");
      dropType();
      props.push(`href=${q(k.href + (k.hash ? "#" + k.hash : ""))}`);
      if (tag !== "a") keepLook();
    } else if (k.kind === "scroll") {
      outTag = "a";
      dropType();
      props.push(`href=${q("#" + k.id)}`);
      if (tag !== "a") keepLook();
    } else if (k.kind === "tel") {
      outTag = "a";
      dropType();
      props.push("href={`tel:${FIRM.phoneTel}`}");
      if (tag !== "a") keepLook();
    } else if (k.kind === "print") {
      props.push(`data-v3-print=""`);
      if (tag === "button" && !props.some((p) => p.startsWith("type="))) props.push(`type="button"`);
    } else if (k.kind === "ui" || k.kind === "value" || k.kind === "pending") {
      const id = pc.triggers.length;
      pc.triggers.push({ id, hpath: localPath(handler, ctx), ...k });
      if (ctx.instTrigs) ctx.instTrigs.push(id);
      for (const key of [...k.on, ...k.tog]) {
        if (!pc.openers.has(key)) pc.openers.set(key, []);
        pc.openers.get(key).push({ trigId: id, state: k.state });
      }
      props.push(`{...T[${id}]}`);
      if (tag === "button" && !props.some((p) => p.startsWith("type="))) props.push(`type="button"`);
      if (tag === "a" && !props.some((p) => p.startsWith("href="))) props.push(`href="#"`);
    } else {
      pc.unknown.add(`${handler}:${k.kind}${k.msg ? ":" + k.msg : ""}`);
      if (tag === "button" && !props.some((p) => p.startsWith("type="))) props.push(`type="button"`);
    }
    if (extra.length) styleProps = [...extra, ...styleProps];
  } else if (tag === "button" && !props.some((p) => p.startsWith("type="))) {
    props.push(`type="button"`);
  }

  // images -----------------------------------------------------------------
  if (tag === "img") {
    const src = attr(n, "src") ?? "";
    const rel = /^\{\{/.test(src) ? subst(src, ctx) : src;
    if (!rel) return "";
    const alt = attr(n, "alt") ?? "";
    pc.imports.add("V3Img");
    const cls = classes.length ? ` className=${q(classes.join(" "))}` : "";
    const sty = styleProps.length ? ` style={${styleLit(styleProps)}}` : "";
    if (dispRegion) {
      props.push(`data-v3-r=${q(dispRegion.key)}`);
      if (dispRegion.hidden) props.push(`data-off=""`);
      pc.displayRegions.add(dispRegion.key);
    }
    const other = props.filter((p) => !p.startsWith("alt=")).join(" ");
    let pri = "";
    if (!ctx.inRegion && !pc.lcpDone && !/\.svg$/i.test(rel)) {
      pc.lcpDone = true;
      pri = " priority";
    }
    if (/^https?:/.test(rel)) return `<V3Img src=${q(rel)} alt=${strExpr(alt)}${cls}${sty} ${other} />`;
    return `<V3Img src=${q(asset(rel))} alt=${strExpr(alt)}${cls}${sty}${pri} ${other} />`;
  }

  if (dispRegion) {
    props.push(`data-v3-r=${q(dispRegion.key)}`);
    if (dispRegion.hidden) props.push(`data-off=""`);
    pc.displayRegions.add(dispRegion.key);
  }
  if (classes.length) props.push(`className=${q(classes.join(" "))}`);
  if (styleProps.length) props.push(`style={${styleLit(styleProps)}}`);

  // inputs outside forms (tools) get defaultValue
  if ((tag === "input" || tag === "textarea" || tag === "select") && !ctx.inForm) {
    const v = attr(n, "value");
    if (v && !/\{\{/.test(v)) props.push(`defaultValue=${q(v)}`);
  }
  if (tag === "option") {
    const v = attr(n, "value");
    if (v !== undefined) props.push(`value=${q(v)}`);
  }

  const open = `<${outTag}${props.length ? " " + props.join(" ") : ""}`;
  if (VOID.has(tag)) return open + " />";
  const kids = convChildren(tag === "template" ? [] : n.childNodes ?? [], { ...ctx, inForm: ctx.inForm }, n);
  return `${open}>${kids}</${outTag}>`;
}

function convFor(n, ctx, parent) {
  const listExpr = exprOf(attr(n, "list"));
  const as = attr(n, "as");
  const list = resolve(listExpr, ctx) ?? [];
  const listPath = localPath(listExpr, ctx);
  if (!ctx.inRegion && list.length && list.every((it) => it && typeof it.q === "string" && typeof it.a === "string"))
    for (const it of list) ctx.pc.faqs.push({ question: it.q, answer: it.a });
  let out = "";
  list.forEach((item, i) => {
    const locals = { ...(ctx.locals ?? {}), [as]: item };
    const localPaths = { ...(ctx.localPaths ?? {}), [as]: `${listPath}.${i}` };
    out += convChildren(n.childNodes ?? [], { ...ctx, locals, localPaths }, parent);
  });
  return out;
}

function convForm(n, ctx) {
  const pc = ctx.pc;
  pc.forms++;
  if (!ctx.inRegion) pc.inlineForms = (pc.inlineForms ?? 0) + 1;
  pc.imports.add("V3LeadForm");
  // capture the design's field + button styling and labels for this form
  const fields = [];
  let submit = null;
  let inputStyle = null;
  let textareaStyle = null;
  let rowStyle = null;
  let note = null;
  const ownText = (el) =>
    (el.childNodes ?? [])
      .filter((c) => !["input", "textarea", "select"].includes(c.nodeName))
      .map(textOf)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  let labelText = "";
  const walk = (m, depth) => {
    for (const ch of m.childNodes ?? []) {
      if (ch.nodeName === "label") {
        const prev = labelText;
        labelText = ownText(ch);
        walk(ch, depth);
        labelText = prev;
        continue;
      }
      if (ch.nodeName === "input" || ch.nodeName === "textarea" || ch.nodeName === "select") {
        if (attr(ch, "type") === "checkbox" || attr(ch, "type") === "hidden") continue;
        const nm = attr(ch, "name") ?? (ch.nodeName === "select" ? "type" : ch.nodeName === "textarea" ? "case" : attr(ch, "type") === "email" ? "email" : attr(ch, "type") === "tel" ? "phone" : "name");
        fields.push({ name: nm, placeholder: attr(ch, "placeholder") ?? attr(ch, "aria-label") ?? labelText ?? "", required: ch.attrs.some((a) => a.name === "required"), tag: ch.nodeName, row: depth > 0 });
        if (ch.nodeName === "input" && !inputStyle) inputStyle = attr(ch, "style");
        if (ch.nodeName === "textarea" && !textareaStyle) textareaStyle = attr(ch, "style");
        if (ch.nodeName === "select") {
          fields[fields.length - 1].options = (ch.childNodes ?? []).filter((o) => o.nodeName === "option").map((o) => ({ value: attr(o, "value") ?? "", label: (o.childNodes?.[0]?.value ?? "").trim() }));
          fields[fields.length - 1].style = attr(ch, "style");
        }
      } else if (ch.nodeName === "button" && (attr(ch, "type") === "submit" || !attr(ch, "type"))) {
        submit = { style: attr(ch, "style"), hover: attr(ch, "style-hover"), label: textOf(ch).trim() };
      } else if (ch.nodeName === "p" && !note) {
        note = { style: attr(ch, "style"), text: textOf(ch).trim() };
      } else if (ch.nodeName === "div" && /grid-template-columns/.test(attr(ch, "style") ?? "") && !rowStyle) {
        rowStyle = attr(ch, "style");
        walk(ch, depth + 1);
      } else walk(ch, depth);
    }
  };
  walk(n, 0);
  const so = (s) => (s ? `{${styleToObj(s, ctx).join(",")}}` : "undefined");
  const hoverCls = submit?.hover ? cssClass("hover", submit.hover) : null;
  const practice = ROUTES[ctx.state.page]?.practiceArea;
  const first = !ctx.inRegion && pc.inlineForms === 1;
  return `<V3LeadForm${first ? ' id="v3-form"' : ""} formStyle={${so(attr(n, "style"))}} rowStyle={${so(rowStyle)}} inputStyle={${so(inputStyle)}} textareaStyle={${so(textareaStyle)}} buttonStyle={${so(submit?.style)}}${hoverCls ? ` buttonClassName=${q(hoverCls)}` : ""} submitLabel={${strExpr(submit?.label || "Request consultation")}} fields={${JSON.stringify(fields)}}${note ? ` note={${strExpr(note.text)}} noteStyle={${so(note.style)}}` : ""}${practice ? ` practiceArea=${q(practice)}` : ""} />`;
}

function textOf(n) {
  if (n.nodeName === "#text") return n.value;
  return (n.childNodes ?? []).map(textOf).join("");
}

function convIf(n, ctx, parent) {
  const pc = ctx.pc;
  const e = exprOf(attr(n, "value"));
  const val = resolve(e, ctx);
  const tpath = localPath(e, ctx);
  // the "sent" (post-submit) variants are owned by V3LeadForm
  if (/Sent$|^sent$|NotSent$|firstName|result/.test(e)) {
    if (/NotSent$/.test(e)) return convChildren(n.childNodes ?? [], ctx, parent);
    return "";
  }
  const openers = pc.openers.get(tpath) ?? [];
  const toggled = pc.triggers.some((t) => t.off.includes(tpath) || t.tog.includes(tpath));
  if (val) {
    const inner = convChildren(n.childNodes ?? [], ctx, parent);
    if (!toggled) return inner;
    return wrapRegion(inner, `${tpath}`, false, parent);
  }
  if (!openers.length) return "";
  const norm = (h) =>
    h.replace(/\{\.\.\.T\[(\d+)\]\}/g, (_, id) => {
      const t = pc.triggers[+id];
      return "{T:" + JSON.stringify([t.kind, t.on, t.off, t.tog, t.state ? stateKey(t.state) : null]) + "}";
    });
  const insts = [];
  const queue = openers.map((o) => ({ state: o.state, trigIds: [o.trigId], from: null }));
  const links = [];
  while (queue.length && insts.length < 30) {
    const it = queue.shift();
    const st = it.state;
    const { v } = valsFor(st);
    const { v: vN } = valsFor(st, 390);
    const sub = { ...ctx, state: st, v, vNarrow: vN, inRegion: true, instTrigs: [] };
    if (ctx.localPaths) {
      const locals = {};
      for (const [k, p] of Object.entries(ctx.localPaths)) {
        const parts = p.split(".");
        let cur = v[parts[0]];
        for (const x of parts.slice(1)) cur = cur == null ? undefined : cur[x];
        locals[k] = cur;
      }
      sub.locals = locals;
    }
    const html = convChildren(n.childNodes ?? [], sub, parent);
    const nh = norm(html);
    let inst = insts.find((x) => x.norm === nh);
    if (!inst) {
      inst = { norm: nh, html, trigIds: [], idx: insts.length };
      insts.push(inst);
      for (const id of sub.instTrigs) {
        const t = pc.triggers[id];
        if (t.kind === "value" && t.state) queue.push({ state: t.state, trigIds: [id], from: inst });
      }
    }
    inst.trigIds.push(...it.trigIds);
    if (it.from && it.from !== inst) for (const id of it.trigIds) links.push({ id, from: it.from, to: inst });
  }
  const reg = {
    split: insts.length > 1,
    keys: new Set(),
    hasForm: insts.some((x) => x.html.includes("<V3LeadForm")),
    openerIds: openers.map((o) => o.trigId),
  };
  pc.regions.set(tpath, reg);
  let out = "";
  for (const inst of insts) {
    inst.key = reg.split ? `${tpath}@${inst.idx}` : tpath;
    reg.keys.add(inst.key);
    if (reg.split) for (const t of inst.trigIds) (pc.splitMap ??= new Map()).set(`${t}|${tpath}`, inst.key);
    out += wrapRegion(inst.html, inst.key, true, parent);
  }
  for (const l of links) {
    const t = pc.triggers[l.id];
    t.linkOn = [l.to.key];
    t.linkOff = [l.from.key];
  }
  return out;
}

function wrapRegion(inner, key, hidden, parent) {
  const tag = parent && INLINE_PARENTS.has(parent.nodeName) ? "span" : "div";
  return `<${tag} data-v3-r=${q(key)}${hidden ? ' data-off=""' : ""} style={{display:"contents"}}>${inner}</${tag}>`;
}

// ---------------------------------------------------------- page build ----
function findPageBlock(page) {
  const { v } = valsFor({ ...INITIAL_STATE, page });
  for (const n of TOP) {
    const e = exprOf(attr(n, "value"));
    if (/^is[A-Z]/.test(e) && v[e]) return n;
  }
  return null;
}
const WINDOW_BLOCKS = TOP.filter((n) => !/^is[A-Z]/.test(exprOf(attr(n, "value")) ?? ""));

function buildPage(page, force) {
  const pc = new PageConv(page);
  pc.force = force;
  const { v } = valsFor(pc.state0);
  const { v: vN } = valsFor(pc.state0, 390);
  const ctx = { pc, state: pc.state0, v, vNarrow: vN, responsive: true };
  const block = findPageBlock(page);
  if (!block) throw new Error("no block for " + page);
  let body = convChildren(block.childNodes, ctx, null);
  // windows / drawers / side tab
  let windows = "";
  for (const w of WINDOW_BLOCKS) {
    const e = exprOf(attr(w, "value"));
    if (["menuOpenGl", "menuOpenStd", "aboutMenuOpen", "callOpen"].includes(e)) continue;
    windows += conv(w, ctx, null);
  }
  // pending / value triggers: aggregate effects from other reachable states
  const alt = [pc.state0, ...pc.triggers.filter((t) => t.state).map((t) => t.state)];
  for (const t of pc.triggers) {
    if ((t.kind !== "pending" && t.kind !== "value") || t.linkOn) continue;
    const on = new Set();
    const off = new Set();
    const seen = new Set();
    for (const sa of alt) {
      const key = stateKey(sa);
      if (seen.has(key)) continue;
      seen.add(key);
      const r = simulate(sa, t.getH);
      if (!r || r.error) continue;
      const d = diffTruth(truthMap(valsFor(sa).v), truthMap(valsFor(r.state).v));
      d.on.forEach((k) => on.add(k));
      d.off.forEach((k) => off.add(k));
    }
    for (const k of on) off.delete(k);
    t.on = [...on];
    t.off = [...off];
    if (!t.on.length && !t.off.length) pc.unknown.add(`${t.hpath}:inert`);
  }
  // resolve trigger attributes
  const T = pc.triggers.map((t) => {
    if (t.linkOn) {
      const o = { "data-v3-on": t.linkOn.join(" "), "data-v3-off": t.linkOff.join(" ") };
      if (t.self) o["data-v3-self"] = "";
      return o;
    }

    const map = (k) => {
      const reg = pc.regions.get(k);
      if (reg?.split) return pc.splitMap?.get(`${t.id}|${k}`) ?? [...reg.keys];
      return k;
    };
    const known = (k) => pc.regions.has(k) || pc.staticToggled?.has(k) || true;
    const on = t.on.flatMap((k) => [map(k)].flat()).filter(known);
    const off = t.off.flatMap((k) => {
      const reg = pc.regions.get(k);
      return reg?.split ? [...reg.keys] : [k];
    });
    const tog = t.tog.flatMap((k) => [map(k)].flat());
    const o = {};
    if (on.length) o["data-v3-on"] = on.join(" ");
    if (off.length) o["data-v3-off"] = off.join(" ");
    if (tog.length) o["data-v3-tog"] = tog.join(" ");
    if (t.self) o["data-v3-self"] = "";
    return o;
  });
  return { pc, body, windows, T };
}

// ----------------------------------------------------------------- run ----
const report = {};
const FAQS = {};
const pages = process.argv[2] ? process.argv[2].split(",") : BASE.PAGES;
for (const page of pages) {
  if (!ROUTES[page]) {
    console.warn("no route for", page);
    continue;
  }
  let built = buildPage(page, new Map());
  {
    // Consultation windows hold their own lead form; point their openers at
    // the page's inline form (or /contact) instead of stacking forms.
    const { pc } = built;
    const formTrig = new Set();
    for (const reg of pc.regions.values()) if (reg.hasForm) reg.openerIds.forEach((id) => formTrig.add(id));
    if (formTrig.size) {
      const force = new Map();
      for (const t of pc.triggers) {
        if (!formTrig.has(t.id)) continue;
        const opensOther = [...t.on, ...t.tog].some((k) => { const r = pc.regions.get(k); return r && !r.hasForm; });
        if (!opensOther) force.set(t.hpath, { kind: "pending" });
      }
      // does the page keep an inline (non-window) form?
      const probe = buildPage(page, new Map([...force].map(([k]) => [k, { kind: "scroll", id: "v3-form" }])));
      const inline = (probe.pc.inlineForms ?? 0) > 0;
      for (const k of force.keys()) force.set(k, inline ? { kind: "scroll", id: "v3-form" } : { kind: "nav", href: "/contact" });
      built = inline ? probe : buildPage(page, force);
    }
  }
  const { pc, body, windows, T } = built;
  const name = PAGE_COMPONENT(page);
  const imports = [];
  if (pc.imports.has("Link")) imports.push('import Link from "next/link";');
  if (body.includes("as unknown as CSSProperties") || windows.includes("as unknown as CSSProperties")) imports.push('import type { CSSProperties } from "react";');
  // Rendered <link> preload, not ReactDOM.preload(): see hero-preload.tsx.
  if (pc.preload) imports.push('import { ImagePreload } from "@/components/v3/hero-preload";');
  imports.push('import { FIRM } from "@/lib/constants";');
  if (pc.imports.has("V3Img")) imports.push('import { V3Img } from "@/components/v3/v3-img";');
  if (pc.imports.has("V3LeadForm")) imports.push('import { V3LeadForm } from "@/components/v3/v3-lead-form";');
  const src = `// Generated from the Claude Design handoff "Redesign v3" (${page}).
// Safe to edit by hand. Interactive regions use data-v3-* attributes that
// are wired up by <V3Runtime /> (src/components/v3/v3-runtime.tsx).
// TODO(human): attorney review required — page copy was drafted with AI
// assistance in the design handoff and must be reviewed before relying on it.
${imports.join("\n")}

${T.length ? `const T: Record<string, string>[] = ${JSON.stringify(T)};` : ""}

export function ${name}() {
  return (
    <div className="v3-page">
${pc.preload ? `      {/* Hero background is the LCP element: fetch it before CSS discovers it. */}
      <ImagePreload href={${q(decodeURI(pc.preload))}} />
` : ""}      ${body}
      ${windows}
    </div>
  );
}
`;
  fs.writeFileSync(path.join(OUT_DIR, `${page}.tsx`), dedupeIds(src));
  if (pc.faqs.length) FAQS[page] = pc.faqs;
  report[page] = {
    bytes: src.length,
    triggers: T.length,
    regions: pc.regions.size,
    forms: pc.forms,
    unknown: [...pc.unknown],
    tools: pc.toolInputs,
    notes: pc.notes,
  };
}

// hover / focus css + responsive vars ----------------------------------------
let css = "/* Generated from the design handoff: hover/focus states. */\n";
for (const [key, cls] of HOVER) {
  const [kind, decls] = [key.slice(0, key.indexOf("|")), key.slice(key.indexOf("|") + 1)];
  const body = decls
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => d.replace(/\s*!important\s*$/, ""))
    .map((d) => d.replace(/^(background\s*:\s*)(#[0-9a-fA-F]{6})$/, (m, k, hex) => (AA_GOLD_HOVER[hex.toLowerCase()] ? k + AA_GOLD_HOVER[hex.toLowerCase()] : m)))
    .map((d) => d + " !important")
    .join(";");
  css += kind === "hover" ? `.${cls}:hover{${body}}\n` : `.${cls}:focus,.${cls}:focus-visible{${body}}\n`;
}
if (RESPONSIVE.size) {
  css += ":root{" + [...RESPONSIVE].map(([k, v]) => `${k}:${v.narrow}`).join(";") + "}\n";
  // The three-column FAQ layout (270px nav + content + 362px card) needs
  // ~1360px; at 1240–1359 the card wrapped under the sticky nav and the two
  // sticky asides overlapped. Everything else switches at 1240.
  const wideAt = (k) => (k.startsWith("--v3r-faq") ? 1360 : 1240);
  for (const bp of [1240, 1360]) {
    const vars = [...RESPONSIVE].filter(([k]) => wideAt(k) === bp);
    if (vars.length) css += `@media (min-width:${bp}px){:root{` + vars.map(([k, v]) => `${k}:${v.wide}`).join(";") + "}}\n";
  }
}
fs.writeFileSync(path.join(REPO, "src/components/v3/v3-generated.css"), css);
fs.writeFileSync(
  path.join(REPO, "src/components/v3/v3-faqs.ts"),
  `// Generated: visible FAQ copy per v3 page (used for FAQPage JSON-LD).
import type { FaqItem } from "@/lib/data/faqs";

export const V3_FAQS: Record<string, FaqItem[]> = ${JSON.stringify(FAQS, null, 1)};
`,
);
fs.writeFileSync(path.join(OUT, "assets.json"), JSON.stringify([...ASSETS.keys()], null, 1));
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1).slice(0, 6000));
console.log("assets", ASSETS.size, "hover classes", HOVER.size, "responsive", RESPONSIVE.size);
