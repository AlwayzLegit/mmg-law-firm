/**
 * Race a promise against a time limit (OPS-347). A database that does not
 * answer must turn into a failure in seconds, not hang until the visitor's
 * form gives up. Resolves to the promise's value, or to `null` when the limit
 * passes first; the timer is always cleared. A rejection of `work` is
 * returned as a rejection, so the caller keeps its own error handling.
 *
 * The work is not cancelled: it may still finish later. Callers must treat a
 * `null` as "unknown outcome" and never act as if the work did not happen.
 */
export async function withDeadline<T>(
  work: PromiseLike<T>,
  ms: number,
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([Promise.resolve(work), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
