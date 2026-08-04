import type { CoreIntent } from './types'

const LANG_MAP: Array<{ re: RegExp; code: string }> = [
  { re: /한국어|한글|korean/i, code: 'ko' },
  { re: /영어|english/i, code: 'en' },
  { re: /일본어|japanese|日本語/i, code: 'ja' },
  { re: /베트남어|vietnamese|tiếng\s*việt/i, code: 'vi' },
  { re: /중국어|chinese|中文/i, code: 'zh' },
  { re: /스페인어|spanish/i, code: 'es' },
  { re: /프랑스어|french/i, code: 'fr' },
]

export function extractEntities(text: string, intent: CoreIntent): Record<string, unknown> {
  const entities: Record<string, unknown> = {}
  const t = text.trim()

  if (intent === 'translate' || /번역|통역/.test(t)) {
    for (const { re, code } of LANG_MAP) {
      if (re.test(t)) {
        entities.targetLanguage = code
        break
      }
    }
  }

  if (intent === 'play_music' || intent === 'control_music') {
    if (/조용|잔잔|차분|calm|quiet/i.test(t)) entities.mood = 'calm'
    if (/신나|업비트|upbeat|happy/i.test(t)) entities.mood = 'upbeat'
    if (/비\s*오|빗소리|rain/i.test(t)) entities.context = 'rainy-day'
    if (/집중|공부|focus|study/i.test(t)) entities.mood = 'focus'
    if (/수면|잠|sleep/i.test(t)) entities.mood = 'sleep'
    if (/운동|헬스|workout/i.test(t)) entities.mood = 'workout'
    if (/멈춰|중지|stop|pause|일시\s*정지/i.test(t)) entities.control = 'stop'
    if (/다음\s*곡|next/i.test(t)) entities.control = 'next'
    if (/볼륨.*(낮|줄)|volume\s*down/i.test(t)) entities.control = 'volume_down'
    if (/볼륨.*(높|키)|volume\s*up/i.test(t)) entities.control = 'volume_up'
  }

  if (intent === 'create_calendar_event' || intent === 'list_calendar') {
    const date =
      t.match(/(오늘|내일|모레|이번\s*주|다음\s*주|월요일|화요일|수요일|목요일|금요일|토요일|일요일)/)?.[1] ||
      t.match(/(\d{1,2}\s*월\s*\d{1,2}\s*일)/)?.[1]
    if (date) entities.date = date.replace(/\s+/g, '')
    const time =
      t.match(/(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/) ||
      t.match(/(\d{1,2}):(\d{2})/)
    if (time) {
      if (time[0].includes(':')) {
        entities.time = time[0]
      } else {
        let h = Number(time[2])
        const m = time[3] ? Number(time[3]) : 0
        if (time[1] === '오후' && h < 12) h += 12
        if (time[1] === '오전' && h === 12) h = 0
        entities.time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      }
    }
    const title =
      t.match(/(?:일정|약속|미팅|회의)\s*(.+?)(?:\s*추가|\s*잡아|$)/)?.[1] ||
      t.match(/(.+?)\s*(?:일정|약속)\s*(?:추가|등록)/)?.[1]
    if (title && title.length < 40) entities.title = title.trim()
  }

  if (intent === 'create_note' || intent === 'search_note') {
    const body =
      t.match(/(?:기억해|메모해|메모해줘|기억해줘)\s*(.+)$/i)?.[1] ||
      t.match(/^(.+?)(?:을|를)?\s*(?:기억해|기억해줘|메모해)$/i)?.[1]
    if (body) entities.body = body.trim()
    const q = t.match(/(?:메모|기억)\s*(?:보여|목록|찾아|검색)?\s*(.*)$/i)?.[1]
    if (q && !/보여|목록/.test(q)) entities.query = q.trim()
  }

  if (intent === 'create_todo' || intent === 'list_todo' || intent === 'update_todo') {
    const item =
      t.match(/(?:할\s*일|리마인더|기억시켜)\s*(.+)$/i)?.[1] ||
      t.match(/^(.+?)\s*(?:할\s*일에\s*넣어|기억시켜)$/i)?.[1]
    if (item && !/목록|보여|리스트/.test(item)) entities.item = item.trim()
  }

  if (intent === 'project_status' || intent === 'project_planning') {
    const name = t.match(/([A-Za-z0-9가-힣_-]{2,24})\s*프로젝트/)?.[1] || t.match(/프로젝트\s*([A-Za-z0-9가-힣_-]{2,24})/)?.[1]
    if (name) entities.projectName = name
    else if (/nexus/i.test(t)) entities.projectName = 'NEXUS'
  }

  if (intent === 'app_navigation' || intent === 'change_setting') {
    if (/설정/.test(t)) entities.view = 'settings'
    if (/투자|시세|포트/.test(t)) entities.view = 'invest'
    if (/생활|라이프/.test(t)) entities.view = 'life'
    if (/가족/.test(t)) entities.view = 'family'
    if (/친구/.test(t)) entities.view = 'friends'
    if (/게임|아케이드/.test(t)) entities.view = 'games'
    if (/액션|바로가기/.test(t)) entities.view = 'actions'
    if (/채팅|대화/.test(t)) entities.view = 'chat'
    if (/손님관리|고객관리|손님\s*목록|고객\s*목록|\bcrm\b/i.test(t)) entities.view = 'customers'
    if (/길안내|내비|네비게이션|내부\s*지도/i.test(t)) entities.view = 'navigation'
  }

  if (intent === 'summarize') {
    entities.mode = 'summarize'
  }

  return entities
}
