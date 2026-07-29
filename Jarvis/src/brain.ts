import {
  callPhone,
  copyText,
  openApp,
  openMail,
  openMaps,
  openSearch,
  openTranslate,
  openWeather,
  resolveAppIntent,
  sendSms,
  shareText,
} from './actions'
import {
  addReminder,
  findMemory,
  loadMemory,
  loadReminders,
  loadSettings,
  upsertMemory,
} from './storage'
import type { BrainReply, JarvisSettings } from './types'

function nowText(): string {
  const d = new Date()
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const date = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return `${date} ${time}`
}

function safeEvalMath(expr: string): number | null {
  const cleaned = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/x/gi, '*')
    .replace(/,/g, '')
    .replace(/[^0-9+\-*/().%\s]/g, '')
    .trim()
  if (!cleaned || !/^[\d+\-*/().%\s]+$/.test(cleaned)) return null
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${cleaned})`)() as number
    return typeof result === 'number' && Number.isFinite(result) ? result : null
  } catch {
    return null
  }
}

function helpText(name: string): string {
  return [
    `${name}, 저는 JARVIS입니다. 이렇게 말해 보세요.`,
    '',
    '• "지금 몇 시야" / "오늘 날짜"',
    '• "12 * 34" / "계산 100+25"',
    '• "기억해 와이파이 비번은 1234"',
    '• "와이파이 비번 뭐였지"',
    '• "내일 장보기 기억시켜" / "할 일 보여줘"',
    '• "유튜브 열어" / "카카오톡 실행"',
    '• "강남역 지도" / "서울 날씨"',
    '• "Hello 영어로 번역" / "검색 아이폰 팁"',
    '• "이 문장 복사해" / "공유해"',
    '',
    '설정에서 OpenAI API 키를 넣으면 더 똑똑한 대화도 가능합니다.',
  ].join('\n')
}

async function callCloudLLM(userText: string, settings: JarvisSettings, history: { role: string; text: string }[]): Promise<string | null> {
  if (!settings.apiKey.trim()) return null
  const base = settings.apiBase.replace(/\/$/, '')
  const messages = [
    {
      role: 'system',
      content:
        `당신은 iPhone용 만능 비서 JARVIS입니다. 사용자 호칭은 "${settings.displayName}"입니다. ` +
        '한국어로 짧고 명확하게 답하고, 실행 가능한 제안을 우선합니다. 불확실한 사실은 추측하지 않습니다.',
    },
    ...history.slice(-12).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.text,
    })),
    { role: 'user', content: userText },
  ]

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-4o-mini',
      messages,
      temperature: 0.5,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`API 오류 (${res.status}): ${errText.slice(0, 180)}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content?.trim() || null
}

