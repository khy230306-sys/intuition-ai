/** Attach a timeout AbortSignal, merging with an optional parent signal. */
export function withTimeoutSignal(
  parent: AbortSignal | undefined,
  ms: number,
): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController()
  const timer = setTimeout(() => {
    try {
      ctrl.abort()
    } catch {
      /* ignore */
    }
  }, ms)
  const onParent = () => {
    try {
      ctrl.abort()
    } catch {
      /* ignore */
    }
  }
  if (parent) {
    if (parent.aborted) onParent()
    else parent.addEventListener('abort', onParent, { once: true })
  }
  return {
    signal: ctrl.signal,
    cancel: () => {
      clearTimeout(timer)
      if (parent) parent.removeEventListener('abort', onParent)
    },
  }
}

/** Default per-provider chat attempt budget (release speed gate). */
export const PROVIDER_ATTEMPT_TIMEOUT_MS = 8_000
