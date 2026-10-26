import { Noto_Serif_Armenian } from "next/font/google";

// Georgia (the v3 serif) has no Armenian glyphs; Noto Serif Armenian fills
// them per glyph so Latin digits and the firm name keep the house face.
// Preloaded, and only on /hy: discovered late, it swapped in after first
// paint and shifted the hero (CLS 0.23). /ru and /es never load it; their
// one Armenian word (the language switcher) uses the system font, as on
// the English site.
export const notoArmenian = Noto_Serif_Armenian({
  subsets: ["armenian"],
  weight: ["400", "700"],
  variable: "--font-noto-armenian",
  display: "swap",
  preload: true,
});
