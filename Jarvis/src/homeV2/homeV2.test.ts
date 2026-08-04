import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearHomeV2Prefs,
  isDesignLabVisible,
  parseHomeQuery,
  resolveHomeVariant,
  writeBootDefaultHome,
  readBootDefaultHome,
} from './prefs'
import { buildSmartCard } from './smartCard'
import { HOME_V2_QUICK_COMMANDS, buildHomeV2Header, resolveVoiceUiState } from './model'
import {
  renderDesignLabSection,
  renderHomeV2Shell,
  renderHomeV2NavWithPane,
  renderHomeV2MoreSheet,
  renderNavigationSheet,
} from './render'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v)
  },
  removeItem: (k: string) => {
    store.delete(k)
  },
  clear: () => store.clear(),
})

describe('HOME v2 prefs (v2 default)', () => {
  beforeEach(() => store.clear())

  it('defaults to v2 for new users on any host', () => {
    expect(
      resolveHomeVariant({
        hostname: 'jarvis-app.shipstatic.com',
        channel: 'production',
      }),
    ).toBe('v2')
    expect(
      resolveHomeVariant({
        hostname: 'example.com',
        channel: 'production',
      }),
    ).toBe('v2')
  })

  it('honors query over storage', () => {
    expect(
      resolveHomeVariant({
        queryHome: 'legacy',
        hostname: 'x.shipstatic.com',
        channel: 'preview',
        stored: 'v2',
      }),
    ).toBe('legacy')
    expect(
      resolveHomeVariant({
        queryHome: 'v2',
        stored: 'legacy',
      }),
    ).toBe('v2')
  })

  it('respects explicit stored legacy', () => {
    expect(
      resolveHomeVariant({
        hostname: 'keen-drifter-97nqfnk.shipstatic.com',
        channel: 'preview',
        stored: 'legacy',
      }),
    ).toBe('legacy')
  })

  it('boot default is v2 when unset', () => {
    expect(readBootDefaultHome()).toBe('v2')
    writeBootDefaultHome('legacy')
    expect(readBootDefaultHome()).toBe('legacy')
    clearHomeV2Prefs()
    expect(readBootDefaultHome()).toBe('v2')
  })

  it('parseHomeQuery', () => {
    expect(parseHomeQuery('v2')).toBe('v2')
    expect(parseHomeQuery('legacy')).toBe('legacy')
    expect(parseHomeQuery('')).toBe(null)
  })

  it('design lab always visible for recovery', () => {
    expect(isDesignLabVisible('preview', 'jarvis-app.shipstatic.com')).toBe(true)
    expect(isDesignLabVisible('production', 'localhost')).toBe(true)
  })
})

describe('smart card priority', () => {
  it('prefers schedule then todos then messages then empty', () => {
    expect(
      buildSmartCard({
        nextScheduleLines: ['15:00 회의'],
        importantTodos: ['병원'],
        familyUnread: 2,
        friendsUnread: 0,
      }).kind,
    ).toBe('schedule')
    expect(
      buildSmartCard({
        nextScheduleLines: [],
        importantTodos: ['엄마에게 전화', '병원'],
        familyUnread: 2,
        friendsUnread: 1,
      }).kind,
    ).toBe('todos')
    const msg = buildSmartCard({
      nextScheduleLines: [],
      importantTodos: [],
      familyUnread: 2,
      friendsUnread: 1,
      familyName: '우리',
    })
    expect(msg.kind).toBe('messages')
    expect(msg.items.length).toBeLessThanOrEqual(3)
    expect(
      buildSmartCard({
        nextScheduleLines: [],
        importantTodos: [],
        familyUnread: 0,
        friendsUnread: 0,
      }).title,
    ).toMatch(/예정된 일정이 없습니다/)
  })
})

describe('voice + quick commands', () => {
  it('maps voice states', () => {
    expect(resolveVoiceUiState({ listening: true, busy: false })).toBe('listening')
    expect(resolveVoiceUiState({ listening: false, busy: true })).toBe('busy')
    expect(resolveVoiceUiState({ listening: false, busy: false })).toBe('idle')
  })

  it('quick commands include navigation', () => {
    expect(HOME_V2_QUICK_COMMANDS.briefing).toBe('브리핑')
    expect(HOME_V2_QUICK_COMMANDS.navigate).toBe('__open_nav_sheet__')
    expect(HOME_V2_QUICK_COMMANDS.schedule).toMatch(/일정/)
    expect(HOME_V2_QUICK_COMMANDS.weather).toMatch(/날씨/)
  })

  it('hides weather when missing and avoids double 님', () => {
    expect(buildHomeV2Header('성규', null).greeting).toBe('안녕하세요, 성규님')
    expect(buildHomeV2Header('주인님', null).greeting).toBe('안녕하세요, 주인님')
    expect(buildHomeV2Header('', null).greeting).toBe('안녕하세요')
  })
})

describe('HOME v2 render', () => {
  it('renders shell with 길안내 quick action', () => {
    const html = renderHomeV2Shell(
      {
        header: { greeting: '안녕하세요', dateLine: '8월 5일', weatherLine: null },
        summary: { todoCount: 0, nextAlarmLabel: '다음 알림 없음', unreadMessages: 0 },
        smartCard: { kind: 'empty', title: '오늘은 예정된 일정이 없습니다', items: [], targetView: 'life' },
        translate: { active: false, label: '번역 잠금 꺼짐' },
        voiceState: 'idle',
        prompt: '무엇을 도와드릴까요?',
      },
      { draft: '', busy: false, listening: false, appVersion: '1.15.4' },
    )
    expect(html).toContain('data-quick-id="navigate"')
    expect(html).toContain('길안내')
    expect(html).not.toContain('data-quick-id="music"')
    expect(html).toContain('is-empty')
    expect(html).not.toContain('data-home-v2-chrome')
    expect(html).not.toContain('HOME v2 미리보기')
  })

  it('nav has five items; more sheet groups life/comms/tools', () => {
    const nav = renderHomeV2NavWithPane('chat', 'home', false)
    expect(nav).toContain('홈')
    expect(nav).toContain('전체')
    const more = renderHomeV2MoreSheet()
    expect(more).toContain('길안내')
    expect(more).toContain('음악')
    expect(more).toContain('손님관리')
    expect(more).toContain('data-view="customers"')
    expect(more).toContain('data-view="invest"')
    expect(more).toContain('디자인 전환')
  })

  it('navigation sheet and design lab', () => {
    expect(renderNavigationSheet()).toContain('data-nav-sheet')
    expect(renderNavigationSheet()).toContain('길찾기 시작')
    expect(renderDesignLabSection({ active: 'v2', bootDefault: 'v2', visible: true })).toContain(
      'HOME v2',
    )
  })
})
