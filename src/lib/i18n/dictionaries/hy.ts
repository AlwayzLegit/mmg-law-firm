import type { DeepPartial } from "../index";
import type { Dictionary } from "./en";

/**
 * Armenian overrides. Empty for now — every missing key falls back to English
 * via getDictionary().
 *
 * TODO(human): translations require attorney review before publishing.
 * Legal-services advertising copy must stay CRPC §7.1 compliant in Armenian
 * (firm name + Glendale address, "Attorney Advertising", no guarantee
 * language). Do not machine-translate and ship.
 */
export const hy: DeepPartial<Dictionary> = {};
