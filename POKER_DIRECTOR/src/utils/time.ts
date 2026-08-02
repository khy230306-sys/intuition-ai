export function nowIso(): string {
  return new Date().toISOString()
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function splitDuration(ms: number): { hours: number; minutes: number; seconds: number } {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

/**
 * Parse user time input into milliseconds.
 * Accepts: "12", "12:30", "1:05:00", "12분", "12분30초", "90초"
 */
export function parseDurationInput(raw: string): number | null {
  const text = raw.trim().replace(/\s+/g, '')
  if (!text) return null

  const korean = text.match(/^(?:(\d+)시간)?(?:(\d+)분)?(?:(\d+)초)?$/)
  if (korean && (korean[1] || korean[2] || korean[3])) {
    const h = Number(korean[1] ?? 0)
    const m = Number(korean[2] ?? 0)
    const s = Number(korean[3] ?? 0)
    if ([h, m, s].some((n) => Number.isNaN(n) || n < 0)) return null
    return ((h * 3600 + m * 60 + s) * 1000) | 0
  }

  if (/^\d+$/.test(text)) {
    const minutes = Number(text)
    if (Number.isNaN(minutes) || minutes < 0) return null
    return minutes * 60 * 1000
  }

  const parts = text.split(':').map((p) => Number(p))
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return null
  if (parts.length === 2) {
    const [m, s] = parts
    if ((s ?? 0) >= 60) return null
    return ((m ?? 0) * 60 + (s ?? 0)) * 1000
  }
  if (parts.length === 3) {
    const [h, m, s] = parts
    if ((m ?? 0) >= 60 || (s ?? 0) >= 60) return null
    return ((h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0)) * 1000
  }
  return null
}

export function durationPartsToMs(minutes: number, seconds: number): number | null {
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null
  if (minutes < 0 || seconds < 0 || seconds >= 60) return null
  return Math.round(minutes * 60 + seconds) * 1000
}

export function formatMoney(amount: number, currency = 'KRW'): string {
  if (currency === 'KRW') {
    return `${amount.toLocaleString('ko-KR')}원`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR')
}

export function todayDateString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
