# v3 design converter

Regenerates `src/components/v3/pages/*.tsx` (+ `v3-generated.css`,
`v3-faqs.ts`) from the Claude Design handoff **"Redesign v3"**
(`design/redesign-v3.dc.html`). It is an offline tool — not part of the app
build, ignored by ESLint, with its own `package.json`.

```bash
cd tools/v3-design
npm install            # parse5 + sharp (one time)
node convert.mjs       # all 50 pages   (or: node convert.mjs car,truck)
python post-resources.py ../..   # hand-wiring for /resources (tools + static map)
```

Always run `post-resources.py` right after `convert.mjs` — it patches the
freshly generated `resources.tsx` and is not idempotent.

## How it works

The prototype is one big stateful component (`class Component extends
DCLogic`). `logic.mjs` executes that class in Node with browser stubs, so
`convert.mjs` can call `renderVals()` for any state and **simulate every click
handler** to classify it:

| handler effect                         | emitted as                                         |
| -------------------------------------- | -------------------------------------------------- |
| `go(page)`                             | `<Link href={route}>` (routes in `routes.mjs`)     |
| `scrollToId(id)`                       | `<a href="#id">`                                   |
| opens the call dialog                  | `<a href="tel:…">`                                 |
| `window.print()`                       | `data-v3-print`                                    |
| flips UI state (drawers, FAQs, tabs)   | `data-v3-on/off/tog` → regions `data-v3-r`         |
| opens a window that only holds a form  | `#v3-form` (page's inline form) or `/contact`      |

Hidden UI (drawers, FAQ answers, tab panels) is **server-rendered** inside
`data-v3-r` regions with `data-off`; `src/components/v3/v3-runtime.tsx`
toggles them with one delegated listener. Content stays crawlable and
works without per-page client components.

Other rules applied during conversion:

- Design `<form>`s → `<V3LeadForm>` (real lead pipeline: Zod, TCPA consent,
  Turnstile, honeypot, `/api/leads`), keeping the design's field styles.
- Per-page design `<footer>`s are dropped (site-wide `V3Footer` carries the
  four CRPC disclaimers). Design `<main>` becomes `<div>`.
- Firm phone / email / address / bar # / hours and Google Maps URLs are
  rewritten to `FIRM.*` from `src/lib/constants.ts` (hard rule #4).
- `style-hover` / `style-focus` → generated classes in `v3-generated.css`.
- Images → `V3Img` (next/image). First hero image gets `priority`; the first
  hero background is `preload`ed.
- `assets.mjs` copies/optimizes referenced images into `public/v3` and writes
  `src/components/v3/v3-assets.ts`. It needs the **original image files**
  from the handoff zip (`mmg-law-redesign/project/uploads/…`), which are not
  committed (1.2 GB). Only rerun it if new images are referenced:
  `node assets.mjs out/assets.json <path-to>/mmg-law-redesign/project <repo>`.

`routes.mjs` mirrors the paths in `src/lib/v3/pages.ts` — keep them in sync.

Generated files are safe to hand-edit, but a re-run overwrites them.
