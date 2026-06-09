// Phase-4 — Performance scheduler utilities.
// Pure, additive helpers. Do not import from Phase-1/2/3 stores.

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  wait: number,
): T & { cancel: () => void; flush: () => void } {
  let t: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: unknown[] | null = null;
  const wrapped = ((...args: unknown[]) => {
    lastArgs = args;
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      (fn as unknown as (...a: unknown[]) => void)(...(lastArgs ?? []));
    }, wait);
  }) as unknown as T & { cancel: () => void; flush: () => void };
  wrapped.cancel = () => {
    if (t) clearTimeout(t);
    t = null;
    lastArgs = null;
  };
  wrapped.flush = () => {
    if (t && lastArgs) {
      clearTimeout(t);
      t = null;
      (fn as unknown as (...a: unknown[]) => void)(...lastArgs);
    }
  };
  return wrapped;
}

export function throttle<T extends (...args: never[]) => void>(
  fn: T,
  wait: number,
): T {
  let last = 0;
  let pending: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: unknown[] | null = null;
  return ((...args: unknown[]) => {
    const now = Date.now();
    const remaining = wait - (now - last);
    lastArgs = args;
    if (remaining <= 0) {
      last = now;
      (fn as unknown as (...a: unknown[]) => void)(...args);
    } else if (!pending) {
      pending = setTimeout(() => {
        last = Date.now();
        pending = null;
        (fn as unknown as (...a: unknown[]) => void)(...(lastArgs ?? []));
      }, remaining);
    }
  }) as unknown as T;
}

// Split a large unit of work into idle-time chunks to avoid jank.
export function chunkedRun<T>(
  items: T[],
  worker: (item: T, index: number) => void,
  chunkSize = 32,
): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const ric: (cb: () => void) => void =
      typeof window !== "undefined" &&
      "requestIdleCallback" in window
        ? (cb) =>
            (window as unknown as {
              requestIdleCallback: (c: () => void) => void;
            }).requestIdleCallback(cb)
        : (cb) => setTimeout(cb, 0);
    function tick() {
      const end = Math.min(i + chunkSize, items.length);
      for (; i < end; i++) worker(items[i], i);
      if (i < items.length) ric(tick);
      else resolve();
    }
    tick();
  });
}
