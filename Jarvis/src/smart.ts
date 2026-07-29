import {
  expenseTotals,
  habitsDueToday,
  loadHoldings,
  loadProfile,
  loadReminders,
  loadSettings,
  loadShopping,
  loadWatchlist,
} from './storage'

const HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': '신정',
  '2026-02-16': '설날 연휴',
  '2026-02-17': '설날',
  '2026-02-18': '설날 연휴',
  '2026-03-01': '삼일절',
  '2026-05-05': '어린이날',
  '2026-05-24': '부처님오신날',
  '2026-06-06': '현충일',
  '2026-08-15': '광복절',
  '2026-09-24': '추석 연휴',
  '2026-09-25': '추석',
  '2026-09-26': '추석 연휴',
  '2026-10-03': '개천절',
  '2026-10-09': '한글날',
  '2026-12-25': '크리스마스',
}

export function nowText(): string {
  const d = new Date()
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const date = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return `${date} ${time}`
}

export function holidayToday(): string | null {
  const d = new Date()
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return HOLIDAYS_2026[key] || null
}

export function nextHoliday(): string {
  const now = new Date()
  const entries = Object.entries(HOLIDAYS_2026)
  for (const [key, name] of entries) {
    const [y, m, day] = key.split('-').map(Number)
    const dt = new Date(y, m - 1, day)
    if (dt >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      const diff = Math.round((dt.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000)
      return `${name} (${key}) · D-${diff}`
    }
  }
  return '등록된 다음 공휴일 정보가 없습니다.'
}

export function safeEvalMath(expr: string): number | null {
  const cleaned = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/x/gi, '*')
    .replace(/,/g, '')
    .replace(/[^0-9+\-*/().%\s]/g, '')
    .trim()
  if (!cleaned || !/^[\d+\-*/().%\s]+$/.test(cleaned)) return null
  try {
    const result = Function(`"use strict"; return (${cleaned})`)() as number
    return typeof result === 'number' && Number.isFinite(result) ? result : null
  } catch {
    return null
  }
}

export function convertUnit(text: string): string | null {
  const t = text.replace(/,/g, '')
  let m = t.match(/([\d.]+)\s*(kg|킬로|키로)\s*(을|를|은|는)?\s*(lb|파운드)?/i)
  if (m && /lb|파운드|변환|몇/i.test(t)) return `${m[1]} kg = ${(parseFloat(m[1]) * 2.20462).toFixed(2)} lb`
  m = t.match(/([\d.]+)\s*(lb|파운드)/i)
  if (m && /kg|킬로|변환/i.test(t)) return `${m[1]} lb = ${(parseFloat(m[1]) / 2.20462).toFixed(2)} kg`
  m = t.match(/([\d.]+)\s*(°?c|섭씨)/i)
  if (m && /화씨|f\b|변환/i.test(t)) return `${m[1]}°C = ${((parseFloat(m[1]) * 9) / 5 + 32).toFixed(1)}°F`
  m = t.match(/([\d.]+)\s*(°?f|화씨)/i)
  if (m && /섭씨|c\b|변환/i.test(t)) return `${m[1]}°F = ${(((parseFloat(m[1]) - 32) * 5) / 9).toFixed(1)}°C`
  m = t.match(/([\d.]+)\s*(km|킬로미터)/i)
  if (m && /마일|mile|변환/i.test(t)) return `${m[1]} km = ${(parseFloat(m[1]) * 0.621371).toFixed(2)} mi`
  m = t.match(/([\d.]+)\s*(mi|마일)/i)
  if (m && /km|킬로|변환/i.test(t)) return `${m[1]} mi = ${(parseFloat(m[1]) / 0.621371).toFixed(2)} km`
  m = t.match(/([\d.]+)\s*(달러|불|\$)/)
  if (m && /원|환율/i.test(t)) {
    const rate = 1350
    return `${m[1]} USD ≈ ${Math.round(parseFloat(m[1]) * rate).toLocaleString('ko-KR')}원 (가정환율 ${rate}원, 실제와 다를 수 있음)`
  }
  return null
}