export async function think(
  input: string,
  history: { role: string; text: string }[] = [],
): Promise<BrainReply> {
  const text = input.trim()
  const settings = loadSettings()
  const name = settings.displayName || '주인님'
  const lower = text.toLowerCase()

  if (!text) {
    return { text: `${name}, 무엇을 도와드릴까요?` }
  }

  if (/^(도움말|헬프|help|뭐\s*할수|할\s*수\s*있|기능)$/i.test(text) || lower.includes('도움말')) {
    return { text: helpText(name) }
  }

  if (/안녕|하이|헬로|hello|hi\b|좋은\s*(아침|저녁|밤)/i.test(text)) {
    return {
      text: `안녕하세요, ${name}. JARVIS입니다. 명령만 내려 주세요.`,
      speak: true,
    }
  }

  if (/몇\s*시|지금\s*시간|현재\s*시간|시간\s*알려/i.test(text)) {
    return { text: `지금은 ${nowText()}입니다.`, speak: true }
  }

  if (/날짜|오늘\s*며칠|요일/i.test(text)) {
    return { text: `오늘은 ${nowText()}입니다.`, speak: true }
  }

  const calcMatch =
    text.match(/^(?:계산|계산해|계산해줘)\s*(.+)$/i) ||
    text.match(/^([0-9+\-*/().%\s×÷x]+)=?$/i) ||
    text.match(/(.+)\s*(?:얼마야|계산해|계산해줘)$/i)
  if (calcMatch) {
    const result = safeEvalMath(calcMatch[1])
    if (result !== null) {
      return { text: `계산 결과: ${result}`, speak: true }
    }
  }

  const remember =
    text.match(/^(?:기억해|기억해줘|메모해|메모해줘)\s*(.+)$/i) ||
    text.match(/^(.+?)(?:을|를|은|는)?\s*(?:기억해|기억해줘)$/i)
  if (remember) {
    const body = remember[1].trim()
    const parts = body.split(/\s*(?:는|은|:|=)\s*/)
    if (parts.length >= 2) {
      const key = parts[0].trim()
      const value = parts.slice(1).join(' ').trim()
      upsertMemory(key, value)
      return { text: `"${key}" → ${value} 로 기억했습니다.`, speak: true }
    }
    upsertMemory(`메모 ${new Date().toLocaleString('ko-KR')}`, body)
    return { text: `메모로 저장했습니다: ${body}`, speak: true }
  }

  const recall =
    text.match(/^(?:뭐였지|알려줘|찾아줘)\s*(.+)$/i) ||
    text.match(/^(.+?)\s*(?:뭐였지|뭐야|알려줘)$/i) ||
    text.match(/기억(?:에서|한)?\s*(.+)/i)
  if (recall && !/할\s*일|리마인더|목록/.test(text)) {
    const q = recall[1].replace(/기억/g, '').trim()
    const hits = findMemory(q)
    if (hits.length === 0) {
      return { text: `"${q}"에 대한 기억이 없습니다. "기억해 키는 값"처럼 저장해 주세요.` }
    }
    const lines = hits.slice(0, 5).map((h) => `• ${h.key}: ${h.value}`).join('\n')
    return { text: `찾은 기억:\n${lines}`, speak: true }
  }

  const remind =
    text.match(/^(?:리마인더|할\s*일|기억시켜|잊지마)\s*(.+)$/i) ||
    text.match(/^(.+?)\s*(?:기억시켜|리마인더\s*추가|할\s*일에\s*넣어)$/i)
  if (remind) {
    const item = addReminder(remind[1])
    return { text: `할 일에 추가했습니다: ${item.text}`, speak: true }
  }

  if (/할\s*일\s*(목록|보여|리스트)|리마인더\s*(목록|보여)|오늘\s*할\s*일/i.test(text)) {
    const items = loadReminders().filter((r) => !r.done)
    if (items.length === 0) return { text: '남은 할 일이 없습니다.' }
    return {
      text: `할 일 ${items.length}개:\n${items
        .slice(0, 10)
        .map((r, i) => `${i + 1}. ${r.text}`)
        .join('\n')}`,
    }
  }

  if (/기억\s*(목록|보여|리스트)/i.test(text)) {
    const items = loadMemory()
    if (items.length === 0) return { text: '저장된 기억이 없습니다.' }
    return {
      text: items
        .slice(0, 12)
        .map((m) => `• ${m.key}: ${m.value}`)
        .join('\n'),
    }
  }

  const appIntent = resolveAppIntent(text)
  if (appIntent) {
    return {
      text: appIntent.message,
      speak: true,
      action: () => appIntent,
    }
  }

  const mapMatch = text.match(/^(?:지도|길찾기|내비)\s*(.+)$/i) || text.match(/^(.+?)\s*(?:지도|길찾기)$/i)
  if (mapMatch) {
    const q = mapMatch[1].trim()
    return {
      text: `"${q}" 지도를 엽니다.`,
      speak: true,
      action: () => openMaps(q),
    }
  }

  const weatherMatch = text.match(/^(?:날씨)\s*(.*)$/i) || text.match(/^(.+?)\s*날씨$/i)
  if (weatherMatch || /날씨\s*(어때|알려)/i.test(text)) {
    const city = weatherMatch?.[1]?.trim() || ''
    return {
      text: city ? `${city} 날씨를 확인합니다.` : '날씨 정보를 엽니다.',
      speak: true,
      action: () => openWeather(city),
    }
  }

  const searchMatch = text.match(/^(?:검색|찾아|구글)\s*(.+)$/i) || text.match(/^(.+?)\s*검색해(?:줘)?$/i)
  if (searchMatch) {
    const q = searchMatch[1].trim()
    return {
      text: `"${q}" 검색을 엽니다.`,
      speak: true,
      action: () => openSearch(q),
    }
  }

  const translateMatch =
    text.match(/^(?:번역|번역해|영어로)\s*(.+)$/i) ||
    text.match(/^(.+?)\s*(?:번역해|영어로\s*번역|번역)$/i)
  if (translateMatch) {
    const q = translateMatch[1].replace(/영어로/g, '').trim()
    return {
      text: '번역을 엽니다.',
      speak: true,
      action: () => openTranslate(q, /일본|japanese/i.test(text) ? 'ja' : /중국|chinese/i.test(text) ? 'zh-CN' : 'en'),
    }
  }

  const phoneMatch = text.match(/(?:전화|콜)\s*([0-9+\- ]{4,})/i)
  if (phoneMatch) {
    const num = phoneMatch[1]
    return {
      text: `${num}로 전화를 겁니다.`,
      speak: true,
      action: () => callPhone(num),
    }
  }

  const smsMatch = text.match(/(?:문자|메시지)\s*([0-9+\- ]{4,})\s*(.*)$/i)
  if (smsMatch) {
    return {
      text: '문자 작성 화면을 엽니다.',
      speak: true,
      action: () => sendSms(smsMatch[1], smsMatch[2] || ''),
    }
  }

  const mailMatch = text.match(/(?:메일|이메일)\s*([^\s]+@[^\s]+)\s*(.*)$/i)
  if (mailMatch) {
    return {
      text: '메일 작성 화면을 엽니다.',
      speak: true,
      action: () => openMail(mailMatch[1], '', mailMatch[2] || ''),
    }
  }

  if (/복사해|클립보드/i.test(text)) {
    const payload = text.replace(/^(?:이거|이걸|이것을)?\s*(?:복사해|복사해줘|클립보드에\s*넣어)\s*/i, '').trim() || text
    return {
      text: '클립보드에 복사합니다.',
      action: () => copyText(payload),
    }
  }

  if (/공유해|공유\s*해/i.test(text)) {
    const payload = text.replace(/공유해(?:줘)?/gi, '').trim() || text
    return {
      text: '공유 시트를 엽니다.',
      action: () => shareText(payload),
    }
  }

  if (/유튜브|youtube/i.test(text) && /열어|실행|켜|보여/i.test(text)) {
    return {
      text: 'YouTube를 엽니다.',
      speak: true,
      action: () => openApp('유튜브'),
    }
  }

  // Cloud LLM fallback when API key is set
  if (settings.apiKey.trim()) {
    try {
      const cloud = await callCloudLLM(text, settings, history)
      if (cloud) return { text: cloud, speak: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'API 호출 실패'
      return {
        text: `${msg}\n\n로컬 비서로는 도움말, 계산, 기억, 앱 실행 등을 바로 쓸 수 있습니다. "도움말"이라고 말해 보세요.`,
      }
    }
  }

  return {
    text: [
      `명령을 정확히 이해하지 못했습니다.`,
      `예: "유튜브 열어", "기억해 비밀번호는 1234", "계산 25*4", "할 일 장보기"`,
      settings.apiKey.trim() ? '' : '설정에서 API 키를 넣으면 자유 대화도 가능합니다.',
      `"도움말"을 입력하면 전체 기능을 볼 수 있습니다.`,
    ]
      .filter(Boolean)
      .join('\n'),
  }
}
