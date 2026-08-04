import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearHomeV2Prefs,
  isDesignLabVisible,
  parseHomeQuery,
  resolveHomeVariant,
  writeBootDefaultHome,
  writeStoredHomeVariant,
  readBootDefaultHome,
} from './prefs'
import { buildSmartCard } from './smartCard'
import { HOME_V2_QUICK_COMMANDS, buildHomeV2Header, resolveVoiceUiState } from './model'
import { renderDesignLabSection, renderHomeV2Shell, renderHomeV2NavWithPane, renderHomeV2MoreSheet } from './render'

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

describe('HOME v2 prefs', () => {
  beforeEach(() => store.clear())

  it('defaults to legacy on production host', () => {
    writeStoredHomeVariant('v2')
    expect(
      resolveHomeVariant({
        hostname: 'jarvis-app.shipstatic.com',
        channel: 'preview',
        stored: 'v2',
        bootDefault: 'v2',
      }),
    ).toBe('legacy')
  })

  it('honors query over storage', () => {
    expect(
      resolveHomeVariant({
        queryHome: 'v2',
        hostname: 'jarvis-app.shipstatic.com',
        channel: 'production',
      }),
    ).toBe('v2')
    expect(
      resolveHomeVariant({
        queryHome: 'legacy',
        hostname: 'x.shipstatic.com',
        channel: 'preview',
        stored: 'v2',
      }),
    ).toBe('legacy')
  })

  it('uses stored preference only on preview-like hosts', () => {
    expect(
      resolveHomeVariant({
        hostname: 'keen-drifter-97nqfnk.shipstatic.com',
        channel: 'preview',
        stored: 'v2',
      }),
    ).toBe('v2')
    expect(
      resolveHomeVariant({
        hostname: 'example.com',
        channel: 'production',
        stored: 'v2',
      }),
    ).toBe('legacy')
  })

  it('boot default is legacy until set', () => {
    expect(readBootDefaultHome()).toBe('legacy')
    writeBootDefaultHome('v2')
    expect(readBootDefaultHome()).toBe('v2')
    clearHomeV2Prefs()
    expect(readBootDefaultHome()).toBe('legacy')
  })

  it('parseHomeQuery', () => {
    expect(parseHomeQuery('v2')).toBe('v2')
    expect(parseHomeQuery('legacy')).toBe('legacy')
    expect(parseHomeQuery('')).toBe(null)
  })

  it('hides design lab on production host', () => {
    expect(isDesignLabVisible('preview', 'jarvis-app.shipstatic.com')).toBe(false)
    expect(isDesignLabVisible('preview', 'foo.shipstatic.com')).toBe(true)
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
    expect(msg.items[0]?.label).toMatch(/우리/)
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
    expect(resolveVoiceUiState({ listening: false, busy: false, error: true })).toBe('error')
    expect(resolveVoiceUiState({ listening: false, busy: false })).toBe('idle')
  })

  it('quick commands connect to existing phrases', () => {
    expect(HOME_V2_QUICK_COMMANDS.briefing).toBe('브리핑')
    expect(HOME_V2_QUICK_COMMANDS.schedule).toMatch(/일정/)
    expect(HOME_V2_QUICK_COMMANDS.weather).toMatch(/날씨/)
    expect(HOME_V2_QUICK_COMMANDS.music).toMatch(/음악/)
  })

  it('hides weather when missing and avoids double 님', () => {
    const h = buildHomeV2Header('성규', null)
    expect(h.greeting).toBe('안녕하세요, 성규님')
    expect(h.weatherLine).toBeNull()
    expect(buildHomeV2Header('주인님', null).greeting).toBe('안녕하세요, 주인님')
    const anon = buildHomeV2Header('', null)
    expect(anon.greeting).toBe('안녕하세요')
  })
})

describe('HOME v2 render', () => {
  it('renders shell without secrets and with safe-area classes', () => {
    const html = renderHomeV2Shell(
      {
        header: { greeting: '안녕하세요', dateLine: '8월 5일', weatherLine: null },
        summary: { todoCount: 0, nextAlarmLabel: '다음 알림 없음', unreadMessages: 0 },
        smartCard: { kind: 'empty', title: '오늘은 예정된 일정이 없습니다', items: [], targetView: 'life' },
        translate: { active: false, label: '번역 잠금 꺼짐' },
        voiceState: 'idle',
        prompt: '무엇을 도와드릴까요?',
      },
      { draft: '', busy: false, listening: false, appVersion: '1.15.3' },
    )
    expect(html).toContain('data-home-v2="1"')
    expect(html).toContain('data-action="mic"')
    expect(html).toContain('id="composer"')
    expect(html).toContain('id="draft"')
    expect(html).toContain('data-quick-id="briefing"')
    expect(html.toLowerCase()).not.toContain('sk-')
    expect(html.toLowerCase()).not.toContain('vapid_private')
    expect(html).not.toContain('말로 쓰는 일상 비서')
  })

  it('nav has five korean items and more sheet links existing views', () => {
    const nav = renderHomeV2NavWithPane('chat', 'home', false)
    expect(nav).toContain('홈')
    expect(nav).toContain('대화')
    expect(nav).toContain('생활')
    expect(nav).toContain('가족')
    expect(nav).toContain('전체')
    expect(nav).not.toContain('>INV<')
    const more = renderHomeV2MoreSheet()
    expect(more).toContain('data-view="invest"')
    expect(more).toContain('data-view="friends"')
    expect(more).toContain('data-view="games"')
    expect(more).toContain('data-action="home-v2-guide"')
  })

  it('design lab hidden when not visible', () => {
    expect(renderDesignLabSection({ active: 'legacy', bootDefault: 'legacy', visible: false })).toBe('')
    expect(renderDesignLabSection({ active: 'v2', bootDefault: 'legacy', visible: true })).toContain(
      '디자인 테스트',
    )
  })
})
