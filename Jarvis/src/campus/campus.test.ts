import { beforeEach, describe, expect, it, vi } from 'vitest'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => {
    mem.set(k, v)
  },
  removeItem: (k: string) => {
    mem.delete(k)
  },
  clear: () => mem.clear(),
})
vi.stubGlobal('crypto', {
  randomUUID: () => `id_${Math.random().toString(36).slice(2)}`,
})
vi.stubGlobal('navigator', { onLine: true })
import { createAssignment, upcomingAssignments } from './assignments'
import { createCourse, ensureActiveSemester, findCourseByName, updateCourse } from './courses'
import { createExam, upcomingExams } from './exams'
import { logStudySession, focusStats } from './focus'
import { computeGpa } from './gpa'
import { buildCampusHome, formatTodayClassesText } from './home'
import { parseCampusIntent } from './nlu/campusIntent'
import { parseTimetableAddUtterance } from './nlu/parseTimetableUtterance'
import { createQuestion, createQuiz, gradeAnswer, submitQuizAttempt, conceptStats } from './quiz'
import { buildSmartReview } from './review'
import { searchCampus } from './search'
import { executeCampusIntent } from './service'
import { clearCampusStore, loadCampusStore } from './storage'
import { buildDeterministicStudyPlan } from './studyPlan'
import { addClassSession, findConflicts, sessionsOverlap } from './timetable'
import type { ClassSession } from './types'

beforeEach(() => {
  mem.clear()
  clearCampusStore()
})

describe('Campus timetable NLU', () => {
  it('parses Korean timetable utterance', () => {
    const p = parseTimetableAddUtterance(
      '월요일 10시부터 11시 반까지 자료구조 수업 넣어줘',
    )
    expect(p).toBeTruthy()
    expect(p!.weekday).toBe(1)
    expect(p!.startTime).toBe('10:00')
    expect(p!.endTime).toBe('11:30')
    expect(p!.courseName).toContain('자료구조')
  })
})

describe('Campus intents', () => {
  it('routes campus open / today / assignments', () => {
    expect(parseCampusIntent('캠퍼스 열어줘')?.kind).toBe('open_campus')
    expect(parseCampusIntent('오늘 수업 뭐야?')?.kind).toBe('campus_today')
    expect(parseCampusIntent('이번 주 과제 뭐 있어?')?.kind).toBe('campus_assignments')
    expect(parseCampusIntent('시험 공부하자')?.kind).toBe('campus_review')
  })
})

