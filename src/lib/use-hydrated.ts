import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False in the server HTML and during hydration, true once React runs.
 *  Lead forms keep their submit button disabled until then: before
 *  hydration the browser would submit the form natively, which sends the
 *  fields nowhere useful (and, as a GET, would put them in the URL). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
