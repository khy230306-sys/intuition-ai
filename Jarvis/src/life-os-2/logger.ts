/** Structured logs — never dump full Context payloads. */

export type Los2LogLevel = 'debug' | 'info' | 'warn' | 'error'

export function los2Log(
  level: Los2LogLevel,
  event: string,
  meta?: Record<string, string | number | boolean | null | undefined>,
): void {
  try {
    const line = `[life-os-2] ${event}`
    const safe = meta ? { ...meta } : undefined
    if (level === 'error') console.error(line, safe)
    else if (level === 'warn') console.warn(line, safe)
    else if (typeof console.debug === 'function') console.debug(line, safe)
  } catch {
    /* ignore */
  }
}
