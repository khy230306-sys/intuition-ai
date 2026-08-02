import { classifyMusicIntent } from '../music/musicIntent'
import type { AppLocale } from '../i18n'
import { extractEntities } from './entityExtractor'
import type { CoreIntent, IntentClassification } from './types'
import { lastIntent } from './brainState'

type Rule = { intent: CoreIntent; re: RegExp; confidence: number }

const RULES: Rule[] = [
  { intent: 'help', re: /도움말|헬프|^help$|뭐\s*할\s*수|사용법|명령어/i, confidence: 0.92 },
  { intent: 'change_setting', re: /설정\s*(열어|보여|가|켜)|settings?\s*open|언어\s*바꿔|tts\s*설정/i, confidence: 0.9 },
  { intent: 'app_navigation', re: /(투자|생활|가족|친구|게임|액션|설정|채팅)\s*(탭|화면|메뉴)?\s*(열어|보여|가|이동)/i, confidence: 0.88 },
  {
    intent: 'translate',
    re: /번역|통역|translate|interpreting?|(?:로|으로)\s*번역|일본어로|영어로|베트남어로|중국어로/i,
    confidence: 0.9,
  },
  {
    intent: 'control_music',
    re: /^(음악\s*)?(멈춰|중지|그만|일시\s*정지)|다음\s*곡|이전\s*곡|볼륨\s*(낮|높|줄|키)|resume|pause|stop\s*music/i,
    confidence: 0.93,
  },
  {
    intent: 'play_music',
    re: /(음악|노래|뮤직|플레이리스트|playlist|곡).*(틀어|재생|추천|들려|찾아|play)|틀어\s*줘|재생해|play\s+.*music/i,
    confidence: 0.9,
  },
  {
    intent: 'create_note',
    re: /기억해|메모해|메모해줘|기억해줘|메모\s*저장|노트\s*저장/i,
    confidence: 0.9,
  },
  {
    intent: 'search_note',
    re: /메모\s*(보여|목록|찾아|검색)|기억\s*(목록|보여|뭐였)|뭐였지|노트\s*(보여|목록)/i,
    confidence: 0.9,
  },
  {
    intent: 'list_todo',
    re: /할\s*일\s*(목록|보여|리스트)|리마인더\s*(목록|보여)|남은\s*할\s*일|투두\s*목록/i,
    confidence: 0.92,
  },
  {
    intent: 'create_todo',
    re: /할\s*일\s*(추가|등록)|리마인더\s*|기억시켜|할\s*일에\s*넣/i,
    confidence: 0.88,
  },
  {
    intent: 'list_calendar',
    re: /오늘\s*일정|일정\s*(알려|보여|목록)|다가오는\s*일정|캘린더\s*(보여|알려)|가족\s*일정|친구\s*일정|공휴일/i,
    confidence: 0.88,
  },
  {
    intent: 'create_calendar_event',
    re: /일정\s*(추가|등록|잡아)|약속\s*(추가|잡아)|회의\s*일정|캘린더에\s*넣/i,
    confidence: 0.86,
  },
  {
    intent: 'project_status',
    re: /프로젝트\s*(상태|현황|진행|어디까지)|nexus.*(어디|상태|진행)|어디까지\s*됐/i,
    confidence: 0.85,
  },
  {
    intent: 'project_planning',
    re: /프로젝트\s*(계획|플랜|다음\s*작업)|다음\s*작업은/i,
    confidence: 0.8,
  },
  { intent: 'summarize', re: /요약해|summarize|줄여\s*줘|핵심만/i, confidence: 0.82 },
  {
    intent: 'ask_information',
    re: /알려줘|뭐야\??$|어떻게\s*돼|얼마야|몇\s*시|날씨|시세|환율/i,
    confidence: 0.55,
  },
]

function applyContextFollowUp(text: string, base: IntentClassification): IntentClassification {
  const prev = lastIntent()
  const t = text.trim()

  // “조금 더 신나는 걸로” after music
  if (
    prev &&
    (prev === 'play_music' || prev === 'control_music') &&
    /(더\s*(조용|잔잔|신나|빠르)|으로\s*바꿔|걸로\s*바꿔|다른\s*(음악|노래)|change)/i.test(t) &&
    t.length < 40
  ) {
    return {
      intent: 'control_music',
      confidence: Math.max(base.confidence, 0.88),
      source: 'local',
      entities: { ...base.entities, followUp: true, moodHint: t },
    }
  }

  // “다음 작업은?” after project
  if (
    prev &&
    (prev === 'project_status' || prev === 'project_planning') &&
    /(다음\s*작업|그다음|이어서|진행\s*상황)/i.test(t) &&
    t.length < 40
  ) {
    return {
      intent: 'project_planning',
      confidence: 0.86,
      source: 'local',
      entities: { ...base.entities, followUp: true },
    }
  }

  return base
}

/**
 * Fast local intent classification. Ambiguous → general_chat (legacy AI path).
 * Does not call the cloud AI (keeps cost/latency low); AI failure → general_chat.
 */
export function classifyIntent(text: string, locale: AppLocale = 'ko'): IntentClassification {
  const t = text.trim()
  if (!t) {
    return { intent: 'unknown', confidence: 0, source: 'default', entities: {} }
  }

  // Prefer dedicated music classifier when it fires
  try {
    const music = classifyMusicIntent(t, locale)
    if (music) {
      const intent: CoreIntent =
        music.intent === 'play_music' || music.intent === 'search_music' || music.intent === 'change_mood'
          ? music.intent === 'change_mood'
            ? 'control_music'
            : 'play_music'
          : 'control_music'
      const base: IntentClassification = {
        intent,
        confidence: music.confidence,
        source: 'local',
        entities: extractEntities(t, intent),
      }
      if (music.mood) base.entities.mood = music.mood
      return applyContextFollowUp(t, base)
    }
  } catch {
    /* ignore music classifier errors */
  }

  for (const rule of RULES) {
    if (rule.re.test(t)) {
      const base: IntentClassification = {
        intent: rule.intent,
        confidence: rule.confidence,
        source: 'local',
        entities: extractEntities(t, rule.intent),
      }
      return applyContextFollowUp(t, base)
    }
  }

  // Soft chat / unclear → general_chat so legacy pipeline + AI can run
  const soft: IntentClassification = {
    intent: 'general_chat',
    confidence: 0.4,
    source: 'default',
    entities: {},
  }
  return applyContextFollowUp(t, soft)
}
