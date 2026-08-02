import type { AppLocale } from '../i18n'
import type { MusicIntent, MusicIntentResult, MusicMood, MusicProviderId } from './types'

const CONTROL_PATTERNS: Array<{ intent: MusicIntent; re: RegExp }> = [
  { intent: 'next_track', re: /^(다음\s*곡|다음\s*노래|next(\s+track|\s+song)?|スキップ|次の曲|bài\s*tiếp|다음)$/i },
  { intent: 'previous_track', re: /^(이전\s*곡|이전\s*노래|previous(\s+track|\s+song)?|前の曲|bài\s*trước)$/i },
  { intent: 'pause_music', re: /^(일시\s*정지|음악\s*멈춰|음악\s*일시\s*정지|pause(\s+music)?|一時停止|tạm\s*dừng(\s*nhạc)?)$/i },
  { intent: 'stop_music', re: /^(음악\s*중지|음악\s*그만|stop(\s+music)?|音楽を止|dừng\s*nhạc)$/i },
  { intent: 'resume_music', re: /^(다시\s*재생(해|해\s*줘|해줘)?|음악\s*(다시\s*)?재생(해|해\s*줘|해줘)?|계속\s*틀어(줘)?|resume|play\s*again|再開|phát\s*lại)$/i },
  {
    intent: 'show_current_track',
    re: /(지금\s*무슨\s*(음악|노래)|현재\s*(곡|노래)|what('?s|\s+is)\s+playing|今何の曲|đang\s*phát\s*gì)/i,
  },
  {
    intent: 'lower_volume',
    re: /(볼륨\s*(조금\s*)?(낮|줄)|소리\s*(낮|줄)|volume\s*down|音量.*(下げ|小さく)|giảm\s*âm\s*lượng)/i,
  },
  {
    intent: 'raise_volume',
    re: /(볼륨\s*(조금\s*)?(높|키)|소리\s*(높|키)|volume\s*up|音量.*(上げ|大きく)|tăng\s*âm\s*lượng)/i,
  },
  {
    intent: 'open_music_app',
    re: /(유튜브\s*뮤직|youtube\s*music|스포티파이|spotify|애플\s*뮤직|apple\s*music).*(열어|실행|열어줘)|open\s+(youtube|spotify|apple\s*music)/i,
  },
]

const MUSIC_TRIGGER =
  /(음악|노래|뮤직|플레이리스트|playlist|music|song|곡\s*틀|틀어|재생해|가요|케이팝|k[\s-]?pop|流して|音楽|bài\s*hát|nhạc)/i

const PLAY_TRIGGER =
  /(틀어|재생|들려|찾아|추천|골라|search|play|recommend|suggest|かけて|流して|phát|mở\s*nhạc)/i

const ARTIST_SONG =
  /(?:(?:가수|아티스트|artist)\s*)?([A-Za-z가-힣0-9 .'\-]{2,40})\s*(?:의|의\s*)?(?:노래|곡|song|track)\s*(?:틀어|재생|찾아)?/i

type MoodRule = {
  mood: MusicMood
  re: RegExp
  energy?: MusicIntentResult['energy']
  tempo?: MusicIntentResult['tempo']
  instrumental?: MusicIntentResult['instrumental']
  activity?: string
}

const MOOD_RULES: MoodRule[] = [
  {
    mood: 'sleep',
    re: /(재울|수면|잠\s*올|자장가|sleep|lullaby|おやすみ|ngủ)/i,
    energy: 'low',
    tempo: 'slow',
    instrumental: 'preferred',
    activity: 'sleep',
  },
  {
    mood: 'focus',
    re: /(집중|공부|작업|일\s*할|focus|study|作業|tập\s*trung)/i,
    energy: 'low',
    tempo: 'medium',
    instrumental: true,
    activity: 'focus',
  },
  { mood: 'rain', re: /(비\s*오|빗소리|rainy|雨|mưa)/i, energy: 'low', tempo: 'slow' },
  { mood: 'cafe', re: /(카페|cafe|coffee\s*shop|カフェ|quán\s*cà\s*phê)/i, energy: 'medium', tempo: 'medium' },
  {
    mood: 'workout',
    re: /(운동|헬스|workout|gym|ランニング|tập\s*gym)/i,
    energy: 'high',
    tempo: 'fast',
    activity: 'workout',
  },
  {
    mood: 'meditation',
    re: /(명상|meditation|瞑想|thiền)/i,
    energy: 'low',
    tempo: 'slow',
    instrumental: true,
    activity: 'meditation',
  },
  { mood: 'healing', re: /(힐링|healing|癒し)/i, energy: 'low', tempo: 'slow' },
  { mood: 'romantic', re: /(로맨틱|사랑|romantic|恋愛)/i, energy: 'medium', tempo: 'slow' },
  { mood: 'sad', re: /(슬픈|우울|sad|悲しい|buồn)/i, energy: 'low', tempo: 'slow' },
  { mood: 'happy', re: /(신나|행복|happy|楽しい|vui)/i, energy: 'high', tempo: 'fast' },
  { mood: 'upbeat', re: /(신나는|업비트|upbeat|元気)/i, energy: 'high', tempo: 'fast' },
  {
    mood: 'driving',
    re: /(운전|드라이브|driving|ドライブ)/i,
    energy: 'medium',
    tempo: 'medium',
    activity: 'driving',
  },
  { mood: 'kids', re: /(아이|어린이|kids|子ども|trẻ\s*em)/i, energy: 'low', tempo: 'slow', activity: 'kids' },
  { mood: 'relaxing', re: /(편안|릴렉스|relax|くつろ)/i, energy: 'low', tempo: 'slow' },
  {
    mood: 'calm',
    re: /(조용|잔잔|차분|calm|quiet|穏やか|êm\s*dịu)/i,
    energy: 'low',
    tempo: 'slow',
    instrumental: 'preferred',
  },
]

function stripWakeWord(text: string): string {
  return text
    .replace(/^(아이지오|에이아이지오|에이아이지오야|aizio|hey\s*aizio)[,.\s]*/i, '')
    .trim()
}

function detectMoodChange(text: string): boolean {
  return /(바꿔|바꾸|더\s*(조용|잔잔|신나|빠르)|change|もっと|đổi)/i.test(text) && MUSIC_TRIGGER.test(text)
}

function extractArtistOrSong(text: string): { artist?: string; track?: string } {
  const m = text.match(ARTIST_SONG)
  if (m?.[1]) return { artist: m[1].trim() }
  const quoted = text.match(/[「『"']([^"'「」『』]{2,60})[」』"']/)
  if (quoted?.[1]) return { track: quoted[1].trim() }
  return {}
}

function fillMoodFields(text: string, base: MusicIntentResult): MusicIntentResult {
  for (const rule of MOOD_RULES) {
    if (rule.re.test(text)) {
      base.mood = rule.mood
      if (rule.energy) base.energy = rule.energy
      if (rule.tempo) base.tempo = rule.tempo
      if (rule.instrumental !== undefined) base.instrumental = rule.instrumental
      if (rule.activity) base.activity = rule.activity
      break
    }
  }
  if (/(가사\s*없|instrumental|インスト)/i.test(text)) base.instrumental = true

  let provider: MusicProviderId | undefined
  if (/(유튜브\s*뮤직|youtube\s*music)/i.test(text)) provider = 'youtube_music'
  else if (/youtube|유튜브/i.test(text)) provider = 'youtube'
  else if (/spotify|스포티파이/i.test(text)) provider = 'spotify'
  else if (/apple\s*music|애플\s*뮤직/i.test(text)) provider = 'apple_music'
  if (provider) base.providerPreference = provider

  const named = extractArtistOrSong(text)
  if (named.artist) base.artist = named.artist
  if (named.track) base.track = named.track
  return base
}

export function buildMusicSearchQuery(text: string, intent: MusicIntentResult, language: AppLocale): string {
  if (intent.track) return intent.track
  if (intent.artist) {
    const songWord =
      language === 'en'
        ? 'songs'
        : language === 'ja'
          ? '曲'
          : language === 'vi'
            ? 'bài hát'
            : language === 'zh'
              ? '歌曲'
              : '노래'
    return `${intent.artist} ${songWord}`
  }

  const moodLabel: Partial<Record<MusicMood, Record<AppLocale, string>>> = {
    calm: { ko: '조용한 잔잔한', en: 'calm relaxing', ja: '落ち着いた', vi: 'êm dịu', zh: '安静舒缓' },
    focus: {
      ko: '집중 작업용 가사 없는',
      en: 'focus instrumental study',
      ja: '集中用インスト',
      vi: 'tập trung không lời',
      zh: '专注工作无歌词',
    },
    sleep: {
      ko: '수면 자장가 잔잔한',
      en: 'sleep lullaby calm',
      ja: '睡眠・子守唄',
      vi: 'nhạc ngủ êm',
      zh: '睡眠安眠曲',
    },
    cafe: { ko: '카페 분위기', en: 'cafe atmosphere', ja: 'カフェ雰囲気', vi: 'nhạc quán cà phê', zh: '咖啡馆氛围' },
    rain: {
      ko: '비 오는 날 조용한 카페',
      en: 'rainy day calm cafe',
      ja: '雨の日カフェ',
      vi: 'ngày mưa quán cà phê',
      zh: '雨天安静咖啡馆',
    },
    workout: { ko: '운동 신나는', en: 'workout upbeat', ja: 'ワークアウト', vi: 'tập gym sôi động', zh: '运动动感' },
    healing: { ko: '힐링', en: 'healing', ja: '癒し', vi: 'chữa lành', zh: '疗愈' },
    meditation: { ko: '명상', en: 'meditation', ja: '瞑想', vi: 'thiền', zh: '冥想' },
    upbeat: { ko: '신나는', en: 'upbeat', ja: '元気な', vi: 'sôi động', zh: '欢快' },
    romantic: { ko: '로맨틱', en: 'romantic', ja: 'ロマンチック', vi: 'lãng mạn', zh: '浪漫' },
    sad: { ko: '슬픈', en: 'sad', ja: '悲しい', vi: 'buồn', zh: '悲伤' },
    happy: { ko: '행복한', en: 'happy', ja: '楽しい', vi: 'vui vẻ', zh: '快乐' },
    driving: { ko: '드라이브', en: 'driving', ja: 'ドライブ', vi: 'lái xe', zh: '驾车' },
    study: { ko: '공부', en: 'study', ja: '勉強', vi: 'học tập', zh: '学习' },
    kids: {
      ko: '아이 재우는 잔잔한',
      en: 'kids calm lullaby',
      ja: '子ども向け穏やか',
      vi: 'cho trẻ êm dịu',
      zh: '哄睡安静',
    },
    relaxing: { ko: '편안한', en: 'relaxing', ja: 'リラックス', vi: 'thư giãn', zh: '放松' },
  }

  const parts: string[] = []
  if (intent.mood && moodLabel[intent.mood]) {
    parts.push(moodLabel[intent.mood]![language])
  } else {
    const cleaned = text
      .replace(/(틀어\s*줘|재생해\s*줘|찾아\s*줘|들려\s*줘|play|search|かけて|流して|phát\s*đi)/gi, '')
      .replace(MUSIC_TRIGGER, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (cleaned.length >= 2) parts.push(cleaned)
  }

  if (intent.instrumental === true || intent.instrumental === 'preferred') {
    parts.push(
      language === 'en'
        ? 'instrumental'
        : language === 'ja'
          ? 'インスト'
          : language === 'vi'
            ? 'không lời'
            : language === 'zh'
              ? '纯音乐'
              : '가사 없는',
    )
  }

  const playlist =
    language === 'en' || language === 'vi'
      ? 'playlist'
      : language === 'ja'
        ? 'プレイリスト'
        : language === 'zh'
          ? '播放列表'
          : '플레이리스트'
  parts.push(
    language === 'en'
      ? 'music'
      : language === 'ja'
        ? '音楽'
        : language === 'vi'
          ? 'nhạc'
          : language === 'zh'
            ? '音乐'
            : '음악',
    playlist,
  )

  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Classify whether user text is a music command.
 * Ambiguous / non-music → null (fall through to normal AI).
 */
export function classifyMusicIntent(raw: string, language: AppLocale = 'ko'): MusicIntentResult | null {
  const text = stripWakeWord(raw).trim()
  if (!text || text.length > 200) return null

  for (const { intent, re } of CONTROL_PATTERNS) {
    if (re.test(text)) {
      return { intent, confidence: 0.95, rawText: text, searchQuery: '' }
    }
  }

  if (detectMoodChange(text)) {
    const base: MusicIntentResult = { intent: 'change_mood', confidence: 0.9, rawText: text }
    fillMoodFields(text, base)
    if (/(더\s*(조용|잔잔)|quieter|calmer|もっと静か)/i.test(text)) {
      base.mood = 'calm'
      base.energy = 'low'
      base.tempo = 'slow'
    }
    if (/(더\s*신나|더\s*빠르|more\s*upbeat|もっと元気)/i.test(text)) {
      base.mood = 'upbeat'
      base.energy = 'high'
      base.tempo = 'fast'
    }
    base.searchQuery = buildMusicSearchQuery(text, base, language)
    return base
  }

  if (!MUSIC_TRIGGER.test(text) && !PLAY_TRIGGER.test(text)) return null

  if (/(일정|날씨|번역|요약|코드|수학|계산|뉴스|일정\s*알려)/i.test(text) && !PLAY_TRIGGER.test(text)) {
    return null
  }

  // Music noun, or explicit play verb. Bare "추천해줘" alone is not music.
  if (!MUSIC_TRIGGER.test(text) && !/(틀어|재생|play|かけて)/i.test(text)) return null
  if (/추천|골라|recommend|suggest/i.test(text) && !MUSIC_TRIGGER.test(text)) return null

  if (/(뭐야|무엇|what\s+is|이란|뜻|역사|작곡가)/i.test(text) && !PLAY_TRIGGER.test(text)) {
    return null
  }

  const isSearchOnly =
    /(찾아|search|探し)/i.test(text) && !/(틀어|재생|play|かけて|추천|골라|recommend)/i.test(text)
  const base: MusicIntentResult = {
    intent: isSearchOnly ? 'search_music' : 'play_music',
    confidence: 0.8,
    rawText: text,
  }
  fillMoodFields(text, base)
  if (base.mood || base.artist || base.track) base.confidence = 0.92
  base.searchQuery = buildMusicSearchQuery(text, base, language)
  return base
}

export function isLikelyMusicRequest(text: string, language: AppLocale = 'ko'): boolean {
  return classifyMusicIntent(text, language) !== null
}
