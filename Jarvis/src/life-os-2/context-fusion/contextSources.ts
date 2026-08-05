/**
 * Adapters over existing Life OS / AIE / storage — never invent data.
 */

import { hasAnyConfiguredProvider, loadHybridAiConfig } from '../../ai-providers/providerConfig'
import { getMusicSession } from '../../music/musicSession'
import { loadReminders, loadSettings, loadShopping } from '../../storage'
import { dnaContextSnippet } from '../../life-os/dna/dnaService'
import { loadGoals } from '../../life-os/goals/goalRepository'
import { computeGoalProgress } from '../../life-os/goals/goalService'
import { loadProjects, computeProjectHealth } from '../../life-os/projects/projectService'
import { loadFamilySpace } from '../../life-os/family/familyService'
import { ensureDefaultRoutines } from '../../life-os/routines/routineService'
import { lastIntent } from '../../core-brain/brainState'
import type { SourceConfidence } from '../types'
import type { TimeOfDay } from '../types'

export function timeOfDay(d = new Date()): TimeOfDay {
  const h = d.getHours()
  if (h < 6) return 'night'
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  if (h < 21) return 'evening'
  return 'night'
}

export function timezoneNow(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local'
  } catch {
    return 'local'
  }
}

export function onlineNow(): boolean {
  try {
    return typeof navigator === 'undefined' ? true : navigator.onLine !== false
  } catch {
    return true
  }
}

function stalledDays(updatedAt?: string): number {
  if (!updatedAt) return 0
  const t = Date.parse(updatedAt)
  if (!Number.isFinite(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000))
}

export function readReminders(): { items: string[]; conf: SourceConfidence } {
  try {
    const items = loadReminders()
      .filter((r) => !r.done)
      .slice(0, 12)
      .map((r) => r.text)
    return {
      items,
      conf: {
        source: 'reminders',
        confidence: 0.95,
        stale: false,
        updatedAt: new Date().toISOString(),
      },
    }
  } catch {
    return {
      items: [],
      conf: { source: 'reminders', confidence: 0, stale: true, updatedAt: null },
    }
  }
}

export function readTodos(): { items: string[]; conf: SourceConfidence } {
  try {
    // Shopping list doubles as lightweight todos in legacy storage
    const items = loadShopping()
      .filter((s) => !s.done)
      .slice(0, 8)
      .map((s) => s.name)
    return {
      items,
      conf: { source: 'shopping_todos', confidence: 0.7, stale: false, updatedAt: new Date().toISOString() },
    }
  } catch {
    return {
      items: [],
      conf: { source: 'shopping_todos', confidence: 0, stale: true, updatedAt: null },
    }
  }
}

export function readGoals() {
  try {
    const goals = loadGoals()
      .slice(0, 12)
      .map((g) => ({
        title: g.title,
        progress: computeGoalProgress(g),
        status: g.status,
      }))
    return {
      goals,
      conf: {
        source: 'goals',
        confidence: goals.length ? 0.9 : 0.5,
        stale: false,
        updatedAt: new Date().toISOString(),
      } as SourceConfidence,
    }
  } catch {
    return {
      goals: [] as Array<{ title: string; progress: number; status: string }>,
      conf: { source: 'goals', confidence: 0, stale: true, updatedAt: null } as SourceConfidence,
    }
  }
}

export function readProjects() {
  try {
    const projects = loadProjects()
      .slice(0, 12)
      .map((p) => {
        const h = computeProjectHealth(p)
        return {
          name: p.name,
          progress: h.progress,
          stalledDays: stalledDays(h.lastUpdatedAt || p.updatedAt),
          status: p.status,
        }
      })
    return {
      projects,
      conf: {
        source: 'projects',
        confidence: projects.length ? 0.9 : 0.5,
        stale: false,
        updatedAt: new Date().toISOString(),
      } as SourceConfidence,
    }
  } catch {
    return {
      projects: [] as Array<{ name: string; progress: number; stalledDays: number; status: string }>,
      conf: { source: 'projects', confidence: 0, stale: true, updatedAt: null } as SourceConfidence,
    }
  }
}

export function readFamily() {
  try {
    const fam = loadFamilySpace()
    const familyEvents = [
      ...fam.members.slice(0, 8).map((m) => `${m.name} (${m.relation})`),
      ...fam.notices.slice(0, 4).map((n) => `공지: ${n.text}`),
    ]
    return {
      familyEvents,
      conf: {
        source: 'family_space',
        confidence: 0.85,
        stale: false,
        updatedAt: new Date().toISOString(),
      } as SourceConfidence,
    }
  } catch {
    return {
      familyEvents: [] as string[],
      conf: { source: 'family_space', confidence: 0, stale: true, updatedAt: null } as SourceConfidence,
    }
  }
}

export function readMusic() {
  try {
    const m = getMusicSession()
    return {
      music: { status: m.status, title: m.title },
      conf: {
        source: 'music_session',
        confidence: 0.9,
        stale: false,
        updatedAt: new Date().toISOString(),
      } as SourceConfidence,
    }
  } catch {
    return {
      music: { status: 'idle', title: null as string | null },
      conf: { source: 'music_session', confidence: 0, stale: true, updatedAt: null } as SourceConfidence,
    }
  }
}

export function readProvider() {
  try {
    const cfg = loadHybridAiConfig()
    return {
      provider: { anyConfigured: hasAnyConfiguredProvider(), mode: cfg.mode },
      conf: {
        source: 'ai_providers',
        confidence: 1,
        stale: false,
        updatedAt: new Date().toISOString(),
      } as SourceConfidence,
    }
  } catch {
    return {
      provider: { anyConfigured: false },
      conf: { source: 'ai_providers', confidence: 0, stale: true, updatedAt: null } as SourceConfidence,
    }
  }
}

export function readNavPending(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && Boolean(sessionStorage.getItem('aizio.navV2.chatCards.v1'))
  } catch {
    return false
  }
}

export function readDna(): string {
  try {
    return dnaContextSnippet(5) || ''
  } catch {
    return ''
  }
}

export function readRoutines(): string[] {
  try {
    return ensureDefaultRoutines()
      .filter((r) => r.enabled)
      .slice(0, 8)
      .map((r) => r.name)
  } catch {
    return []
  }
}

export function readCity(): string {
  try {
    return loadSettings().city || ''
  } catch {
    return ''
  }
}

export function readLastIntent(): string | null {
  try {
    return lastIntent() || null
  } catch {
    return null
  }
}
