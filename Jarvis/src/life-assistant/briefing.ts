import { loadReminders } from '../storage'
import { upcomingFamilyEvents } from '../familyStore'
import { listActiveReminders } from '../smartReminder'
import { loadCachedWeather, formatWeatherLine } from '../weather'
import {
  listFamilyHelperSchedules,
  listFamilyMembers,
  listMedications,
  listVaccinations,
} from '../family-helper/store'
import { loadLifeAssistantPrefs, loadParkingMemory } from './storage'
import {
  formatMarketLine,
  loadBriefingLiveCache,
  marketTone,
} from './briefingLive'
import type { LifeBriefing, LifeBriefingItem } from './types'

export function buildLifeBriefing(now = new Date()): LifeBriefing {
  const prefs = loadLifeAssistantPrefs()
  const items: LifeBriefingItem[] = []
  if (!prefs.briefingEnabled) {
    return { title: 'AIZIO 브리핑', items: [], generatedAt: now.getTime() }
  }

  const today = now.toISOString().slice(0, 10)
  const familyEvents = upcomingFamilyEvents(7).filter((e) => e.date >= today).slice(0, 4)
  const helperSched = listFamilyHelperSchedules({ days: 7 }).filter((s) => s.date >= today).slice(0, 5)
  const todos = loadReminders().filter((t) => !t.done).slice(0, 5)
  const reminders = listActiveReminders().slice(0, 4)
  const parking = loadParkingMemory()
  const weather = loadCachedWeather()
  const meds = listMedications(true).slice(0, 3)
  const vax = listVaccinations().filter((v) => !v.done && v.date >= today).slice(0, 2)
  const members = listFamilyMembers()
  const live = loadBriefingLiveCache()

  // Missed (yesterday and earlier unfinished helper schedules)
  const missed = listFamilyHelperSchedules({ days: 0, includeDone: false }).filter(
    (s) => s.date < today && !s.done,
  )

  // Weather first — surface at the top of the briefing strip
  if (weather) {
    items.push({
      id: 'wx',
      kind: 'weather',
      label: weather.place || '날씨',
      detail: formatWeatherLine(weather),
      chatHint: '오늘 날씨 알려줘',
    })
  } else {
    items.push({
      id: 'wx-pending',
      kind: 'weather',
      label: '날씨',
      detail: '위치 허용 후 자동 갱신',
      chatHint: '오늘 날씨 알려줘',
    })
  }

  // KOSPI / KOSDAQ — live or placeholder
  if (live?.markets?.length) {
    for (const m of live.markets) {
      items.push({
        id: `mkt-${m.symbol}`,
        kind: 'market',
        label: m.name,
        detail: formatMarketLine(m),
        tone: marketTone(m),
        targetView: 'invest',
        chatHint: `${m.name} 시세`,
      })
    }
  } else {
    items.push({
      id: 'mkt-pending',
      kind: 'market',
      label: '코스피 · 코스닥',
      detail: '시세 불러오는 중…',
      tone: 'flat',
      targetView: 'invest',
      chatHint: '코스피 시세',
    })
  }

  // Breaking news headlines
  if (live?.news?.length) {
    for (const n of live.news.slice(0, 3)) {
      items.push({
        id: n.id,
        kind: 'news',
        label: '속보',
        detail: n.title,
        href: n.link,
        chatHint: `뉴스 ${n.title}`,
      })
    }
  } else {
    items.push({
      id: 'news-pending',
      kind: 'news',
      label: '뉴스 속보',
      detail: '헤드라인 불러오는 중…',
      chatHint: '오늘 뉴스',
    })
  }

  if (familyEvents.length || helperSched.length) {
    const top = helperSched[0] || familyEvents[0]
    const label =
      helperSched.length || familyEvents.length
        ? `오늘·다가오는 일정 ${helperSched.length + familyEvents.length}건`
        : '일정'
    items.push({
      id: 'cal',
      kind: 'calendar',
      label,
      detail: top
        ? `${'date' in top ? top.date : ''} ${'title' in top ? top.title : ''}`.trim()
        : undefined,
      targetView: 'family-helper',
      chatHint: '오늘 일정 알려줘',
    })
  }

  if (reminders.length) {
    items.push({
      id: 'rem',
      kind: 'reminder',
      label: `가까운 알림 ${reminders.length}건`,
      detail: reminders[0]?.title,
      targetView: 'life',
      chatHint: '알림 목록',
    })
  }

  if (todos.length) {
    items.push({
      id: 'todo',
      kind: 'todo',
      label: `미완료 할 일 ${todos.length}건`,
      detail: todos[0]?.text,
      targetView: 'life',
      chatHint: '오늘 해야 할 일 정리해줘',
    })
  }

  if (familyEvents.length || helperSched.some((s) => s.memberId)) {
    items.push({
      id: 'fam',
      kind: 'family',
      label: '가족 일정',
      detail: helperSched.find((s) => s.memberId)?.title || familyEvents[0]?.title,
      targetView: 'family-helper',
      chatHint: '가족 일정 보여줘',
    })
  }

  // Birthdays / anniversaries this week
  const ann = helperSched.filter((s) => s.category === 'birthday' || s.category === 'anniversary')
  const birthMembers = members.filter((m) => {
    if (!m.birthDate) return false
    const md = m.birthDate.slice(5)
    const todayMd = today.slice(5)
    return md === todayMd
  })
  if (ann.length || birthMembers.length) {
    items.push({
      id: 'ann',
      kind: 'anniversary',
      label: birthMembers.length ? `오늘 생일 · ${birthMembers[0]!.name}` : `기념일 ${ann.length}건`,
      targetView: 'family-helper',
    })
  }

  if (meds.length) {
    items.push({
      id: 'med',
      kind: 'medication',
      label: `약 복용 ${meds.length}건`,
      detail: meds[0]?.name,
      targetView: 'family-helper',
      chatHint: '약 복용 일정',
    })
  }

  if (vax.length) {
    items.push({
      id: 'vax',
      kind: 'anniversary',
      label: `예방접종 · ${vax[0]!.name}`,
      detail: vax[0]!.date,
      targetView: 'family-helper',
    })
  }

  if (missed.length) {
    items.push({
      id: 'miss',
      kind: 'missed',
      label: `놓친 일정 ${missed.length}건`,
      detail: missed[0]?.title,
      targetView: 'family-helper',
      chatHint: '오늘 놓친 일정이 있는지 확인해줘',
    })
  }

  if (parking) {
    items.push({
      id: 'park',
      kind: 'parking',
      label: '주차 위치',
      detail: parking.label,
      chatHint: '내가 주차한 곳 알려줘',
    })
  }

  return {
    title: '오늘의 AIZIO 브리핑',
    items,
    generatedAt: now.getTime(),
  }
}

