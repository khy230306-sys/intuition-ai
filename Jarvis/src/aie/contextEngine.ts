/**
 * Context Engine — single AieContext snapshot.
 * Lazy + short TTL cache so AIE never slows cold start.
 */

import { listSkillMeta } from '../core-brain/skillRegistry'
import { getAppLocale } from '../i18n'
import { hasAnyConfiguredProvider, loadHybridAiConfig } from '../ai-providers/providerConfig'
import { getMusicSession } from '../music/musicSession'
import { loadReminders, loadSettings } from '../storage'
import { dnaContextSnippet } from '../life-os/dna/dnaService'
import { loadGoals } from '../life-os/goals/goalRepository'
import { computeGoalProgress } from '../life-os/goals/goalService'
import { loadProjects, computeProjectHealth } from '../life-os/projects/projectService'
import { loadFamilySpace } from '../life-os/family/familyService'
import { ensureDefaultRoutines } from '../life-os/routines/routineService'
import { readContextCache, writeContextCache } from './storage'
import type { AieContext } from './types'

const CACHE_TTL_MS = 30_000

let memoryCache: { at: number; ctx: AieContext } | null = null
let lastBuildAt = 0
const DEBOUNCE_MS = 400

function onlineNow(): boolean {
  try {
    return typeof navigator === 'undefined' ? true : navigator.onLine !== false
  } catch {
    return true
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function formatLocalParts(d = new Date()): { time: string; date: string; timezone: string } {
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  let timezone = 'local'
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local'
  } catch {
    /* ignore */
  }
  return { time, date, timezone }
}

function stalledDays(updatedAt: string | undefined): number {
  if (!updatedAt) return 0
  const t = Date.parse(updatedAt)
  if (!Number.isFinite(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000)))
}

function todayReminderLines(): string[] {
  try {
    return loadReminders()
      .filter((r) => !r.done)
      .slice(0, 8)
      .map((r) => r.text)
  } catch {
    return []
  }
}

function familyLines(): string[] {
  try {
    const fam = loadFamilySpace()
    const lines: string[] = []
    for (const m of fam.members.slice(0, 8)) {
      lines.push(`${m.name} (${m.relation})`)
    }
    for (const n of fam.notices.slice(0, 4)) {
      lines.push(`공지: ${n.text}`)
    }
    return lines
  } catch {
    return []
  }
}

function goalLines(): AieContext['goalProgress'] {
  try {
    return loadGoals()
      .filter((g) => g.status === 'active')
      .slice(0, 8)
      .map((g) => ({ title: g.title, progress: computeGoalProgress(g) }))
  } catch {
    return []
  }
}

function projectLines(): AieContext['projectProgress'] {
  try {
    return loadProjects()
      .filter((p) => p.status === 'active')
      .slice(0, 8)
      .map((p) => {
        const h = computeProjectHealth(p)
        return {
          name: p.name,
          progress: h.progress,
          stalledDays: stalledDays(h.lastUpdatedAt || p.updatedAt),
        }
      })
  } catch {
    return []
  }
}

function navPending(): boolean {
  try {
    if (typeof sessionStorage === 'undefined') return false
    return Boolean(sessionStorage.getItem('aizio.navV2.chatCards.v1'))
  } catch {
    return false
  }
}

function weatherHint(): string | null {
  try {
    const raw = sessionStorage.getItem('jarvis.weather.cache') || localStorage.getItem('jarvis.weather.cache')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { place?: string; summary?: string; line?: string }
    return parsed.line || parsed.summary || (parsed.place ? `${parsed.place} 날씨 캐시 있음` : null)
  } catch {
    return null
  }
}

