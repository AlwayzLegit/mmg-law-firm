import { FIRM } from "@/lib/constants";

/**
 * City pages in alphabetical order, with the office's own city first.
 *
 * A statewide practice hub links to every city page for that practice (66 of
 * them), so the Glendale page got the same weight as the smallest town while
 * Google ranked the statewide hub for "glendale … lawyer" searches. Leading
 * with the office city gives the page we want for those searches the hub's
 * first and most prominent link.
 */
export function officeCityFirst<T extends { city_name: string }>(pages: T[]): T[] {
  const office = FIRM.address.city;
  return [...pages].sort(
    (a, b) =>
      Number(b.city_name === office) - Number(a.city_name === office) ||
      a.city_name.localeCompare(b.city_name),
  );
}
