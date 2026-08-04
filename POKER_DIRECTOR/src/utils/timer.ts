import type { BlindLevel, TimerState } from '@/types'

export interface LiveTimerView {
  remainingMs: number
  currentLevel: BlindLevel | null
  nextLevel: BlindLevel | null
  isBreak: boolean
  status: TimerState['status']
  levelNumber: number
}

export function getRemainingMs(timer: TimerState, now = Date.now()): number {
  if (timer.status === 'paused' || timer.status === 'idle' || timer.status === 'stopped') {
    return Math.max(0, timer.pausedRemainingMs ?? 0)
  }
  if (!timer.levelEndsAt) return 0
  return Math.max(0, new Date(timer.levelEndsAt).getTime() - now)
}

export function buildLiveTimerView(
  timer: TimerState,
  levels: BlindLevel[],
  now = Date.now(),
): LiveTimerView {
  const currentLevel = levels[timer.currentLevelIndex] ?? null
  const nextLevel = levels[timer.currentLevelIndex + 1] ?? null
  return {
    remainingMs: getRemainingMs(timer, now),
    currentLevel,
    nextLevel,
    isBreak: Boolean(currentLevel?.isBreak),
    status: timer.status,
    levelNumber: currentLevel?.levelNumber ?? timer.currentLevelIndex + 1,
  }
}

export function startTimerState(
  timer: TimerState,
  levels: BlindLevel[],
  now = Date.now(),
): TimerState {
  const level = levels[timer.currentLevelIndex]
  if (!level) return timer
  const durationMs =
    (level.isBreak ? (level.breakMinutes ?? level.durationMinutes) : level.durationMinutes) *
    60 *
    1000
  const remaining =
    timer.pausedRemainingMs != null && timer.pausedRemainingMs > 0
      ? timer.pausedRemainingMs
      : durationMs
  return {
    ...timer,
    status: 'running',
    levelStartedAt: new Date(now).toISOString(),
    levelEndsAt: new Date(now + remaining).toISOString(),
    pausedRemainingMs: null,
    updatedAt: new Date(now).toISOString(),
  }
}

export function pauseTimerState(timer: TimerState, now = Date.now()): TimerState {
  if (timer.status !== 'running') return timer
  return {
    ...timer,
    status: 'paused',
    pausedRemainingMs: getRemainingMs(timer, now),
    levelEndsAt: null,
    updatedAt: new Date(now).toISOString(),
  }
}

export function resumeTimerState(timer: TimerState, now = Date.now()): TimerState {
  if (timer.status !== 'paused') return timer
  const remaining = Math.max(0, timer.pausedRemainingMs ?? 0)
  return {
    ...timer,
    status: 'running',
    levelStartedAt: new Date(now).toISOString(),
    levelEndsAt: new Date(now + remaining).toISOString(),
    pausedRemainingMs: null,
    updatedAt: new Date(now).toISOString(),
  }
}

export function stopTimerState(timer: TimerState, levels: BlindLevel[], now = Date.now()): TimerState {
  const level = levels[timer.currentLevelIndex]
  const durationMs = level
    ? (level.isBreak ? (level.breakMinutes ?? level.durationMinutes) : level.durationMinutes) *
      60 *
      1000
    : 0
  return {
    ...timer,
    status: 'stopped',
    levelStartedAt: null,
    levelEndsAt: null,
    pausedRemainingMs: durationMs,
    updatedAt: new Date(now).toISOString(),
  }
}

export function goToLevel(
  timer: TimerState,
  levels: BlindLevel[],
  index: number,
  keepRunning: boolean,
  now = Date.now(),
): TimerState {
  const safeIndex = Math.max(0, Math.min(levels.length - 1, index))
  const level = levels[safeIndex]
  if (!level) return timer
  const durationMs =
    (level.isBreak ? (level.breakMinutes ?? level.durationMinutes) : level.durationMinutes) *
    60 *
    1000
  const running = keepRunning && timer.status === 'running'
  return {
    ...timer,
    currentLevelIndex: safeIndex,
    status: running ? 'running' : timer.status === 'idle' ? 'idle' : 'paused',
    levelStartedAt: running ? new Date(now).toISOString() : null,
    levelEndsAt: running ? new Date(now + durationMs).toISOString() : null,
    pausedRemainingMs: running ? null : durationMs,
    updatedAt: new Date(now).toISOString(),
  }
}

export function setRemainingMs(
  timer: TimerState,
  remainingMs: number,
  now = Date.now(),
): TimerState {
  const safe = Math.max(0, remainingMs)
  if (timer.status === 'running') {
    return {
      ...timer,
      levelEndsAt: new Date(now + safe).toISOString(),
      pausedRemainingMs: null,
      updatedAt: new Date(now).toISOString(),
    }
  }
  return {
    ...timer,
    pausedRemainingMs: safe,
    updatedAt: new Date(now).toISOString(),
  }
}

export function advanceLevelIfExpired(
  timer: TimerState,
  levels: BlindLevel[],
  now = Date.now(),
): { timer: TimerState; advanced: boolean } {
  if (timer.status !== 'running') return { timer, advanced: false }
  const remaining = getRemainingMs(timer, now)
  if (remaining > 0) return { timer, advanced: false }
  if (timer.currentLevelIndex >= levels.length - 1) {
    return { timer: stopTimerState(timer, levels, now), advanced: false }
  }
  return {
    timer: goToLevel(timer, levels, timer.currentLevelIndex + 1, true, now),
    advanced: true,
  }
}

export type AlertKind =
  | 'five_min'
  | 'one_min'
  | 'ten_sec'
  | 'level_end'
  | 'break_start'
  | 'break_end'
  | 'reg_close'
  | 'rebuy_end'

export function detectAlerts(
  previousMs: number,
  currentMs: number,
  level: BlindLevel | null,
  advanced: boolean,
  previousLevel: BlindLevel | null,
): AlertKind[] {
  const alerts: AlertKind[] = []
  if (advanced) {
    alerts.push('level_end')
    if (previousLevel?.isBreak) alerts.push('break_end')
    if (level?.isBreak) alerts.push('break_start')
    if (level?.isRegistrationClose) alerts.push('reg_close')
    if (level?.isRebuyEnd) alerts.push('rebuy_end')
    return alerts
  }
  const thresholds: Array<[number, AlertKind]> = [
    [5 * 60 * 1000, 'five_min'],
    [60 * 1000, 'one_min'],
    [10 * 1000, 'ten_sec'],
  ]
  for (const [ms, kind] of thresholds) {
    if (previousMs > ms && currentMs <= ms) alerts.push(kind)
  }
  return alerts
}
