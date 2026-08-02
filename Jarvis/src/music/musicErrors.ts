export type MusicErrorCode =
  | 'offline'
  | 'no_results'
  | 'provider_unavailable'
  | 'autoplay_blocked'
  | 'external_app_missing'
  | 'invalid_url'
  | 'cancelled'
  | 'timeout'
  | 'auth_required'
  | 'rate_limited'
  | 'unknown'

export class MusicSkillError extends Error {
  readonly code: MusicErrorCode
  constructor(code: MusicErrorCode, message: string) {
    super(message)
    this.name = 'MusicSkillError'
    this.code = code
  }
}

export function musicErrorUserMessage(code: MusicErrorCode, locale = 'ko'): string {
  const ko: Record<MusicErrorCode, string> = {
    offline: '인터넷 연결이 없어 음악을 검색할 수 없습니다.',
    no_results: '검색 결과를 찾지 못했어요. 다른 표현으로 다시 요청해 주세요.',
    provider_unavailable: '음악 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.',
    autoplay_blocked: '재생하려면 아래 버튼을 한 번 눌러 주세요.',
    external_app_missing: '음악 앱을 열 수 없어 검색 결과를 표시합니다.',
    invalid_url: '안전하지 않은 링크라 열 수 없습니다.',
    cancelled: '요청이 취소되었습니다.',
    timeout: '응답이 지연되었습니다. 다시 시도해 주세요.',
    auth_required: '이 기능은 음악 서비스 연동이 필요합니다.',
    rate_limited: '요청이 많아 잠시 후 다시 시도해 주세요.',
    unknown: '음악을 준비하지 못했습니다. 다시 말씀해 주세요.',
  }
  const en: Record<MusicErrorCode, string> = {
    offline: 'No internet connection — cannot search for music.',
    no_results: 'No results found. Try a different request.',
    provider_unavailable: 'Music provider unavailable. Try again later.',
    autoplay_blocked: 'Tap the play button below to start.',
    external_app_missing: 'Could not open the music app. Showing search results instead.',
    invalid_url: 'Blocked an unsafe link.',
    cancelled: 'Request cancelled.',
    timeout: 'Timed out. Please try again.',
    auth_required: 'This feature needs a music service connection.',
    rate_limited: 'Too many requests. Please wait a moment.',
    unknown: 'Could not prepare music. Please try again.',
  }
  if (locale.startsWith('en')) return en[code]
  if (locale.startsWith('ja')) {
    const ja: Partial<Record<MusicErrorCode, string>> = {
      offline: 'インターネット接続がないため音楽を検索できません。',
      autoplay_blocked: '再生するには下のボタンを押してください。',
      no_results: '結果が見つかりませんでした。別の言い方で試してください。',
    }
    return ja[code] || en[code]
  }
  if (locale.startsWith('vi')) {
    const vi: Partial<Record<MusicErrorCode, string>> = {
      offline: 'Không có mạng — không thể tìm nhạc.',
      autoplay_blocked: 'Nhấn nút phát bên dưới để bắt đầu.',
      no_results: 'Không tìm thấy kết quả. Hãy thử cách nói khác.',
    }
    return vi[code] || en[code]
  }
  return ko[code]
}
