# Brand image drop zone

This directory holds editorial brand images referenced by server
components on the marketing site. When a file isn't here the
corresponding section either skips its image (gracefully) or returns
null entirely — the rest of the page renders fine.

## Expected files

| Filename | Used by | Aspect | Notes |
|---|---|---|---|
| `consultation.webp` | Homepage `HowWeWork` band | 4:3 landscape | Attorney in a one-on-one client consultation |
| `attorney-portrait.webp` | Bio page `AttorneyEditorial` | 3:4 portrait | Full-body library portrait, no cigar |
| `working-the-file.webp` | `/practice-areas` hero aside | 5:4 landscape | Close-up hands + pen + law book |

## Optimization (when you commit a new file)

```bash
# requires `sharp` (installed once at /tmp during the optimization pass)
cd /tmp
node -e "
const sharp = require('sharp');
const src = '/path/to/source.png';
const dst = '/home/user/mmg-law-firm/public/brand/NAME.webp';
sharp(src)
  .rotate()
  .resize({ width: 1200, withoutEnlargement: true })
  .webp({ quality: 80, effort: 6, smartSubsample: true })
  .toFile(dst);
"
```

Then `git add public/brand/NAME.webp && git commit && git push`.
