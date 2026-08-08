/**
 * HOME v2 view-model builders — reuse existing storage/summary APIs only.
 */

import { loadReminders, loadSettings } from '../storage'
import { loadAlarms } from '../notify'
import { loadCachedWeather, type WeatherSnap } from '../weather'
import { getHomeSpaceInbox } from '../spaceInbox'
import { interpretModeBadgeLabel, loadInterpretMode } from '../translateBrain'
import { buildSmartCard, type SmartCardModel } from './smartCard'
import { getActiveFocus } from '../life-os-2/focus/focusSession'
import { isLifeOs2Enabled } from '../life-os-2/featureFlags'

export type VoiceUiState = 'idle' | 'listening' | 'busy' | 'speaking' | 'error'

export type HomeV2SummaryStrip = {
  todoCount: number
  nextAlarmLabel: string
  unreadMessages: number
}

export type HomeV2Header = {
  greeting: string
  dateLine: string
  weatherLine: string | null
}

export type HomeV2TranslateBadge = {
  active: boolean
  label: string
}

export type HomeV2Model = {
  header: HomeV2Header
  summary: HomeV2SummaryStrip
  smartCard: SmartCardModel
  translate: HomeV2TranslateBadge
  voiceState: VoiceUiState
  prompt: string
}

function weekdayKo(d: Date): string {
  return ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][d.getDay()] || ''
}

function formatHeaderDate(now = new Date()): string {
  const ampm = now.getHours() < 12 ? '오전' : '오후'
  let h = now.getHours() % 12
  if (h === 0) h = 12
  const mm = now.getMinutes().toString().padStart(2, '0')
  return `${now.getMonth() + 1}월 ${now.getDate()}일 ${weekdayKo(now)} · ${ampm} ${h}:${mm}`
}

export function buildHomeV2Header(
  displayName: string,
  weather?: WeatherSnap | null,
  now = new Date(),
): HomeV2Header {
  const name = String(displayName || '').trim()
  const greetName = !name ? '' : /님\s*$/.test(name) ? name : `${name}님`
  const greeting = greetName ? `안녕하세요, ${greetName}` : '안녕하세요'
  const w = weather === undefined ? loadCachedWeather() : weather
  let weatherLine: string | null = null
  if (w && Number.isFinite(w.tempC)) {
    weatherLine = `${w.label} ${Math.round(w.tempC)}°`
  }
  return {
    greeting,
    dateLine: formatHeaderDate(now),
    weatherLine,
  }
}

export function buildHomeV2Summary(): HomeV2SummaryStrip {
  const todos = loadReminders().filter((r) => !r.done)
  const now = Date.now()
  const alarms = loadAlarms()
    .filter((a) => !a.fired && a.whenAt > now)
    .sort((a, b) => a.whenAt - b.whenAt)
  const nextRem = loadReminders()
    .filter((r) => !r.done && r.whenAt && r.whenAt > now)
    .sort((a, b) => (a.whenAt || 0) - (b.whenAt || 0))[0]
  let nextAlarmLabel = '다음 알림 없음'
  if (alarms[0]) {
    const d = new Date(alarms[0].whenAt)
    nextAlarmLabel = `다음 알림 ${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
  } else if (nextRem?.whenAt) {
    const d = new Date(nextRem.whenAt)
    nextAlarmLabel = `다음 알림 ${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
  }
  const inbox = getHomeSpaceInbox()
  return {
    todoCount: todos.length,
    nextAlarmLabel,
    unreadMessages: inbox.unreadTotal,
  }
}

function scheduleLines(): string[] {
  const now = Date.now()
  const fromAlarms = loadAlarms()
    .filter((a) => !a.fired && a.whenAt > now)
    .sort((a, b) => a.whenAt - b.whenAt)
    .slice(0, 3)
    .map((a) => {
      const d = new Date(a.whenAt)
      return `${d.getHours().toString().padStart(2, '0')}:${d
        .getMinutes()
        .toString()
        .padStart(2, '0')} ${a.body}`
    })
  if (fromAlarms.length) return fromAlarms
  return loadReminders()
    .filter((r) => !r.done && r.whenAt && r.whenAt > now)
    .sort((a, b) => (a.whenAt || 0) - (b.whenAt || 0))
    .slice(0, 3)
    .map((r) => {
      const d = new Date(r.whenAt!)
      return `${d.getHours().toString().padStart(2, '0')}:${d
        .getMinutes()
        .toString()
        .padStart(2, '0')} ${r.text}`
    })
}

export function resolveVoiceUiState(input: {
  listening: boolean
  busy: boolean
  error?: boolean
}): VoiceUiState {
  if (input.error) return 'error'
  if (input.listening) return 'listening'
  if (input.busy) return 'busy'
  return 'idle'
}

export function buildHomeV2Model(opts: {
  weather?: WeatherSnap | null
  listening: boolean
  busy: boolean
  voiceError?: boolean
  draft?: string
}): HomeV2Model {
  const settings = loadSettings()
  const inbox = getHomeSpaceInbox()
  const mode = loadInterpretMode()
  const voiceState = resolveVoiceUiState({
    listening: opts.listening,
    busy: opts.busy,
    error: opts.voiceError,
  })
  let prompt = '무엇을 도와드릴까요?'
  if (voiceState === 'listening') prompt = '듣고 있습니다…'
  else if (voiceState === 'busy') prompt = '생각 중…'
  else if (voiceState === 'error') prompt = '다시 말해 주세요'
  else if (opts.draft?.trim()) prompt = opts.draft.trim().slice(0, 48)

  return {
    header: buildHomeV2Header(settings.displayName || '', opts.weather),
    summary: buildHomeV2Summary(),
    smartCard: buildSmartCard({
      nextScheduleLines: scheduleLines(),
      importantTodos: loadReminders()
        .filter((r) => !r.done)
        .slice(0, 3)
        .map((r) => r.text),
      familyUnread: inbox.family.unread,
      friendsUnread: inbox.friends.unread,
      familyName: inbox.family.hasRoom ? inbox.family.name : '멤버 1',
      friendsName: inbox.friends.hasRoom ? inbox.friends.name : '멤버 2',
      activeFocusLabel: (() => {
        try {
          if (!isLifeOs2Enabled('focusEnabled')) return null
          const f = getActiveFocus()
          if (!f) return null
          const end = Date.parse(f.plannedEndAt)
          const left = Number.isFinite(end) ? Math.max(0, Math.round((end - Date.now()) / 60_000)) : 0
          return `${f.title} · 약 ${left}분`
        } catch {
          return null
        }
      })(),
    }),
    translate: {
      active: Boolean(mode.active),
      label: interpretModeBadgeLabel(mode),
    },
    voiceState,
    prompt,
  }
}

export const HOME_V2_QUICK_COMMANDS = {
  briefing: '브리핑',
  navigate: '__open_nav_sheet__',
  schedule: '일정 추가해줘',
  weather: '오늘 날씨 알려줘',
  translate: '__open_translate_sheet__',
} as const

export type HomeV2QuickId = keyof typeof HOME_V2_QUICK_COMMANDS

/** Music remains available via 메뉴 / 음성 — not removed from the product. */
export const HOME_V2_MUSIC_COMMAND = '조용한 음악 틀어줘'
