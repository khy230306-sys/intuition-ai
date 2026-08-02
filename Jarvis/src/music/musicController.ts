import { MusicSkillError, musicErrorUserMessage } from './musicErrors'
import { getMusicProvider } from './musicProvider'
import { assertSafeMusicUrl } from './musicSearch'
import {
  applyReadyResults,
  getMusicSession,
  patchMusicSession,
} from './musicSession'
import type { MusicControlAction, MusicSearchResult, MusicSession, MusicSkillReply } from './types'

type Locale = string

function reply(text: string, extra: Partial<MusicSkillReply> = {}): MusicSkillReply {
  return { text, speak: true, session: getMusicSession(), ...extra }
}

/** User tapped play / open — must be called from a click handler. */
export async function playWithUserGesture(locale: Locale = 'ko'): Promise<MusicSkillReply> {
  const session = getMusicSession()
  const url = session.url
  if (!url) {
    return reply(musicErrorUserMessage('no_results', locale))
  }
  try {
    assertSafeMusicUrl(url)
  } catch {
    return reply(musicErrorUserMessage('invalid_url', locale))
  }

  const provider = getMusicProvider(session.provider)
  const result: MusicSearchResult = session.results[session.resultIndex] || {
    id: 'current',
    title: session.title || session.query,
    url,
    provider: session.provider,
    isSearchUrl: true,
  }

  try {
    const { openedExternal } = await provider.play({ result, userGesture: true })
    if (openedExternal) {
      patchMusicSession({
        status: 'opened_external',
        startedAt: Date.now(),
        lastAction: 'play_music',
      })
      return reply(
        locale.startsWith('en')
          ? 'Opened in the music app or browser. Playback status there is unknown to AIZIO.'
          : locale.startsWith('ja')
            ? '音楽アプリまたはブラウザで開きました。再生状態はAIZIOでは確認できません。'
            : locale.startsWith('vi')
              ? 'Đã mở trong ứng dụng nhạc hoặc trình duyệt. AIZIO không xác nhận trạng thái phát.'
              : '음악 앱 또는 브라우저에서 열었어요. 실제 재생 여부는 AIZIO가 확인할 수 없습니다.',
      )
    }
    // Do not claim confirmed playback — in-app providers may still need a gesture / OS audio focus.
    patchMusicSession({ status: 'ready', startedAt: Date.now(), lastAction: 'play_music' })
    return reply(
      locale.startsWith('en')
        ? 'Playback was requested. If you hear nothing, tap Play again.'
        : locale.startsWith('ja')
          ? '再生を要求しました。聞こえない場合は再生をもう一度押してください。'
          : locale.startsWith('vi')
            ? 'Đã yêu cầu phát. Nếu không nghe thấy, hãy nhấn Phát lại.'
            : '재생을 요청했어요. 소리가 나지 않으면 재생 버튼을 다시 눌러 주세요.',
    )
  } catch (err) {
    if (err instanceof MusicSkillError) {
      return reply(musicErrorUserMessage(err.code, locale))
    }
    return reply(musicErrorUserMessage('unknown', locale))
  }
}

