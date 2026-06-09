// Phase-4 — Auto-recovery with exponential backoff.
// Used by sync layer to retry transient failures without losing local draft.

export interface RetryOptions {
  retries?: number;
  baseMs?: number;
  maxMs?: number;
  signal?: AbortSignal;
  onAttempt?: (attempt: number, error: unknown) => void;
}

export async function retryWithBackoff<T>(
  task: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const retries = opts.retries ?? 5;
  const base = opts.baseMs ?? 400;
  const max = opts.maxMs ?? 8000;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (opts.signal?.aborted) throw opts.signal.reason ?? new Error("aborted");
    try {
      return await task();
    } catch (err) {
      lastErr = err;
      opts.onAttempt?.(attempt, err);
      if (attempt === retries) break;
      const jitter = Math.random() * 0.3 + 0.85;
      const wait = Math.min(max, base * 2 ** attempt) * jitter;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

// Local-draft safety wrapper. Always preserves the local copy first,
// then attempts remote sync — if remote fails repeatedly, local survives.
export async function syncWithLocalFallback<T>(args: {
  saveLocal: () => void | Promise<void>;
  saveRemote: () => Promise<T>;
  onRemoteError?: (err: unknown) => void;
  retries?: number;
}): Promise<{ remote: T | null; degraded: boolean }> {
  await args.saveLocal();
  try {
    const remote = await retryWithBackoff(args.saveRemote, {
      retries: args.retries ?? 4,
      onAttempt: (_, err) => args.onRemoteError?.(err),
    });
    return { remote, degraded: false };
  } catch (err) {
    args.onRemoteError?.(err);
    return { remote: null, degraded: true };
  }
}
