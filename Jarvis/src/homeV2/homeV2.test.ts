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
  renderTopNavActions,
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
    const focus = buildSmartCard({
      nextScheduleLines: ['10:00 미팅'],
      importantTodos: [],
      familyUnread: 0,
      friendsUnread: 0,
      activeFocusLabel: 'AIZIO 개발 · 약 20분',
    })
    expect(focus.kind).toBe('focus')
    expect(focus.chatHint).toMatch(/집중/)

    const empty = buildSmartCard({
      nextScheduleLines: [],
      importantTodos: [],
      familyUnread: 0,
      friendsUnread: 0,
    })
    expect(empty.title).toMatch(/여유로운 하루/)
    expect(empty.items[0]?.label).toMatch(/브리핑/)
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
        smartCard: {
          kind: 'empty',
          title: '여유로운 하루예요',
          items: [{ id: 'cta', label: '브리핑으로 하루를 시작해 보세요' }],
          targetView: 'life',
        },
        translate: { active: false, label: '번역 잠금 꺼짐' },
        voiceState: 'idle',
        prompt: '무엇을 도와드릴까요?',
      },
      { draft: '', busy: false, listening: false, appVersion: '1.15.4' },
    )
    expect(html).toContain('home-v2-brand-mark')
    expect(html).toContain('AIZIO')
    expect(html).toContain('data-quick-id="navigate"')
    expect(html).toContain('길안내')
    expect(html).toContain('home-v2-quick-primary')
    expect(html).not.toContain('data-quick-id="music"')
    expect(html).toContain('is-empty')
    expect(html).not.toContain('data-home-v2-chrome')
    expect(html).not.toContain('HOME v2 미리보기')
  })

  it('top 홈+메뉴; bottom nav empty; sheet matches View routes', () => {
    const top = renderTopNavActions({ unread: 0 })
    expect(top).toContain('data-action="home-v2-nav-home"')
    expect(top).toContain('data-action="home-v2-nav-more"')
    expect(top).toContain('홈')
    expect(top).toContain('메뉴')
    const nav = renderHomeV2NavWithPane('chat', 'home', false)
    expect(nav.trim()).toBe('')
    const more = renderHomeV2MoreSheet({ showInstall: true })
    expect(more).toContain('aria-label="메뉴"')
    expect(more).toContain('대화')
    expect(more).toContain('공간')
    expect(more).toContain('일상')
    expect(more).toContain('투자 · 여가')
    expect(more).toContain('설정')
    expect(more).toContain('화면 모드')
    expect(more).toContain('data-action="home-v2-nav-home"')
    expect(more).toContain('data-view="life"')
    expect(more).toContain('data-view="family"')
    expect(more).toContain('data-view="friends"')
    expect(more).toContain('data-view="navigation"')
    expect(more).toContain('data-view="customers"')
    expect(more).toContain('data-view="actions"')
    expect(more).toContain('data-view="invest"')
    expect(more).toContain('data-view="games"')
    expect(more).toContain('data-view="settings"')
    expect(more).toContain('data-view="global"')
    expect(more).toContain('data-action="install-show-guide"')
    expect(more).toContain('홈 화면 설치 방법')
    expect(more).toContain('길안내')
    expect(more).toContain('음악')
    expect(more).toContain('손님관리')
    expect(more).toContain('투자 · 주식엔진')
    expect(more).toContain('빠른 실행')
    expect(more).toContain('번역 · 언어')
    expect(more).toContain('브리핑')
    // No duplicate life entry / outdated labels
    expect(more).not.toContain('바로가기')
    expect(more).not.toContain('주요 기능')
    expect(more).not.toContain('실행(액션)')
    expect(more).not.toContain('API 키')
    expect((more.match(/data-view="life"/g) || []).length).toBe(1)
    expect(renderHomeV2MoreSheet({ showInstall: false })).not.toContain('data-action="install-show-guide"')
  })

  it('unified shell includes thread slot', () => {
    const html = renderHomeV2Shell(
      {
        header: { greeting: '안녕하세요', dateLine: '8월 5일', weatherLine: null },
        summary: { todoCount: 0, nextAlarmLabel: '다음 알림 없음', unreadMessages: 0 },
        smartCard: {
          kind: 'empty',
          title: '여유로운 하루예요',
          items: [{ id: 'cta', label: '브리핑으로 하루를 시작해 보세요' }],
          targetView: 'life',
        },
        translate: { active: false, label: '번역 잠금 꺼짐' },
        voiceState: 'idle',
        prompt: '무엇을 도와드릴까요?',
      },
      {
        draft: '',
        busy: false,
        listening: false,
        appVersion: '1.16.0',
        threadHtml: '<div class="msg-row">hi</div>',
      },
    )
    expect(html).toContain('home-v2-unified')
    expect(html).toContain('home-v2-thread')
    expect(html).toContain('msg-row')
    expect(html).toContain('data-top-nav-actions')
    expect(html).toContain('data-action="home-v2-nav-home"')
    expect(html).toContain('data-action="home-v2-nav-more"')
  })

  it('navigation sheet and design lab', () => {
    expect(renderNavigationSheet()).toContain('data-nav-sheet')
    expect(renderNavigationSheet()).toContain('AIZIO 내부 길안내')
    expect(renderNavigationSheet()).toContain('선택한 외부 지도로 열기')
    expect(renderNavigationSheet()).toContain('data-nav-map="tmap"')
    expect(renderNavigationSheet()).toContain('카카오맵')
    expect(renderDesignLabSection({ active: 'v2', bootDefault: 'v2', visible: true })).toContain(
      'HOME v2',
    )
  })
})