export async function controlMusic(
  action: MusicControlAction,
  locale: Locale = 'ko',
): Promise<MusicSkillReply> {
  const session = getMusicSession()
  const provider = getMusicProvider(session.provider)

  if (action === 'open' || action === 'play') {
    return playWithUserGesture(locale)
  }

  if (action === 'next' || action === 'previous') {
    const results = session.results
    if (results.length <= 1) {
      // With search-URL-only providers, "next" means a fresh related search is not available —
      // keep ready state and ask user to open again / rephrase.
      patchMusicSession({
        status: session.status === 'opened_external' ? 'unknown' : session.status,
        lastAction: action === 'next' ? 'next_track' : 'previous_track',
      })
      return reply(
        locale.startsWith('en')
          ? 'Open YouTube again and pick the next track there. AIZIO cannot skip inside the external app.'
          : '외부 앱 안에서는 다음 곡을 직접 넘길 수 없어요. YouTube에서 다음 곡을 골라 주세요.',
        { needsGesture: Boolean(session.url), playUrl: session.url },
      )
    }
    const delta = action === 'next' ? 1 : -1
    const nextIndex = Math.max(0, Math.min(results.length - 1, session.resultIndex + delta))
    const track = results[nextIndex]
    applyReadyResults(session.query, results, action === 'next' ? 'next_track' : 'previous_track')
    patchMusicSession({
      resultIndex: nextIndex,
      title: track.title,
      url: track.url,
      status: 'ready',
    })
    return reply(
      locale.startsWith('en')
        ? 'Ready with another result. Tap play to open it.'
        : '다른 결과를 준비했어요. 재생 버튼을 눌러 주세요.',
      { needsGesture: true, playUrl: track.url },
    )
  }

  if (action === 'pause' || action === 'stop') {
    const ctrl = await provider.control(action)
    patchMusicSession({
      status: action === 'stop' ? 'stopped' : 'paused',
      lastAction: action === 'stop' ? 'stop_music' : 'pause_music',
    })
    if (!ctrl.ok && ctrl.reason === 'external_app') {
      return reply(
        locale.startsWith('en')
          ? 'AIZIO marked music as stopped here. If sound continues, pause it in the external music app.'
          : '여기에서는 음악 세션을 멈춤으로 표시했어요. 소리가 계속되면 외부 음악 앱에서 일시정지해 주세요.',
      )
    }
    return reply(locale.startsWith('en') ? 'Music stopped.' : '음악을 멈췄어요.')
  }

  if (action === 'resume') {
    if (!session.url) {
      return reply(musicErrorUserMessage('no_results', locale))
    }
    patchMusicSession({ status: 'ready', lastAction: 'resume_music' })
    return reply(
      locale.startsWith('en')
        ? 'Tap play to open music again.'
        : '다시 들으려면 아래 재생 버튼을 눌러 주세요.',
      { needsGesture: true, playUrl: session.url },
    )
  }

  return reply(musicErrorUserMessage('unknown', locale))
}

export function describeCurrentTrack(locale: Locale = 'ko'): MusicSkillReply {
  const s = getMusicSession()
  if (!s.query && !s.title) {
    return reply(locale.startsWith('en') ? 'Nothing queued right now.' : '지금 준비된 음악이 없어요.')
  }
  const label = s.title || s.query
  const status = s.status
  return reply(
    locale.startsWith('en')
      ? `Queued: ${label} (${s.provider}, ${status}).`
      : `준비된 음악: ${label} (${s.provider}, ${status}).`,
    { needsGesture: status === 'ready', playUrl: s.url },
  )
}

export function volumeHint(direction: 'up' | 'down', locale: Locale = 'ko'): MusicSkillReply {
  const s = getMusicSession()
  // External providers: cannot change device volume.
  if (s.provider !== 'mock' || s.status === 'opened_external' || s.status === 'ready' || s.status === 'unknown') {
    return reply(
      locale.startsWith('en')
        ? 'Use your phone volume buttons for external music apps. AIZIO cannot change device volume.'
        : '외부 음악 앱의 볼륨은 휴대폰 볼륨 버튼으로 조절해 주세요. AIZIO가 기기 볼륨을 바꿀 수 없습니다.',
    )
  }
  const next = Math.max(0, Math.min(1, s.volume + (direction === 'up' ? 0.1 : -0.1)))
  patchMusicSession({ volume: next })
  return reply(
    locale.startsWith('en')
      ? `In-app volume set to ${Math.round(next * 100)}%.`
      : `앱 내부 볼륨을 ${Math.round(next * 100)}%로 맞췄어요.`,
  )
}

export function sessionSnapshot(): MusicSession {
  return getMusicSession()
}
