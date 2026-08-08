import type { AppLocale } from '../i18n'
import { getAppLocale } from '../i18n'
import { MusicSkillError, musicErrorUserMessage } from './musicErrors'
import { classifyMusicIntent } from './musicIntent'
import {
  controlMusic,
  describeCurrentTrack,
  playWithUserGesture,
  volumeHint,
} from './musicController'
import { rememberMusicSearch, rememberPreferredMood, loadMusicPreferences } from './musicPreferences'
import { searchMusicForIntent } from './musicSearch'
import { applyReadyResults, getMusicSession, patchMusicSession } from './musicSession'
import type { MusicIntentResult, MusicSkillReply } from './types'

let inflight: AbortController | null = null

function msg(
  locale: AppLocale,
  key:
    | 'searching'
    | 'ready'
    | 'focusReady'
    | 'sleepReady'
    | 'changed'
    | 'searchOnly',
): string {
  const table: Record<typeof key, Record<AppLocale, string>> = {
    searching: {
      ko: '음악을 찾고 있어요…',
      en: 'Searching for music…',
      ja: '音楽を探しています…',
      vi: 'Đang tìm nhạc…',
      zh: '正在搜索音乐…',
    },
    ready: {
      ko: '재생할 음악을 준비했어요. 아래 재생 버튼을 눌러 주세요.',
      en: 'Music is ready. Tap the play button below.',
      ja: '再生する音楽を用意しました。下の再生ボタンを押してください。',
      vi: 'Đã chuẩn bị nhạc. Hãy nhấn nút phát bên dưới.',
      zh: '已准备好音乐。请点击下方播放按钮。',
    },
    focusReady: {
      ko: '가사 없는 집중 음악을 준비했어요. 아래 재생 버튼을 눌러 주세요.',
      en: 'Focus instrumental music is ready. Tap play below.',
      ja: '集中用のインスト音楽を用意しました。再生ボタンを押してください。',
      vi: 'Đã chuẩn bị nhạc tập trung không lời. Nhấn phát bên dưới.',
      zh: '已准备好专注纯音乐。请点击下方播放按钮。',
    },
    sleepReady: {
      ko: '잔잔한 수면 음악을 준비했어요. 아래 재생 버튼을 눌러 주세요.',
      en: 'Calm sleep music is ready. Tap play below.',
      ja: '穏やかな睡眠用音楽を用意しました。再生ボタンを押してください。',
      vi: 'Đã chuẩn bị nhạc ngủ êm. Nhấn phát bên dưới.',
      zh: '已准备好舒缓睡眠音乐。请点击下方播放按钮。',
    },
    changed: {
      ko: '분위기에 맞춰 다시 준비했어요. 아래 재생 버튼을 눌러 주세요.',
      en: 'Prepared a different mood. Tap play below.',
      ja: '雰囲気を変えて用意しました。再生ボタンを押してください。',
      vi: 'Đã chuẩn bị mood khác. Nhấn phát bên dưới.',
      zh: '已按氛围重新准备。请点击下方播放按钮。',
    },
    searchOnly: {
      ko: '검색 결과를 준비했어요. 아래 버튼으로 YouTube에서 열어 주세요.',
      en: 'Search is ready. Open it on YouTube with the button below.',
      ja: '検索結果を用意しました。下のボタンでYouTubeを開いてください。',
      vi: 'Đã sẵn sàng kết quả tìm. Mở YouTube bằng nút bên dưới.',
      zh: '已准备好搜索结果。请用下方按钮在 YouTube 打开。',
    },
  }
  return table[key][locale] || table[key].en
}

function readyCopy(intent: MusicIntentResult, locale: AppLocale): string {
  if (intent.intent === 'search_music') return msg(locale, 'searchOnly')
  if (intent.intent === 'change_mood') return msg(locale, 'changed')
  if (intent.mood === 'focus' || intent.activity === 'focus') return msg(locale, 'focusReady')
  if (intent.mood === 'sleep' || intent.activity === 'sleep') return msg(locale, 'sleepReady')
  if (intent.mood === 'calm' || intent.mood === 'relaxing') {
    if (locale === 'en') return 'Found calm music. Tap the play button below.'
    if (locale === 'ja') return '落ち着いた音楽を見つけました。下の再生ボタンを押してください。'
    if (locale === 'vi') return 'Đã tìm nhạc êm. Nhấn nút phát bên dưới.'
    if (locale === 'zh') return '已找到舒缓音乐。请点击下方播放按钮。'
    return '잔잔한 음악을 찾았어요. 아래 재생 버튼을 눌러 주세요.'
  }
  return msg(locale, 'ready')
}

