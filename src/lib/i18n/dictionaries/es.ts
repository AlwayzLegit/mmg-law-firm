import type { DeepPartial } from "../index";
import type { Dictionary } from "./en";

/**
 * Spanish overrides. Empty for now — every missing key falls back to English
 * via getDictionary().
 *
 * TODO(human): translations require attorney review before publishing.
 * Legal-services advertising copy must stay CRPC §7.1 compliant in Spanish
 * (firm name + Glendale address, "Attorney Advertising" / "Publicidad de
 * Abogados", no guarantee language). Do not machine-translate and ship.
 */
export const es: DeepPartial<Dictionary> = {};
