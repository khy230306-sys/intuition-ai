/**
 * Minimal HOME connection — at most 2 Life OS 2.0 signals.
 * Does not redesign home; feeds smart-card priority / optional strip.
 */

import { getActiveFocus } from '../focus/focusSession'
import { fuseContext } from '../context-fusion/contextFusionEngine'
import { isLifeOs2Enabled } from '../featureFlags'
import { loadLifeOs2Flags } from '../featureFlags'
import { nextActions } from '../../life-os/goals/goalService'

export type HomeLos2Signal = {
  id: string
  kind: 'focus' | 'schedule' | 'next_action' | 'recommendation'
  title: string
  subtitle: string
  hintCommand?: string
}

export function buildHomeLos2Signals(): HomeLos2Signal[] {
  if (!isLifeOs2Enabled('contextFusionEnabled') && !isLifeOs2Enabled('focusEnabled')) {
    return []
  }
  const out: HomeLos2Signal[] = []
  const focus = isLifeOs2Enabled('focusEnabled') ? getActiveFocus() : null
  if (focus) {
    const end = Date.parse(focus.plannedEndAt)
    const left = Number.isFinite(end) ? Math.max(0, Math.round((end - Date.now()) / 60_000)) : 0
    out.push({
      id: 'focus',
      kind: 'focus',
      title: '현재 Focus',
      subtitle: `${focus.title} · 약 ${left}분`,
      hintCommand: '집중 상태 보여줘',
    })
  }

  try {
    const ctx = fuseContext({ force: false })
    if (ctx?.today.events[0] || ctx?.today.reminders[0]) {
      const line = ctx.today.events[0] || ctx.today.reminders[0]
      out.push({
        id: 'sched',
        kind: 'schedule',
        title: '가까운 일정',
        subtitle: line,
        hintCommand: '오늘 뭐 해야 해?',
      })
    } else if (!focus) {
      const next = nextActions(1)[0]
      if (next) {
        out.push({
          id: 'next',
          kind: 'next_action',
          title: '다음 행동',
          subtitle: next,
          hintCommand: '다음 한 가지 할 일은 뭐야?',
        })
      }
    }
  } catch {
    /* ignore */
  }

  // Proactive recommendation on home only if explicitly ON
  const flags = loadLifeOs2Flags()
  if (flags.proactiveSuggestionsEnabled && out.length < 2) {
    // still don't invent — skip if nothing real
  }

  return out.slice(0, 2)
}

export function renderHomeLos2StripHtml(signals: HomeLos2Signal[]): string {
  if (!signals.length) return ''
  const esc = (s: string) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  return `<div class="home-v2-los2-strip" data-los2-home-strip="1" aria-label="오늘의 핵심">
    ${signals
      .map(
        (s) => `<button type="button" class="home-v2-los2-chip" data-los2-home-hint="${esc(
          s.hintCommand || '',
        )}" aria-label="${esc(s.title)}: ${esc(s.subtitle)}">
      <span class="home-v2-los2-chip-title">${esc(s.title)}</span>
      <span class="home-v2-los2-chip-sub">${esc(s.subtitle)}</span>
    </button>`,
      )
      .join('')}
  </div>`
}
