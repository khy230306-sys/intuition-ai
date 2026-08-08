/**
 * Deterministic conversation planner (NLU layer).
 * Does not invent weather/places/prices — only routes.
 */

import type { OrchestratorPlan } from './types'

function pickCity(t: string): string | undefined {
  const m = t.match(
    /(서울|부산|대구|인천|광주|대전|울산|세종|제주|수원|성남|고양|용인|창원|청주|천안|전주|포항|안산|안양|남양주|화성|김포|평택|의정부|시흥|파주|김해|구미|진주|원주|춘천|강릉|속초|여수|목포|순천|군산|익산)/,
  )
  return m?.[1]
}

/**
 * Plan the turn. Active translation mode is handled upstream — this planner
 * assumes normal mode unless domain=translation is requested.
 */
export function planConversationTurn(raw: string): OrchestratorPlan {
  const t = (raw || '').trim()
  if (!t) {
    return {
      domain: 'unknown',
      requiresTool: false,
      useLlmReply: true,
      entities: {},
      reason: 'empty',
      confidence: 0,
    }
  }

  // Typos / soft weather (「낼」 is not a JS \w char — avoid \b)
  if (
    /내일|모레|오늘|지금|(^|\s)낼(\s|$)|낼\s*비/.test(t) &&
    /(비\s*와|비와|비\s*옴|비옴|날씨|강수|우산|기온)/.test(t)
  ) {
    return {
      domain: 'weather',
      requiresTool: true,
      useLlmReply: true,
      entities: {
        city: pickCity(t),
        dateHint: /내일|(^|\s)낼(\s|$)|낼\s*비/.test(t) ? '내일' : /모레/.test(t) ? '모레' : '오늘',
      },
      reason: 'weather_query',
      confidence: 0.9,
    }
  }
  if (/(비\s*옴|비옴|날씨|우산)/.test(t) && pickCity(t)) {
    return {
      domain: 'weather',
      requiresTool: true,
      useLlmReply: true,
      entities: { city: pickCity(t) },
      reason: 'weather_city',
      confidence: 0.85,
    }
  }

  if (/번역\s*(그만|종료|꺼|중지)|통역\s*(그만|종료)/.test(t)) {
    return {
      domain: 'translation',
      requiresTool: true,
      useLlmReply: false,
      entities: {},
      reason: 'translation_end',
      confidence: 0.95,
    }
  }
  if (/(영어로|일본어로|중국어로|베트남어로).*(번역|통역)|번역\s*모드|앞으로.*번역/.test(t)) {
    return {
      domain: 'translation',
      requiresTool: true,
      useLlmReply: false,
      entities: {
        language: /영어/.test(t) ? 'en' : /일본/.test(t) ? 'ja' : /중국/.test(t) ? 'zh' : /베트남/.test(t) ? 'vi' : 'en',
      },
      reason: 'translation_start',
      confidence: 0.9,
    }
  }

  if (
    /갈\s*만\s*한\s*곳|갈만한|찾아\s*봐|찾아봐|장소\s*찾|나들이|체험/.test(t) ||
    (/(아이|어린이)/.test(t) && /(갈|찾아|어디)/.test(t))
  ) {
    return {
      domain: 'places',
      requiresTool: true,
      useLlmReply: true,
      entities: { city: pickCity(t), query: t },
      reason: 'place_seek',
      confidence: 0.85,
    }
  }

  if (/맛집|고기집|식당|레스토랑|카페\s*추천|근처\s*먹/.test(t)) {
    return {
      domain: 'restaurant',
      requiresTool: true,
      useLlmReply: true,
      entities: { city: pickCity(t), query: t },
      reason: 'restaurant',
      confidence: 0.85,
    }
  }

  if (/비행기|항공권|호텔|호치민|하노이|오사카|도쿄|여행\s*계획|비행/.test(t)) {
    return {
      domain: 'travel',
      requiresTool: true,
      useLlmReply: true,
      entities: { query: t },
      reason: 'travel',
      confidence: 0.8,
    }
  }

  if (/일정|캘린더|리마인더|알려줘|병원|기억해|알람/.test(t) && /(시|분|월요일|화요일|수요일|목요일|금요일|토요일|일요일|내일|모레)/.test(t)) {
    return {
      domain: 'calendar',
      requiresTool: true,
      useLlmReply: false,
      entities: { query: t },
      reason: 'calendar_or_reminder',
      confidence: 0.8,
    }
  }

  if (/음악|노래|틀어|플레이리스트/.test(t)) {
    return {
      domain: 'music',
      requiresTool: true,
      useLlmReply: true,
      entities: { query: t },
      reason: 'music',
      confidence: 0.75,
    }
  }

  if (/도움말|사용\s*설명|뭐\s*할\s*수|기능\s*알려/.test(t)) {
    return {
      domain: 'help',
      requiresTool: false,
      useLlmReply: true,
      entities: {},
      reason: 'help_prefer_llm',
      confidence: 0.7,
    }
  }

  if (/아까|방금|그거|그것|두\s*번째|두번째|왜\?|다른\s*방법|조금\s*더\s*싸/.test(t)) {
    return {
      domain: 'memory',
      requiresTool: false,
      useLlmReply: true,
      entities: { query: t },
      reason: 'anaphora_or_followup',
      confidence: 0.7,
    }
  }

  // Default: conversational — Hybrid LLM when available
  return {
    domain: 'chat',
    requiresTool: false,
    useLlmReply: true,
    entities: {},
    reason: 'general_chat',
    confidence: 0.6,
  }
}