function buildFresh(opts?: { activeView?: string; history?: { role: string; text: string }[] }): AieContext {
  const { time, date, timezone } = formatLocalParts()
  const settings = loadSettings()
  const music = getMusicSession()
  const cfg = loadHybridAiConfig()
  const history = opts?.history || []
  const lastUser = [...history].reverse().find((h) => h.role === 'user')

  let routinesDue: string[] = []
  try {
    routinesDue = ensureDefaultRoutines()
      .filter((r) => r.enabled)
      .slice(0, 6)
      .map((r) => r.name)
  } catch {
    routinesDue = []
  }

  let skills: string[] = []
  try {
    skills = listSkillMeta()
      .filter((s) => s.available)
      .map((s) => s.id)
  } catch {
    skills = []
  }

  return {
    time,
    date,
    timezone,
    location: {
      city: settings.city || '',
      permission: 'unknown',
    },
    network: { online: onlineNow() },
    currentScreen: opts?.activeView || null,
    activeConversation: {
      recentTurns: history.length,
      lastUserText: lastUser?.text || null,
    },
    todaySchedule: todayReminderLines(),
    familyEvents: familyLines(),
    goalProgress: goalLines(),
    projectProgress: projectLines(),
    weather: weatherHint(),
    navigationState: { hasPendingCandidates: navPending() },
    musicState: {
      status: music.status,
      title: music.title,
      provider: String(music.provider),
      query: music.query || '',
    },
    providerState: {
      anyConfigured: hasAnyConfiguredProvider(),
      mode: cfg.mode,
      fixedProvider: cfg.fixedProvider ?? null,
    },
    deviceState: {
      online: onlineNow(),
      locale: getAppLocale(),
      platform: typeof navigator !== 'undefined' ? navigator.platform : undefined,
    },
    dnaSnippet: (() => {
      try {
        return dnaContextSnippet(5)
      } catch {
        return ''
      }
    })(),
    availableSkills: skills,
    routinesDue,
    emergencyHints: [],
    generatedAt: Date.now(),
  }
}

/**
 * Build or return cached context. Safe to call often.
 */
export function buildAieContext(opts?: {
  activeView?: string
  history?: { role: string; text: string }[]
  force?: boolean
}): AieContext {
  const now = Date.now()
  if (!opts?.force && memoryCache && now - memoryCache.at < CACHE_TTL_MS) {
    return memoryCache.ctx
  }
  if (!opts?.force && now - lastBuildAt < DEBOUNCE_MS && memoryCache) {
    return memoryCache.ctx
  }

  if (!opts?.force) {
    const disk = readContextCache()
    if (disk && now - disk.at < CACHE_TTL_MS) {
      try {
        const ctx = JSON.parse(disk.json) as AieContext
        memoryCache = { at: disk.at, ctx }
        return ctx
      } catch {
        /* rebuild */
      }
    }
  }

  lastBuildAt = now
  const ctx = buildFresh(opts)
  memoryCache = { at: now, ctx }
  try {
    writeContextCache(JSON.stringify(ctx))
  } catch {
    /* ignore */
  }
  return ctx
}

/** Invalidate cache after mutations (optional hook). */
export function invalidateAieContext(): void {
  memoryCache = null
  lastBuildAt = 0
}

/** Compact string for providers / prompts — never invents missing fields. */
export function formatAieContextBlock(ctx?: AieContext): string {
  const c = ctx || buildAieContext()
  const lines = [
    '【AIE Context】',
    `시간 ${c.date} ${c.time} (${c.timezone})`,
    `네트워크 ${c.network.online ? '온라인' : '오프라인'}`,
    c.location.city ? `위치(도시) ${c.location.city}` : null,
    c.currentScreen ? `화면 ${c.currentScreen}` : null,
    c.todaySchedule.length ? `오늘 일정·할 일: ${c.todaySchedule.slice(0, 5).join(' · ')}` : '오늘 일정·할 일: (없음)',
    c.goalProgress.length
      ? `목표: ${c.goalProgress.map((g) => `${g.title} ${Math.round(g.progress * 100)}%`).join(', ')}`
      : null,
    c.projectProgress.length
      ? `프로젝트: ${c.projectProgress.map((p) => `${p.name} ${Math.round(p.progress * 100)}%`).join(', ')}`
      : null,
    c.familyEvents.length ? `가족: ${c.familyEvents.slice(0, 4).join(', ')}` : null,
    c.weather ? `날씨: ${c.weather}` : null,
    `음악: ${c.musicState.status}${c.musicState.title ? ` · ${c.musicState.title}` : ''}`,
    `AI Provider: ${c.providerState.anyConfigured ? '설정됨' : '없음'}`,
    c.dnaSnippet ? `DNA: ${c.dnaSnippet}` : null,
  ]
  return lines.filter(Boolean).join('\n')
}
