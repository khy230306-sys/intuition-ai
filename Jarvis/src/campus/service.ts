/**
 * Campus conversation/tool service — real data only, no invented schedules.
 */

import { thisWeekAssignments, upcomingAssignments } from './assignments'
import { draftProfessorEmail, generateQuizFromSources } from './ai/campusAi'
import { createCourse, ensureActiveSemester, findCourseByName, listCourses } from './courses'
import { upcomingExams } from './exams'
import { focusStats } from './focus'
import { computeGpa } from './gpa'
import {
  buildCampusHome,
  formatCourseAssignments,
  formatTodayClassesText,
  formatUrgentText,
} from './home'
import type { CampusIntent } from './nlu/campusIntent'
import { getCampusProfile } from './profile'
import { buildSmartReview } from './review'
import { searchCampus } from './search'
import { loadCampusStore } from './storage'
import { buildDeterministicStudyPlan, formatStudyPlan } from './studyPlan'
import { addClassSession, weekSessions } from './timetable'
import { WEEKDAY_FULL_KO } from './types'

export type CampusToolResult = {
  message: string
  openCampus?: boolean
  quizId?: string
  speak?: boolean
}

export function applyTimetableAdd(parsed: NonNullable<CampusIntent['timetable']>): CampusToolResult {
  ensureActiveSemester()
  let course = findCourseByName(parsed.courseName)
  if (!course) {
    course = createCourse({
      name: parsed.courseName,
      professor: parsed.professor,
      room: parsed.room,
    })
  }
  const { session, conflicts } = addClassSession({
    courseId: course.id,
    weekday: parsed.weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    startTime: parsed.startTime,
    endTime: parsed.endTime,
    room: parsed.room || course.room,
  })
  const conflictNote = conflicts.length
    ? `\n⚠ 시간 충돌 ${conflicts.length}건: ${conflicts
        .map((c) => `${c.courseA} ↔ ${c.courseB}`)
        .join(', ')}`
    : ''
  return {
    message: `${WEEKDAY_FULL_KO[session.weekday]} ${session.startTime}–${session.endTime} 「${course.name}」 수업을 시간표에 저장했습니다.${conflictNote}`,
    openCampus: true,
    speak: true,
  }
}