async function prepareSearch(intent: MusicIntentResult, locale: AppLocale): Promise<MusicSkillReply> {
  if (inflight) {
    inflight.abort()
    inflight = null
  }
  const ac = new AbortController()
  inflight = ac
  patchMusicSession({ status: 'searching', lastAction: intent.intent, query: intent.searchQuery || '' })

  try {
    const prefs = loadMusicPreferences()
    if (prefs.preferInstrumental && intent.instrumental === undefined) {
      intent.instrumental = true
      if (intent.searchQuery && !/instrumental|가사 없는|インスト|không lời/i.test(intent.searchQuery)) {
        intent.searchQuery = `${intent.searchQuery} ${locale === 'en' ? 'instrumental' : '가사 없는'}`.trim()
      }
    }
    const bundle = await searchMusicForIntent(intent, {
      signal: ac.signal,
      locale,
      providerId: intent.providerPreference || prefs.preferredMusicProvider,
    })
    if (ac.signal.aborted) {
      throw new MusicSkillError('cancelled', 'cancelled')
    }
    const session = applyReadyResults(bundle.query, bundle.tracks, intent.intent)
    rememberMusicSearch(bundle.query)
    if (intent.mood) rememberPreferredMood(intent.mood)
    inflight = null
    return {
      text: readyCopy(intent, locale),
      speak: true,
      needsGesture: true,
      playUrl: session.url,
      showMiniPlayer: true,
      session,
    }
  } catch (err) {
    inflight = null
    if (err instanceof MusicSkillError) {
      patchMusicSession({ status: 'error', errorCode: err.code })
      return { text: musicErrorUserMessage(err.code, locale), speak: true, session: getMusicSession() }
    }
    if ((err as Error)?.name === 'AbortError') {
      return { text: musicErrorUserMessage('cancelled', locale), speak: true, session: getMusicSession() }
    }
    patchMusicSession({ status: 'error', errorCode: 'unknown' })
    return { text: musicErrorUserMessage('unknown', locale), speak: true, session: getMusicSession() }
  }
}

/**
 * Handle a user utterance if it is a music command.
 * Returns null when the message should go to the normal AI engine.
 */
function localeForUtterance(raw: string, locale: AppLocale): AppLocale {
  // Korean utterances should never get English chrome-default copy.
  if (/[가-힣]/.test(raw || '')) return 'ko'
  return locale || getAppLocale()
}

export async function tryHandleMusicSkill(
  raw: string,
  locale: AppLocale = getAppLocale(),
): Promise<MusicSkillReply | null> {
  locale = localeForUtterance(raw, locale)
  let intent = classifyMusicIntent(raw, locale)
  // Short controls while a music session is active (avoid hijacking general chat otherwise)
  if (!intent) {
    const session = getMusicSession()
    const active =
      session.status === 'ready' ||
      session.status === 'opened_external' ||
      session.status === 'paused' ||
      session.status === 'unknown' ||
      session.status === 'searching'
    const t = raw.trim()
    if (active) {
      if (/^(멈춰|중지|그만)$/i.test(t)) {
        intent = { intent: 'stop_music', confidence: 0.85, rawText: t, searchQuery: '' }
      } else if (/^(재생해|다시)$/i.test(t)) {
        intent = { intent: 'resume_music', confidence: 0.85, rawText: t, searchQuery: '' }
      } else if (/^(다음)$/i.test(t)) {
        intent = { intent: 'next_track', confidence: 0.85, rawText: t, searchQuery: '' }
      }
    }
  }
  if (!intent || intent.intent === 'none') return null

  switch (intent.intent) {
    case 'play_music':
    case 'search_music':
    case 'change_mood':
      return prepareSearch(intent, locale)
    case 'pause_music':
      return controlMusic('pause', locale)
    case 'stop_music':
      return controlMusic('stop', locale)
    case 'resume_music':
      return controlMusic('resume', locale)
    case 'next_track':
      return controlMusic('next', locale)
    case 'previous_track':
      return controlMusic('previous', locale)
    case 'show_current_track':
      return describeCurrentTrack(locale)
    case 'lower_volume':
      return volumeHint('down', locale)
    case 'raise_volume':
      return volumeHint('up', locale)
    case 'open_music_app': {
      const prefs = loadMusicPreferences()
      const openIntent: MusicIntentResult = {
        ...intent,
        intent: 'search_music',
        searchQuery: intent.searchQuery || (locale === 'en' ? 'music' : '음악'),
        providerPreference: intent.providerPreference || prefs.preferredMusicProvider,
      }
      return prepareSearch(openIntent, locale)
    }
    default:
      return null
  }
}

export { playWithUserGesture, classifyMusicIntent }
