import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FEATURE_CATALOG, searchFeatures, catalogTargetViews } from './featureCatalog'
import { PRIMARY_TABS, primaryTabForView, normalizeNavView } from './primaryTabs'
import { renderPrimaryBottomNav } from './renderBottomNav'
import { renderMoreHub } from './renderMoreHub'
import { renderScheduleHub } from './renderScheduleHub'
import { renderChatShell } from './renderChatShell'
import { recordRecentFeature, listRecentFeatures, clearRecentFeatures } from './recentFeatures'
import {
  listVisibleQuickActions,
  listAddableQuickActions,
  toggleQuickHidden,
  getQuickPrefs,
  showQuickAction,
  hideQuickAction,
  resetQuickActions,
  QUICK_ACTION_CATALOG,
} from './quickActions'
import { renderHomeDashboard } from './renderHomeDashboard'
import { runMenuAudit, exportMenuStructureJson } from './menuAudit'
import { hashScreenToView, viewToHashScreen, parseLocationHash, APP_HASH_SCREENS } from '../appRouting/hashRoute'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})

describe('primary tabs', () => {
  it('has exactly 5 tabs', () => {
    expect(PRIMARY_TABS).toHaveLength(5)
    expect(PRIMARY_TABS.map((t) => t.id)).toEqual(['home', 'chat', 'schedule', 'family', 'more'])
  })

  it('highlights tab for related views', () => {
    expect(primaryTabForView('home')).toBe('home')
    expect(primaryTabForView('chat')).toBe('chat')
    expect(primaryTabForView('life')).toBe('schedule')
    expect(primaryTabForView('schedule')).toBe('schedule')
    expect(primaryTabForView('family-helper')).toBe('family')
    expect(primaryTabForView('settings')).toBe('more')
    expect(primaryTabForView('ai-camera')).toBe('more')
  })

  it('renders bottom nav with labels', () => {
    const html = renderPrimaryBottomNav('chat')
    expect(html).toContain('data-primary-nav')
    expect(html).toContain('홈')
    expect(html).toContain('대화')
    expect(html).toContain('일정')
    expect(html).toContain('가족')
    expect(html).toContain('더보기')
    expect(html).toMatch(/aria-current="page"/)
  })
})

describe('more search + catalog', () => {
  it('searches by keyword', () => {
    expect(searchFeatures('카메라').some((f) => f.id === 'ai-camera')).toBe(true)
    expect(searchFeatures('백업').some((f) => f.id === 'backup' || f.id === 'settings')).toBe(true)
    expect(searchFeatures('진단').length).toBeGreaterThan(0)
  })

  it('more hub renders search field', () => {
    const html = renderMoreHub({ query: '번역', appVersion: '1.23.0' })
    expect(html).toContain('nav-more-q')
    expect(html).toContain('번역')
  })

  it('every catalog view is a known target', () => {
    const views = catalogTargetViews()
    expect(views.length).toBeGreaterThan(8)
    expect(views).toContain('settings')
    expect(views).toContain('ai-camera')
  })
})