describe('Campus E2E data loop', () => {
  it('semester → course → session → assignment → exam → quiz → review → focus → persist', async () => {
    ensureActiveSemester({ year: 2026, term: 2, label: '2026년 2학기' })
    const course = createCourse({ name: '자료구조', professor: '김교수', credits: 3 })
    const { session, conflicts } = addClassSession({
      courseId: course.id,
      weekday: 1,
      startTime: '10:00',
      endTime: '11:30',
      room: '공학 301',
    })
    expect(session.startTime).toBe('10:00')
    expect(conflicts.length).toBe(0)

    // conflict detection
    addClassSession({
      courseId: course.id,
      weekday: 1,
      startTime: '11:00',
      endTime: '12:30',
    })
    const store = loadCampusStore()
    expect(findConflicts(store.sessions, store.courses).length).toBeGreaterThan(0)

    createAssignment({
      courseId: course.id,
      title: '자료구조 과제1',
      dueAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    })
    createExam({
      courseId: course.id,
      name: '중간고사',
      at: new Date(Date.now() + 12 * 86_400_000).toISOString(),
      scope: '배열, Stack, Tree',
    })

    const q1 = createQuestion({
      courseId: course.id,
      type: 'ox',
      prompt: '스택은 LIFO이다',
      answer: 'O',
      concepts: ['Stack'],
    })
    const q2 = createQuestion({
      courseId: course.id,
      type: 'short',
      prompt: '이진 트리의 루트란?',
      answer: '최상위 노드',
      concepts: ['Tree'],
    })
    const quiz = createQuiz({
      courseId: course.id,
      title: '자료구조 연습',
      questionIds: [q1.id, q2.id],
    })
    expect(gradeAnswer(q1, 'O')).toBe(true)
    expect(gradeAnswer(q2, '최상위')).toBe(true)

    submitQuizAttempt({
      quizId: quiz.id,
      answers: [
        { questionId: q1.id, userAnswer: 'O' },
        { questionId: q2.id, userAnswer: '틀린답' },
      ],
    })
    const stats = conceptStats(course.id)
    expect(stats.find((s) => s.concept === 'Stack')?.rate).toBe(100)
    expect(stats.find((s) => s.concept === 'Tree')?.rate).toBe(0)

    const review = buildSmartReview(5)
    expect(review.some((r) => r.courseId === course.id)).toBe(true)

    logStudySession({ courseId: course.id, minutes: 25, mode: 'focus25' })
    expect(focusStats().today).toBeGreaterThanOrEqual(25)

    // persistence
    const again = loadCampusStore()
    expect(again.courses[0].name).toBe('자료구조')
    expect(again.sessions.length).toBeGreaterThanOrEqual(2)
    expect(again.assignments.length).toBe(1)
    expect(again.exams.length).toBe(1)
    expect(again.attempts.length).toBe(1)

    expect(upcomingAssignments()[0].assignment.title).toContain('과제')
    expect(upcomingExams()[0].exam.name).toContain('중간')
    expect(searchCampus('Tree').some((h) => h.kind === 'quiz_wrong')).toBe(true)

    const plan = buildDeterministicStudyPlan({ courseId: course.id, days: 10 })
    expect(plan.blocks.length).toBeGreaterThan(0)

    // chat tool path actually saves timetable
    const intent = parseCampusIntent('화요일 13시부터 14시 반까지 마케팅원론 수업 넣어줘')
    expect(intent?.kind).toBe('campus_timetable_add')
    const res = await executeCampusIntent(intent!)
    expect(res.message).toMatch(/저장/)
    expect(findCourseByName('마케팅원론')).toBeTruthy()
  })
})

describe('Campus home empty + real data', () => {
  it('does not invent classes when empty', () => {
    const home = buildCampusHome()
    expect(home.empty).toBe(true)
    expect(home.classes.length).toBe(0)
    expect(formatTodayClassesText()).toMatch(/없습니다/)
  })

  it('shows real monday class when today is that weekday', () => {
    ensureActiveSemester({ year: 2026, term: 2 })
    const c = createCourse({ name: '영어회화' })
    const wd = new Date().getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
    addClassSession({ courseId: c.id, weekday: wd, startTime: '15:00', endTime: '16:00' })
    const home = buildCampusHome()
    expect(home.classes.some((x) => x.name === '영어회화')).toBe(true)
  })
})

describe('GPA deterministic', () => {
  it('computes 4.5 scale', () => {
    ensureActiveSemester({ year: 2026, term: 2 })
    const a = createCourse({ name: 'A', credits: 3 })
    const b = createCourse({ name: 'B', credits: 3 })
    updateCourse(a.id, { grade: 'A+' })
    updateCourse(b.id, { grade: 'B+' })
    const g = computeGpa(loadCampusStore().courses, '4.5')
    expect(g.gpa).toBe(4.0)
  })
})

describe('session overlap', () => {
  it('detects overlap', () => {
    const a = {
      id: '1',
      courseId: 'c',
      weekday: 1,
      startTime: '10:00',
      endTime: '11:30',
      room: '',
      createdAt: '',
      updatedAt: '',
    } as ClassSession
    const b = { ...a, id: '2', startTime: '11:00', endTime: '12:30' }
    expect(sessionsOverlap(a, b)).toBe(true)
  })
})
