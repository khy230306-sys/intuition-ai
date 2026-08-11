import { beforeEach, describe, expect, it, vi } from 'vitest'
import { processCoreBrain, clearBrainStateForTests } from '../core-brain'
import { createAssignment } from './assignments'
import { createCourse, ensureActiveSemester } from './courses'
import { createExam } from './exams'
import { createQuestion, createQuiz, submitQuizAttempt } from './quiz'
import { clearCampusStore } from './storage'
import { addClassSession } from './timetable'
import { summarizeLectureFromTranscript } from './ai/campusAi'
import { campusId, nowIso } from './id'
import { updateCampusStore } from './storage'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => mem.set(k, v),
  removeItem: (k: string) => mem.delete(k),
  clear: () => mem.clear(),
})
vi.stubGlobal('navigator', { onLine: true })

describe('Campus conversation E2E', () => {
  beforeEach(() => {
    mem.clear()
    clearCampusStore()
    clearBrainStateForTests()
    ensureActiveSemester({ year: 2026, term: 2 })
    const course = createCourse({ name: '자료구조', credits: 3 })
    const wd = new Date().getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
    addClassSession({
      courseId: course.id,
      weekday: wd,
      startTime: '10:00',
      endTime: '11:30',
    })
    createAssignment({
      courseId: course.id,
      title: '연결리스트 구현',
      dueAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    })
    createExam({
      courseId: course.id,
      name: '중간고사',
      at: new Date(Date.now() + 12 * 86_400_000).toISOString(),
      scope: 'Tree',
    })
    updateCampusStore((s) => {
      s.notes.unshift({
        id: campusId('note'),
        courseId: course.id,
        recordingId: '',
        title: '지난 강의',
        threeLine: 'Tree 순회를 다뤘습니다.',
        fullSummary: '이진 트리 순회: 전위/중위/후위',
        concepts: ['Tree'],
        professorEmphasis: [],
        definitions: [],
        examples: [],
        examPoints: ['순회 복잡도'],
        reviewQuestions: ['중위 순회는?'],
        sourceRefs: [{ claim: '순회', excerpt: '이진 트리 순회' }],
        status: 'done',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      })
    })
    const q = createQuestion({
      courseId: course.id,
      type: 'ox',
      prompt: 'Tree 루트는 하나다',
      answer: 'O',
      concepts: ['Tree'],
    })
    const quiz = createQuiz({ courseId: course.id, title: 't', questionIds: [q.id] })
    submitQuizAttempt({
      quizId: quiz.id,
      answers: [{ questionId: q.id, userAnswer: 'X' }],
    })
  })

  async function ask(text: string) {
    return processCoreBrain({ text, allowDuplicate: true })
  }

  it('answers campus questions from real data', async () => {
    const today = await ask('오늘 수업 뭐야?')
    expect(today.intent).toBe('campus_today')
    expect(today.responseText).toMatch(/자료구조/)

    const asg = await ask('자료구조 과제 있어?')
    expect(asg.intent).toBe('campus_assignments')
    expect(asg.responseText).toMatch(/연결리스트/)

    const exam = await ask('시험까지 며칠 남았어?')
    expect(exam.intent).toBe('campus_exams')
    expect(exam.responseText).toMatch(/중간고사/)
    expect(exam.responseText).toMatch(/D-/)

    const sum = await ask('자료구조 지난 수업 요약해줘')
    expect(sum.intent).toBe('campus_summary')
    expect(sum.responseText).toMatch(/Tree|순회/)

    const review = await ask('내가 뭘 먼저 공부해야 해?')
    expect(review.intent).toBe('campus_review')
    expect(review.responseText).toMatch(/추천|복습|자료구조/)

    const wrong = await ask('틀린 것 다시 내줘')
    expect(wrong.intent).toBe('campus_quiz_wrong')
    // Without AI keys, wrong-only still uses stored wrong questions
    expect(wrong.responseText).toMatch(/오답|문제|준비/)
  })

  it('does not invent AI summary without transcript', async () => {
    const res = await summarizeLectureFromTranscript('missing')
    expect(res.ok).toBe(false)
  })
})