describe('quick + recent', () => {
  beforeEach(() => store.clear())

  it('limits quick actions to 6', () => {
    expect(listVisibleQuickActions().length).toBeLessThanOrEqual(6)
  })

  it('can hide a quick action', () => {
    toggleQuickHidden('translate')
    expect(getQuickPrefs().hidden).toContain('translate')
    expect(listVisibleQuickActions().every((q) => q.id !== 'translate')).toBe(true)
  })

  it('can add a removed quick action back', () => {
    hideQuickAction('ai-camera')
    expect(listAddableQuickActions().some((q) => q.id === 'ai-camera')).toBe(true)
    const r = showQuickAction('ai-camera')
    expect(r.ok).toBe(true)
    expect(listVisibleQuickActions().some((q) => q.id === 'ai-camera')).toBe(true)
    expect(listAddableQuickActions().every((q) => q.id !== 'ai-camera')).toBe(true)
  })

  it('can add catalog items beyond the default six', () => {
    hideQuickAction('todo-add')
    const r = showQuickAction('navigate')
    expect(r.ok).toBe(true)
    expect(listVisibleQuickActions().some((q) => q.id === 'navigate')).toBe(true)
    expect(QUICK_ACTION_CATALOG.length).toBeGreaterThan(6)
  })

  it('replaces the last slot when adding while full', () => {
    expect(listVisibleQuickActions()).toHaveLength(6)
    const blocked = showQuickAction('navigate')
    expect(blocked.ok).toBe(false)
    expect(blocked.reason).toBe('full')
    const r = showQuickAction('navigate', { replaceLastIfFull: true })
    expect(r.ok).toBe(true)
    expect(r.replacedId).toBe('todo-add')
    const ids = listVisibleQuickActions().map((q) => q.id)
    expect(ids).toContain('navigate')
    expect(ids).not.toContain('todo-add')
    expect(ids).toHaveLength(6)
  })

  it('reset restores default six quick actions', () => {
    hideQuickAction('schedule-add')
    showQuickAction('games')
    resetQuickActions()
    expect(listVisibleQuickActions().map((q) => q.id)).toEqual([
      'schedule-add',
      'reminder-add',
      'ai-camera',
      'translate',
      'family-schedule',
      'todo-add',
    ])
  })

  it('places briefing/weather above the home chat slot', () => {
    const html = renderHomeDashboard({
      model: {
        header: { greeting: '안녕하세요', dateLine: '8월 6일', weatherLine: '맑음 26°' },
        summary: { todoCount: 0, nextAlarmLabel: '다음 알림 없음', unreadMessages: 0 },
        smartCard: {
          kind: 'empty',
          title: '여유',
          items: [],
          targetView: 'chat',
        },
        translate: { active: false, label: '번역' },
        voiceState: 'idle',
        prompt: '무엇을',
      },
      briefingHtml: '<section class="life-brief-strip" data-life-brief="1">브리핑</section>',
      scheduleLines: [],
      alertLines: [],
      appVersion: '1.27.0',
    })
    const briefAt = html.indexOf('data-life-brief')
    const chatAt = html.indexOf('nav-home-chat-slot')
    const askAt = html.indexOf('home-ask-form')
    expect(briefAt).toBeGreaterThan(-1)
    expect(chatAt).toBeGreaterThan(briefAt)
    expect(askAt).toBeGreaterThan(chatAt)
  })

  it('edit panel lists addable catalog with add buttons', () => {
    hideQuickAction('ai-camera')
    const html = renderHomeDashboard({
      model: {
        header: { greeting: '안녕하세요', dateLine: '8월 6일', weatherLine: null },
        summary: { todoCount: 0, nextAlarmLabel: '다음 알림 없음', unreadMessages: 0 },
        smartCard: {
          kind: 'empty',
          title: '여유',
          items: [],
          targetView: 'chat',
        },
        translate: { active: false, label: '번역' },
        voiceState: 'idle',
        prompt: '무엇을',
      },
      scheduleLines: [],
      alertLines: [],
      appVersion: '1.23.0',
      quickEditOpen: true,
    })
    expect(html).toContain('data-quick-edit')
    expect(html).toContain('data-quick-add="ai-camera"')
    expect(html).toContain('data-quick-add="navigate"')
    expect(html).toContain('추가할 기능 고르기')
    expect(html).toContain('추가')
    expect(html).not.toMatch(/data-quick-add="[^"]+"\s+disabled/)
  })

  it('shows replace label when quick bar is full', () => {
    const html = renderHomeDashboard({
      model: {
        header: { greeting: '안녕하세요', dateLine: '8월 6일', weatherLine: null },
        summary: { todoCount: 0, nextAlarmLabel: '다음 알림 없음', unreadMessages: 0 },
        smartCard: {
          kind: 'empty',
          title: '여유',
          items: [],
          targetView: 'chat',
        },
        translate: { active: false, label: '번역' },
        voiceState: 'idle',
        prompt: '무엇을',
      },
      scheduleLines: [],
      alertLines: [],
      appVersion: '1.23.0',
      quickEditOpen: true,
    })
    expect(html).toContain('교체 추가')
    expect(html).toContain('가득 참')
    expect(html).not.toMatch(/data-quick-add="[^"]+"\s+disabled/)
  })

  it('records recent without settings/diag', () => {
    recordRecentFeature('ai-camera')
    recordRecentFeature('settings')
    recordRecentFeature('ai-camera')
    const list = listRecentFeatures()
    expect(list[0]?.id).toBe('ai-camera')
    expect(list.every((f) => f.id !== 'settings')).toBe(true)
    clearRecentFeatures()
    expect(listRecentFeatures()).toHaveLength(0)
  })
})

describe('schedule + chat shells', () => {
  it('schedule hub has four filters', () => {
    const html = renderScheduleHub({
      tab: 'today',
      lines: [{ id: '1', title: '병원', when: '내일 15:00', kind: '일정' }],
    })
    expect(html).toContain('data-sched-tab="today"')
    expect(html).toContain('data-sched-tab="family"')
    expect(html).toContain('병원')
  })

  it('chat composer exposes voice camera and plus', () => {
    const html = renderChatShell({
      threadHtml: '<p>hi</p>',
      draft: '',
      busy: false,
      listening: false,
      translateActive: false,
      translateLabel: '번역',
      appVersion: '1.23.0',
      plusOpen: true,
    })
    expect(html).toContain('data-action="mic"')
    expect(html).toContain('open-ai-camera')
    expect(html).toContain('chat-plus-toggle')
    expect(html).toContain('nav-chat-plus')
  })
})

describe('menu audit', () => {
  it('finds no unreachable views', () => {
    const r = runMenuAudit()
    expect(r.summary.unreachable).toBe(0)
    expect(r.primaryTabs).toBe(5)
    expect(r.menuCount).toBe(FEATURE_CATALOG.length)
  })

  it('exports json without secrets', () => {
    const raw = exportMenuStructureJson()
    expect(raw).not.toMatch(/sk-/)
    expect(raw).toContain('primaryTabs')
  })
})

describe('hash redirects for new screens', () => {
  it('includes schedule and more in hash screens', () => {
    expect(APP_HASH_SCREENS).toContain('schedule')
    expect(APP_HASH_SCREENS).toContain('more')
  })

  it('maps views to hash and back', () => {
    expect(viewToHashScreen('home')).toBe('home')
    expect(viewToHashScreen('schedule')).toBe('schedule')
    expect(viewToHashScreen('more')).toBe('more')
    expect(hashScreenToView('home')).toBe('home')
    expect(hashScreenToView('schedule')).toBe('schedule')
    expect(hashScreenToView('more')).toBe('more')
    expect(hashScreenToView('life')).toBe('schedule')
  })

  it('parses new hashes', () => {
    expect(parseLocationHash('#schedule').screen).toBe('schedule')
    expect(parseLocationHash('#more').screen).toBe('more')
  })

  it('normalizes life to schedule for nav', () => {
    expect(normalizeNavView('life')).toBe('schedule')
  })
})