export async function executeCampusIntent(intent: CampusIntent): Promise<CampusToolResult> {
  switch (intent.kind) {
    case 'open_campus':
      return { message: 'AIZIO CAMPUS를 엽니다.', openCampus: true, speak: true }
    case 'campus_today':
      return { message: formatTodayClassesText(), speak: true }
    case 'campus_timetable_list': {
      const rows = weekSessions()
      if (!rows.length) {
        return {
          message: '등록된 시간표가 없습니다. 「월요일 10시부터 11시 반까지 자료구조 수업 넣어줘」처럼 말해 보세요.',
          openCampus: true,
        }
      }
      return {
        message: [
          '【시간표】',
          ...rows.map(
            (r) =>
              `• ${WEEKDAY_FULL_KO[r.session.weekday]} ${r.session.startTime}-${r.session.endTime} ${r.course!.name}`,
          ),
        ].join('\n'),
        openCampus: true,
      }
    }
    case 'campus_timetable_add':
      if (!intent.timetable) {
        return { message: '요일·시작/종료 시간·과목명을 포함해 다시 말해 주세요.' }
      }
      return applyTimetableAdd(intent.timetable)
    case 'campus_assignments': {
      if (intent.courseHint) return { message: formatCourseAssignments(intent.courseHint) }
      const rows = thisWeekAssignments()
      if (!rows.length) {
        const all = upcomingAssignments(8)
        if (!all.length) return { message: '등록된 과제가 없습니다.' }
        return {
          message: [
            '【과제】',
            ...all.map(
              (a) =>
                `• ${a.course?.name || ''} ${a.assignment.title}${
                  a.dDay === null ? '' : ` · D-${a.dDay}`
                }`,
            ),
          ].join('\n'),
        }
      }
      return {
        message: [
          '【이번 주 과제】',
          ...rows.map(
            (a) =>
              `• ${a.course?.name || ''} ${a.assignment.title}${
                a.dDay === null ? '' : ` · D-${a.dDay}`
              }`,
          ),
        ].join('\n'),
      }
    }
    case 'campus_exams': {
      const exams = upcomingExams(8)
      if (!exams.length) return { message: '등록된 시험이 없습니다.' }
      return {
        message: [
          '【시험】',
          ...exams.map(
            (e) => `• ${e.course?.name || ''} ${e.exam.name} · D-${e.dDay ?? '?'}`,
          ),
        ].join('\n'),
      }
    }
    case 'campus_urgent':
      return { message: formatUrgentText() }
    case 'campus_summary': {
      const store = loadCampusStore()
      const course = intent.courseHint ? findCourseByName(intent.courseHint) : store.courses[0]
      if (!course) return { message: '과목이 없습니다. 먼저 시간표를 등록해 주세요.' }
      const note = store.notes.find((n) => n.courseId === course.id)
      if (!note) {
        return {
          message: `${course.name} 저장된 강의 요약이 없습니다. 녹음→transcript→AI 정리 후 다시 물어봐 주세요.`,
        }
      }
      return {
        message: [
          `【${course.name} · ${note.title}】`,
          note.threeLine || note.fullSummary.slice(0, 400),
          note.concepts.length ? `핵심: ${note.concepts.slice(0, 8).join(', ')}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      }
    }
    case 'campus_quiz':
    case 'campus_quiz_wrong': {
      const course =
        (intent.courseHint && findCourseByName(intent.courseHint)) || listCourses()[0]
      if (!course) return { message: '과목이 없습니다.' }
      const res = await generateQuizFromSources({
        courseId: course.id,
        count: intent.count || 5,
        wrongOnly: intent.kind === 'campus_quiz_wrong',
      })
      return {
        message: res.message,
        quizId: res.quizId,
        openCampus: Boolean(res.quizId),
      }
    }
    case 'campus_review': {
      const items = buildSmartReview(5)
      if (!items.length) return { message: '복습 추천을 만들 데이터가 아직 없습니다.' }
      return {
        message: [
          '【오늘 추천 복습】',
          ...items.map(
            (r, i) =>
              `${i + 1}. ${r.courseName} · ${r.title} · ${r.minutes}분 (${r.reasons.join(', ')})`,
          ),
        ].join('\n'),
        openCampus: true,
      }
    }
    case 'campus_study_plan': {
      const course =
        (intent.courseHint && findCourseByName(intent.courseHint)) || listCourses()[0]
      if (!course) return { message: '과목이 없습니다.' }
      const plan = buildDeterministicStudyPlan({
        courseId: course.id,
        days: intent.days || 10,
      })
      return { message: formatStudyPlan(plan), openCampus: true }
    }
    case 'campus_email':
      return draftProfessorEmail(intent.emailRequest || '정중한 이메일 초안')
    case 'campus_search': {
      const hits = searchCampus(intent.query || '')
      if (!hits.length) return { message: `「${intent.query}」검색 결과가 없습니다.` }
      return {
        message: [
          `【검색: ${intent.query}】`,
          ...hits.slice(0, 12).map((h) => `• [${h.kind}] ${h.title} — ${h.subtitle}`),
        ].join('\n'),
      }
    }
    case 'campus_focus': {
      const stats = focusStats()
      return {
        message: `집중 공부 통계 — 오늘 ${stats.today}분 · 이번 주 ${stats.week}분. CAMPUS 공부 탭에서 타이머를 시작하세요.`,
        openCampus: true,
      }
    }
    case 'campus_gpa': {
      const store = loadCampusStore()
      const g = computeGpa(store.courses, store.profile.gradeScale)
      if (g.gpa === null) {
        return { message: '성적이 입력된 과목이 없습니다. CAMPUS 더보기 → 학점에서 입력하세요.' }
      }
      return {
        message: `GPA ${g.gpa} / ${store.profile.gradeScale} · 이수학점 ${g.earnedCredits}`,
      }
    }
    default:
      return { message: 'Campus에서 처리할 수 없는 요청입니다.' }
  }
}

export function campusHomeSummaryLine(): string {
  const home = buildCampusHome()
  if (home.empty) return 'Campus: 첫 과목을 등록해 보세요'
  return `Campus: 오늘 수업 ${home.classes.length} · 할 일 ${home.todos.length}`
}

export function ensureCampusReady(): void {
  const p = getCampusProfile()
  if (!p.onboardedAt && listCourses().length === 0) {
    // do not auto-create fake courses; only ensure semester when user starts
    return
  }
  ensureActiveSemester()
}
