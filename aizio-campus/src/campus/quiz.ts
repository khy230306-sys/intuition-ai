import { campusId, nowIso } from './id'
import { loadCampusStore, updateCampusStore } from './storage'
import type { Question, QuestionType, Quiz, QuizAttempt } from './types'

export function createQuestion(input: {
  courseId: string
  type: QuestionType
  prompt: string
  answer: string
  choices?: string[]
  explanation?: string
  concepts?: string[]
  sourceMaterialIds?: string[]
}): Question {
  const q: Question = {
    id: campusId('qst'),
    courseId: input.courseId,
    type: input.type,
    prompt: input.prompt.trim(),
    choices: input.choices || [],
    answer: input.answer.trim(),
    explanation: (input.explanation || '').trim(),
    concepts: input.concepts || [],
    sourceMaterialIds: input.sourceMaterialIds || [],
    createdAt: nowIso(),
  }
  updateCampusStore((s) => {
    s.questions.unshift(q)
  })
  return q
}

export function createQuiz(input: {
  courseId: string
  title: string
  questionIds: string[]
}): Quiz {
  const quiz: Quiz = {
    id: campusId('quiz'),
    courseId: input.courseId,
    title: input.title.trim().slice(0, 120),
    questionIds: input.questionIds,
    createdAt: nowIso(),
  }
  updateCampusStore((s) => {
    s.quizzes.unshift(quiz)
  })
  return quiz
}

function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

/** Deterministic grading — not LLM. */
export function gradeAnswer(question: Question, userAnswer: string): boolean {
  const ua = normalizeAnswer(userAnswer)
  const ans = normalizeAnswer(question.answer)
  if (!ua) return false
  if (question.type === 'ox') {
    const truthy = /^(o|ox|맞|참|true|yes|ㅇ)$/i.test(userAnswer.trim())
    const falsy = /^(x|틀|거|false|no|ㄴ)$/i.test(userAnswer.trim())
    const ansTrue = /^(o|맞|참|true|yes)$/i.test(question.answer.trim())
    if (truthy) return ansTrue
    if (falsy) return !ansTrue
  }
  if (question.type === 'mcq') {
    const choices = question.choices || []
    const letterToText = (raw: string): string | null => {
      const m = raw.trim().match(/^([A-Da-d])(?:[.)]|$)/)
      if (!m || !choices.length) return null
      const idx = m[1].toUpperCase().charCodeAt(0) - 65
      return choices[idx] ?? null
    }
    const expectedText = letterToText(question.answer) || question.answer.trim()
    const userText = letterToText(userAnswer) || userAnswer.trim()
    const expectedNorm = normalizeAnswer(expectedText)
    const userNorm = normalizeAnswer(userText)
    if (userNorm === expectedNorm) return true
    // letter vs text either way
    if (letterToText(question.answer) && normalizeAnswer(userAnswer) === expectedNorm) return true
    if (letterToText(userAnswer) && userNorm === ans) return true
    return ua === ans
  }
  if (question.type === 'essay') {
    // essays: accept if substantial overlap with key phrases
    const keys = question.answer
      .split(/[,/·|]/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 2)
    if (!keys.length) return ua.includes(ans) || ans.includes(ua)
    const hit = keys.filter((k) => normalizeAnswer(userAnswer).includes(normalizeAnswer(k)))
    return hit.length >= Math.ceil(keys.length * 0.5)
  }
  return ua === ans || ua.includes(ans) || ans.includes(ua)
}

export function submitQuizAttempt(input: {
  quizId: string
  answers: Array<{ questionId: string; userAnswer: string }>
}): QuizAttempt {
  const store = loadCampusStore()
  const quiz = store.quizzes.find((q) => q.id === input.quizId)
  if (!quiz) throw new Error('퀴즈를 찾을 수 없습니다.')
  const graded = input.answers.map((a) => {
    const question = store.questions.find((q) => q.id === a.questionId)
    if (!question) {
      return {
        questionId: a.questionId,
        userAnswer: a.userAnswer,
        correct: false,
        concepts: [] as string[],
      }
    }
    return {
      questionId: a.questionId,
      userAnswer: a.userAnswer,
      correct: gradeAnswer(question, a.userAnswer),
      concepts: question.concepts,
    }
  })
  const total = graded.length
  const score = graded.filter((g) => g.correct).length
  const attempt: QuizAttempt = {
    id: campusId('atm'),
    quizId: quiz.id,
    courseId: quiz.courseId,
    answers: graded,
    score,
    total,
    createdAt: nowIso(),
  }
  updateCampusStore((s) => {
    s.attempts.unshift(attempt)
  })
  return attempt
}

export function wrongQuestionsForCourse(courseId: string): Question[] {
  const store = loadCampusStore()
  const wrongIds = new Set<string>()
  for (const atm of store.attempts.filter((a) => a.courseId === courseId)) {
    for (const a of atm.answers) {
      if (!a.correct) wrongIds.add(a.questionId)
    }
  }
  return store.questions.filter((q) => wrongIds.has(q.id) && q.courseId === courseId)
}

export type ConceptStat = { concept: string; correct: number; total: number; rate: number }

/** Weakness analysis from real quiz attempts only. */
export function conceptStats(courseId?: string): ConceptStat[] {
  const store = loadCampusStore()
  const map = new Map<string, { correct: number; total: number }>()
  for (const atm of store.attempts) {
    if (courseId && atm.courseId !== courseId) continue
    for (const a of atm.answers) {
      const concepts = a.concepts.length ? a.concepts : ['(미분류)']
      for (const c of concepts) {
        const cur = map.get(c) || { correct: 0, total: 0 }
        cur.total += 1
        if (a.correct) cur.correct += 1
        map.set(c, cur)
      }
    }
  }
  return [...map.entries()]
    .map(([concept, v]) => ({
      concept,
      correct: v.correct,
      total: v.total,
      rate: v.total ? Math.round((v.correct / v.total) * 100) : 0,
    }))
    .sort((a, b) => a.rate - b.rate || b.total - a.total)
}
