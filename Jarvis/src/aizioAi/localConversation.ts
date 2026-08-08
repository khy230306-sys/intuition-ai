/**
 * Built-in AIZIO conversation — works without user-pasted API keys.
 * Cloud Hybrid AI remains an optional upgrade when a backend/provider exists.
 */

import { hasAnyConfiguredProvider } from '../ai-providers'
import { answerEncyclopedia } from '../encyclopedia/encyclopediaEngine'
import { isKnowledgeQuestion } from '../encyclopedia/queryParse'

export type ChatTurn = { role: string; text: string }

const JOKES = [
  '왜 컴퓨터는 춥대요? … 윈도우를 열어 놔서래요. 😄',
  '개발자가 카페에서 주문하면? … 「커피 한 잔, 버그 없이 주세요.」',
  'AI에게 비밀을 말하면? … 모델이 기억해요. 저는 여기 대화에만 남겨둘게요.',
  '토마토가 빨개진 이유는? … 케첩을 봐서래요!',
]

function lastUserTopics(history: ChatTurn[]): string {
  const recent = history
    .filter((h) => h.role === 'user' || h.role === 'assistant')
    .slice(-4)
    .map((h) => h.text.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  return recent.join(' · ').slice(0, 200)
}

function isGreeting(t: string): boolean {
  return /^(안녕(하세요|하십니까)?|하이+|헬로|hello|hi|반가워|반갑)[\s!?.~ㅋㅎ]*$/i.test(t.trim())
}

function wantsJoke(t: string): boolean {
  return /농담|웃긴|재밌는\s*얘기|개그|웃겨|조크|joke/i.test(t)
}

function wantsIdentity(t: string): boolean {
  return /너\s*누구|너는\s*누구|자기소개|뭐\s*하는\s*애|AIZIO\s*뭐|아이지오\s*뭐|챗\s*지피티|chatgpt|너\s*AI/i.test(
    t,
  )
}

function wantsHowToHelp(t: string): boolean {
  return /뭐\s*할\s*수|뭘\s*해|무엇을\s*도와|기능\s*뭐|할\s*수\s*있|도와줘\s*\?|도움/i.test(t) &&
    !/도움말/.test(t)
}

function isOpinionOrEmotion(t: string): boolean {
  return /심심|피곤|우울|행복|좋아|싫어|짜증|불안|외로|기대|걱정|사랑|고마|감사|기분|힘들어|괜찮아/i.test(
    t,
  )
}

function isOpenQuestion(t: string): boolean {
  return (
    /[?？]|뭐야|뭔가요|어떻게|왜\s|언제|어디|누구|알려줘|설명해|생각\s*해|어때|할까|할까\?|추천해|조언/i.test(
      t,
    ) || isKnowledgeQuestion(t)
  )
}

function continuityLine(history: ChatTurn[]): string {
  const topics = lastUserTopics(history)
  if (!topics || topics.length < 4) return ''
  if (/안녕|하이|헬로/i.test(topics) && topics.length < 20) return ''
  return ''
}

/**
 * Always returns a conversational reply for readable user text.
 * Never pitches stocks/briefing unless the user asked.
 */
export async function aizioLocalChat(input: {
  text: string
  history?: ChatTurn[]
  displayName?: string
}): Promise<{ text: string; speak: boolean }> {
  const text = (input.text || '').trim()
  const name = input.displayName || '주인님'
  const history = input.history || []
  const cont = continuityLine(history)

  if (!text) {
    return { text: `네, ${name}. 편하게 말씀해 주세요.`, speak: true }
  }

  if (isGreeting(text)) {
    return {
      text: `안녕하세요, ${name}. 잘 지내셨나요? 오늘 뭐든 편하게 말씀해 주세요.`,
      speak: true,
    }
  }

  if (wantsIdentity(text)) {
    const aiLine = hasAnyConfiguredProvider()
      ? '지금은 연결된 AI로 질문·조언·아이디어까지 더 자유롭게 도와드릴 수 있어요.'
      : '별도로 API 키를 넣지 않아도 기본 대화는 가능해요. 설정에서 AI를 연결하면 더 깊게 도와드릴 수 있어요.'
    return {
      text: [
        `저는 ${name}의 생활 비서 AIZIO예요.`,
        aiLine,
        '날씨·일정·번역·할 일 같은 일도 말로 부탁해 주세요. 궁금한 것부터 편하게 물어봐요.',
      ].join(' '),
      speak: true,
    }
  }

  if (wantsJoke(text)) {
    const joke = JOKES[Math.floor(Math.random() * JOKES.length)]
    return { text: joke, speak: true }
  }

  // Travel/booking howto — answer with steps, never start slot-filling
  if (
    /(예약하는\s*방법|예약하는\s*법|어떻게\s*예약|예약\s*방법|어떻게\s*사|사는\s*(법|방법)|어떻게\s*예매|예매\s*(법|방법)|여행\s*팁|팁\s*알려)/.test(
      text,
    ) &&
    /(비행|항공|호텔|여행|표)/.test(text)
  ) {
    return {
      text: [
        '【여행·예약 팁 (참고)】',
        '1. 출발지·도착지·날짜·인원을 먼저 정해요.',
        '2. 네이버·구글 항공권, 카약, 스카이스캐너 등으로 가격을 비교해요.',
        '3. 항공사·호텔 공식 사이트에서 조건(수하물·취소)을 확인하고 결제해요.',
        '4. 예약 확인 메일·전자탑승권을 저장해 두세요.',
        '',
        '실제 검색이 필요하면 「인천에서 도쿄 비행기 찾아줘」처럼 말해 주세요.',
      ].join('\n'),
      speak: true,
    }
  }

  if (isOpinionOrEmotion(text)) {
    if (/고마|감사/i.test(text)) {
      return { text: `천만에요, ${name}. 언제든 불러 주세요.`, speak: true }
    }
    if (/사랑/i.test(text)) {
      return { text: `저도 ${name}과 이야기하는 시간이 좋아요. 필요하면 바로 옆에 있을게요.`, speak: true }
    }
    if (/심심/i.test(text)) {
      return {
        text: `심심하시군요. 가벼운 이야기해도 좋고, 농담·음악·할 일 정리도 같이할 수 있어요. 뭐가 끌리세요?`,
        speak: true,
      }
    }
    if (/피곤|힘들|우울|짜증|불안|외로/i.test(text)) {
      return {
        text: `그런 기분이 들 수 있죠. 잠깐 쉬어도 괜찮아요. 들어드릴 테니 편하게 말해 주세요. ${name} 편하신 속도로요.`,
        speak: true,
      }
    }
    if (/행복|좋아|기대|괜찮아/i.test(text)) {
      return { text: `그 마음 들리네요. 좋은 기운이 더 이어지면 좋겠어요. 이어서 이야기할까요?`, speak: true }
    }
  }

  if (wantsHowToHelp(text)) {
    return {
      text: [
        `${name}, 저는 이렇게 도울 수 있어요.`,
        '· 그냥 대화하기 (지금처럼)',
        '· 날씨, 시간, 할 일, 알림, 번역',
        '· 맛집·여행 준비, 길 안내, 간단한 지식 질문',
        '원하는 걸 평소 말하듯 해 주세요. 예: 「나트랑 맛집 찾아줘」, 「영어로 번역해줘」',
      ].join('\n'),
      speak: true,
    }
  }

  // Knowledge / open questions — try encyclopedia, then conversational framing
  if (isOpenQuestion(text) || isKnowledgeQuestion(text)) {
    try {
      const wiki = await answerEncyclopedia(text)
      if (wiki && wiki.trim().length > 20) {
        return { text: wiki.trim(), speak: true }
      }
    } catch {
      /* fall through */
    }

    if (/생각|어때|할까|추천|조언|고민/i.test(text)) {
      return {
        text: [
          `${name} 입장에서 같이 정리해 볼게요.`,
          '상황을 조금만 더 알려주시면 더 구체적으로 도와드릴 수 있어요.',
          '예: 예산, 날짜, 선호, 꼭 피하고 싶은 것.',
          cont ? `(앞에서 나눈 이야기: ${cont.slice(0, 80)})` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        speak: true,
      }
    }

    return {
      text: [
        `「${text.slice(0, 40)}${text.length > 40 ? '…' : ''}」에 대해 같이 생각해 볼게요.`,
        '지금 바로 답을 단정하긴 어렵지만, 원하시면 핵심만 짧게 정리하거나 단계별로 도와드릴게요.',
        '어떤 방식이 편하세요? (짧게 / 자세히 / 할 일으로 나누기)',
      ].join('\n'),
      speak: true,
    }
  }

  // Default: stay in conversation — never dump stock/briefing pitches
  return {
    text: [
      `네, ${name}. 「${text.slice(0, 48)}${text.length > 48 ? '…' : ''}」 말씀 이해했어요.`,
      '이어서 편하게 이야기해 주세요. 필요하면 제가 질문으로 맞춰 볼게요.',
    ].join(' '),
    speak: true,
  }
}

/** True when text looks like something a chat AI should answer (not empty/garbage). */
export function shouldUseAizioLocalChat(text: string): boolean {
  const t = text.trim()
  if (!t || t.length > 800) return false
  if (!/[가-힣a-zA-Z]{2,}/.test(t)) return false
  return true
}
