import { upcomingAssignments } from './assignments'
import { findCourseByName, listCourses } from './courses'
import { upcomingExams } from './exams'
import { formatDateKo, formatDDayLabel } from './id'
import { buildSmartReview } from './review'
import { loadCampusStore } from './storage'
import { todaySessions } from './timetable'

export type CampusHomeModel = {
  greeting: string
  dateLine: string
  classes: Array<{ time: string; name: string; room: string; courseId: string }>
  todos: Array<{ label: string; kind: string; id: string }>
  upcoming: Array<{ label: string; dDay: number | null }>
  aiCard: string | null
  empty: boolean
  onboarded: boolean
}

export function buildCampusHome(displayName = '', now = new Date()): CampusHomeModel {
  const store = loadCampusStore()
  const name = displayName.trim()
  const greeting = name ? `안녕하세요, ${/님$/.test(name) ? name : `${name}님`}` : '안녕하세요'
  const classes = todaySessions(now).map((x) => ({
    time: x.session.startTime,
    name: x.course!.name,
    room: x.session.room || x.course!.room || '',
    courseId: x.course!.id,
  }))
  const asg = upcomingAssignments(8)
  const todos: CampusHomeModel['todos'] = []
  for (const a of asg.slice(0, 5)) {
    const dd = a.dDay
    const due =
      dd === null ? '' : dd === 0 ? ' · D-Day' : dd < 0 ? ` · ${Math.abs(dd)}일 지남` : ` · D-${dd}`
    todos.push({
      label: `${a.course?.name || '과목'} ${a.assignment.title}${due}`,
      kind: 'assignment',
      id: a.assignment.id,
    })
  }
  const review = buildSmartReview(3, now)
  for (const r of review.slice(0, 2)) {
    if (todos.length >= 6) break
    todos.push({
      label: `${r.courseName} · ${r.title} (${r.minutes}분)`,
      kind: 'review',
      id: r.id,
    })
  }

  const exams = upcomingExams(5)
  const upcoming = exams.map((e) => ({
    label: `${e.course?.name || '과목'} ${e.exam.name}`,
    dDay: e.dDay,
  }))

  let aiCard: string | null = null
  if (review[0]) {
    aiCard = `오늘 ${review[0].courseName} 「${review[0].title}」을 ${review[0].minutes}분 복습하면 좋습니다.`
  } else if (classes[0]) {
    aiCard = `오늘 ${classes[0].name} 수업이 ${classes[0].time}에 있습니다.`
  }

  return {
    greeting,
    dateLine: formatDateKo(now),
    classes,
    todos,
    upcoming,
    aiCard,
    empty: listCourses().length === 0,
    onboarded: Boolean(store.profile.onboardedAt),
  }
}

export function formatTodayClassesText(now = new Date()): string {
  const rows = todaySessions(now)
  if (!rows.length) return '오늘 등록된 수업이 없습니다.'
  return [
    '【오늘 수업】',
    ...rows.map(
      (r) =>
        `• ${r.session.startTime}–${r.session.endTime} ${r.course!.name}${
          r.session.room ? ` (${r.session.room})` : ''
        }`,
    ),
  ].join('\n')
}

export function formatUrgentText(): string {
  const asg = upcomingAssignments(5)
  const exams = upcomingExams(3)
  if (!asg.length && !exams.length) return '급한 과제/시험이 없습니다. (등록된 항목 기준)'
  const lines = ['【가장 급한 일정】']
  for (const e of exams.slice(0, 2)) {
    lines.push(`• ${e.course?.name || ''} ${e.exam.name} · ${formatDDayLabel(e.dDay, '?')}`)
  }
  for (const a of asg.slice(0, 3)) {
    lines.push(
      `• ${a.course?.name || ''} ${a.assignment.title} · ${formatDDayLabel(a.dDay)}`,
    )
  }
  return lines.join('\n')
}

export function formatCourseAssignments(courseHint: string): string {
  const course = findCourseByName(courseHint)
  if (!course) return `「${courseHint}」과목을 찾지 못했습니다. 먼저 과목을 등록해 주세요.`
  const store = loadCampusStore()
  const rows = store.assignments.filter(
    (a) => a.courseId === course.id && a.confirmed && a.status !== 'DONE',
  )
  if (!rows.length) return `${course.name}에 남은 과제가 없습니다.`
  return [
    `【${course.name} 과제】`,
    ...rows.map((a) => `• ${a.title}${a.dueAt ? ` · ${a.dueAt.slice(0, 10)}` : ''}`),
  ].join('\n')
}
