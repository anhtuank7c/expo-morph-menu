/**
 * Retry timing for the API client.
 *
 * Exponential backoff with "full jitter": the delay before attempt n is a
 * random value between 0 and min(cap, base * 2^n). Random spreading keeps
 * many clients from retrying at the same moment after an outage.
 * See https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */

export type BackoffOptions = {
  /** Delay unit, in ms. */
  baseMs: number;
  /** Upper bound for a single delay, in ms. */
  capMs: number;
};

export const DEFAULT_BACKOFF: BackoffOptions = { baseMs: 300, capMs: 5000 };

/** Delay before retry number `attempt` (0 for the first retry). */
export function backoffDelay(
  attempt: number,
  { baseMs, capMs }: BackoffOptions = DEFAULT_BACKOFF,
  random = Math.random,
) {
  const ceiling = Math.min(capMs, baseMs * 2 ** attempt);
  return Math.round(random() * ceiling);
}

/**
 * Parses a `Retry-After` header: either delay-seconds or an HTTP date.
 * Returns ms, or null when the header is missing or invalid.
 */
export function parseRetryAfter(value: string | null | undefined, now = Date.now()): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

/** Waits `ms`, or rejects early when the request is aborted. */
export function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener?.('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('Aborted'));
    };
    signal?.addEventListener?.('abort', onAbort);
  });
}
