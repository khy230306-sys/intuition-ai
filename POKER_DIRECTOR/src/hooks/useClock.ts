import { useEffect, useState } from 'react'

/** Re-render on an interval so absolute-time timers update the UI. */
export function useClock(enabled = true, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => {
      setNow(Date.now())
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [enabled, intervalMs])

  return now
}