export function formatBriefingText(brief: LifeBriefing): string {
  if (!brief.items.length) {
    return '오늘은 특별한 브리핑 항목이 없어요. 일정·할 일·주차 위치를 추가하면 여기에 모아요.'
  }
  const lines = [brief.title, '']
  for (const it of brief.items) {
    lines.push(`· ${it.label}${it.detail ? ` — ${it.detail}` : ''}`)
  }
  lines.push('', '항목을 탭하거나 채팅으로 이어서 물어보세요.')
  return lines.join('\n')
}

function chipClass(it: LifeBriefingItem): string {
  const parts = ['life-brief-chip']
  if (it.kind === 'weather') parts.push('life-brief-chip-weather')
  if (it.kind === 'market') {
    parts.push('life-brief-chip-market')
    if (it.tone === 'up') parts.push('up')
    else if (it.tone === 'down') parts.push('down')
  }
  if (it.kind === 'news') parts.push('life-brief-chip-news')
  return parts.join(' ')
}

export function renderBriefingStripHtml(brief: LifeBriefing): string {
  if (!brief.items.length) return ''
  const esc = (s: string) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  const live = loadBriefingLiveCache()
  const ageMin = live?.fetchedAt ? Math.max(0, Math.floor((Date.now() - live.fetchedAt) / 60_000)) : null
  const liveNote =
    ageMin == null ? '실시간 갱신' : ageMin < 1 ? '방금 갱신' : `${ageMin}분 전 갱신`
  return `
    <section class="life-brief-strip" data-life-brief="1" aria-label="오늘의 AIZIO 브리핑">
      <div class="life-brief-head">
        <strong>${esc(brief.title)}</strong>
        <span class="life-brief-live" data-brief-live-age="1">${esc(liveNote)}</span>
        <button type="button" class="ghost-btn tiny" data-action="life-brief-refresh">새로고침</button>
      </div>
      <div class="life-brief-items">
        ${brief.items
          .map(
            (it) => `
          <button type="button" class="${chipClass(it)}" data-action="life-brief-item"
            data-brief-id="${esc(it.id)}"
            data-brief-view="${esc(it.targetView || '')}"
            data-brief-hint="${esc(it.chatHint || '')}"
            data-brief-href="${esc(it.href || '')}">
            <span class="life-brief-chip-l">${esc(it.label)}</span>
            ${it.detail ? `<span class="life-brief-chip-d">${esc(it.detail)}</span>` : ''}
          </button>`,
          )
          .join('')}
      </div>
    </section>
  `
}