export function tipSplit(text: string): string | null {
  const bill = text.match(/([\d,]+)\s*원/)
  const people = text.match(/(\d+)\s*명/)
  const tip = text.match(/팁\s*(\d+)\s*%/) || text.match(/(\d+)\s*%/)
  if (!bill) return null
  if (!/더치|나누|팁|분할/i.test(text)) return null
  const amount = parseFloat(bill[1].replace(/,/g, ''))
  const n = people ? parseInt(people[1], 10) : 1
  const tipPct = tip ? parseInt(tip[1], 10) : 0
  const total = amount * (1 + tipPct / 100)
  return [
    `금액 ${amount.toLocaleString('ko-KR')}원` + (tipPct ? ` + 팁 ${tipPct}%` : ''),
    `총 ${Math.round(total).toLocaleString('ko-KR')}원`,
    n > 1 ? `1인당 ${Math.round(total / n).toLocaleString('ko-KR')}원 (${n}명)` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function mealIdea(hour = new Date().getHours()): string {
  if (hour < 10) return '아침 제안: 계란+채소, 요거트+과일, 또는 오트밀. 물 한 잔부터.'
  if (hour < 15) return '점심 제안: 단백질(닭/두부/생선)+채소 위주. 과식 대신 산책 10분.'
  if (hour < 21) return '저녁 제안: 가벼운 한식(생선구이·된장찌개·샐러드). 취침 3시간 전 과식 피하기.'
  return '야식 대신: 따뜻한 차, 바나나, 또는 단백질 쉐이크. 수면이 내일의 수익입니다.'
}

export function morningBriefing(): string {
  const settings = loadSettings()
  const profile = loadProfile()
  const name = settings.displayName
  const holiday = holidayToday()
  const reminders = loadReminders().filter((r) => !r.done).slice(0, 5)
  const shopping = loadShopping().filter((s) => !s.done).slice(0, 5)
  const habits = habitsDueToday().slice(0, 5)
  const spend = expenseTotals()
  const holdings = loadHoldings()
  const watch = loadWatchlist()
  const hour = new Date().getHours()
  const greet = hour < 12 ? '좋은 아침입니다' : hour < 18 ? '안녕하세요' : '좋은 저녁입니다'

  return [
    `${greet}, ${name}.`,
    `지금 ${nowText()}`,
    holiday ? `오늘은 ${holiday}입니다.` : '',
    `도시: ${settings.city || profile.city} · 포커스: ${profile.focus}`,
    '',
    '— 오늘 할 일 —',
    reminders.length ? reminders.map((r, i) => `${i + 1}. ${r.text}`).join('\n') : '등록된 할 일 없음',
    '',
    '— 습관 —',
    habits.length ? habits.map((h) => `○ ${h.name}`).join('\n') : '오늘 습관 완료 또는 없음',
    shopping.length ? `\n장바구니: ${shopping.map((s) => s.name).join(', ')}` : '',
    `\n오늘 지출 ${spend.today.toLocaleString('ko-KR')}원 · 이번달 ${spend.month.toLocaleString('ko-KR')}원`,
    holdings.length || watch.length
      ? `\n투자: 보유 ${holdings.length}종목 · 관심 ${watch.length}종목 · "포트폴리오" / "시세 삼성전자"로 확인`
      : '\n투자: "관심종목 삼성전자 추가"로 워치리스트를 시작하세요',
    '',
    mealIdea(hour),
    '면책: 투자/건강 정보는 참고용이며 전문 자문이 아닙니다.',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

export function decide(optionsText: string): string {
  const parts = optionsText
    .split(/[,/]|또는|vs|VS|랑|와|과/)
    .map((s) => s.replace(/골라|선택|중에|중에서|뭐가\s*나아|추천/g, '').trim())
    .filter((s) => s.length > 0)
  if (parts.length < 2) {
    return Math.random() < 0.5 ? '앞면' : '뒷면'
  }
  const pick = parts[Math.floor(Math.random() * parts.length)]
  return `선택지 ${parts.length}개 중 JARVIS 추천: 「${pick}」\n최종 결정은 ${loadSettings().displayName}의 몫입니다.`
}
