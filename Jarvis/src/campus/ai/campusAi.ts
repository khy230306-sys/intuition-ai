/**
 * Campus AI helpers — source-grounded prompts via hybrid chat.
 * Deterministic features never call this module.
 */

import { hasAnyConfiguredProvider, runHybridChat } from '../../ai-providers'
import { campusId, nowIso } from '../id'
import { loadCampusStore, updateCampusStore } from '../storage'
import type { DeadlineCandidate, LectureNote, Question } from '../types'
import { createQuestion, createQuiz } from '../quiz'

function online(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

async function askCampusAi(prompt: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!online()) return { ok: false, error: '오프라인입니다. Cloud AI를 사용할 수 없습니다.' }
  if (!hasAnyConfiguredProvider()) {
    return { ok: false, error: 'AI API 키가 없습니다. 설정에서 무료/유료 AI를 연결해 주세요.' }
  }
  try {
    const out = await runHybridChat({
      message: prompt,
      history: [],
      displayName: 'AIZIO CAMPUS',
      locale: 'ko-KR',
    })
    return { ok: true, text: out.text }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'AI 호출 실패' }
  }
}

function safeJson<T>(text: string): T | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fence ? fence[1] : text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T
  } catch {
    return null
  }
}

export async function analyzeMaterialAi(materialId: string): Promise<{ ok: boolean; message: string }> {
  const store = loadCampusStore()
  const mat = store.materials.find((m) => m.id === materialId)
  if (!mat) return { ok: false, message: '자료를 찾을 수 없습니다.' }
  if (mat.extractStatus !== 'ready' || !mat.textExtract.trim()) {
    return { ok: false, message: '텍스트 추출이 완료된 자료만 분석할 수 있습니다.' }
  }
  updateCampusStore((s) => {
    const idx = s.materials.findIndex((m) => m.id === materialId)
    if (idx >= 0) s.materials[idx].analysisStatus = 'running'
  })
  const source = mat.textExtract.slice(0, 14_000)
  const prompt = [
    '당신은 대학 강의자료 분석기입니다.',
    '반드시 아래 SOURCE 원문에 있는 내용만 사용하세요. 원문에 없는 사실을 만들지 마세요.',
    'JSON만 출력:',
    '{',
    '  "summary": string,',
    '  "concepts": string[],',
    '  "terms": string[],',
    '  "examPoints": string[],',
    '  "hardParts": string[],',
    '  "reviewPoints": string[],',
    '  "sourceRefs": [{"claim": string, "excerpt": string}]',
    '}',
    'SOURCE:',
    source,
  ].join('\n')
  const res = await askCampusAi(prompt)
  if (!res.ok) {
    updateCampusStore((s) => {
      const idx = s.materials.findIndex((m) => m.id === materialId)
      if (idx >= 0) {
        s.materials[idx].analysisStatus = navigator.onLine === false ? 'offline' : 'failed'
      }
    })
    return { ok: false, message: res.error }
  }
  const parsed = safeJson<Record<string, unknown>>(res.text)
  updateCampusStore((s) => {
    const idx = s.materials.findIndex((m) => m.id === materialId)
    if (idx < 0) return
    s.materials[idx] = {
      ...s.materials[idx],
      analysisJson: JSON.stringify(parsed || { raw: res.text }),
      analysisStatus: 'done',
      updatedAt: nowIso(),
    }
  })
  return { ok: true, message: '강의자료 AI 분석을 완료했습니다.' }
}

export async function summarizeLectureFromTranscript(
  transcriptId: string,
): Promise<{ ok: boolean; message: string; note?: LectureNote }> {
  const store = loadCampusStore()
  const tr = store.transcripts.find((t) => t.id === transcriptId)
  if (!tr || tr.status !== 'ready' || !tr.text.trim()) {
    return { ok: false, message: '준비된 transcript가 없습니다.' }
  }
  const rec = store.recordings.find((r) => r.id === tr.recordingId)
  const markerHints =
    rec?.markers
      .map((m) => `${Math.round(m.atMs / 1000)}s:${m.kind}${m.note ? `(${m.note})` : ''}`)
      .join(', ') || ''

  const prompt = [
    '대학 강의 transcript를 구조화하세요.',
    '원문에 근거가 있을 때만 채우세요. 없으면 빈 배열.',
    '특히 professorEmphasis는 강조 표현(중요/시험/꼭/반드시/기억 등) 근거가 있을 때만.',
    'JSON만:',
    '{',
    ' "title": string,',
    ' "threeLine": string,',
    ' "fullSummary": string,',
    ' "concepts": string[],',
    ' "professorEmphasis": string[],',
    ' "definitions": string[],',
    ' "examples": string[],',
    ' "examPoints": string[],',
    ' "reviewQuestions": string[],',
    ' "sourceRefs": [{"claim": string, "excerpt": string}]',
    '}',
    markerHints ? `학생 마커(우선 반영): ${markerHints}` : '',
    'TRANSCRIPT:',
    tr.text.slice(0, 14_000),
  ]
    .filter(Boolean)
    .join('\n')

  const res = await askCampusAi(prompt)
  if (!res.ok) return { ok: false, message: res.error }
  const parsed = safeJson<{
    title?: string
    threeLine?: string
    fullSummary?: string
    concepts?: string[]
    professorEmphasis?: string[]
    definitions?: string[]
    examples?: string[]
    examPoints?: string[]
    reviewQuestions?: string[]
    sourceRefs?: Array<{ claim: string; excerpt: string }>
  }>(res.text)

  const now = nowIso()
  const note: LectureNote = {
    id: campusId('note'),
    courseId: tr.courseId,
    recordingId: tr.recordingId,
    title: parsed?.title || '강의 요약',
    threeLine: parsed?.threeLine || '',
    fullSummary: parsed?.fullSummary || res.text.slice(0, 2000),
    concepts: parsed?.concepts || [],
    professorEmphasis: parsed?.professorEmphasis || [],
    definitions: parsed?.definitions || [],
    examples: parsed?.examples || [],
    examPoints: parsed?.examPoints || [],
    reviewQuestions: parsed?.reviewQuestions || [],
    sourceRefs: parsed?.sourceRefs || [],
    status: 'done',
    createdAt: now,
    updatedAt: now,
  }
  updateCampusStore((s) => {
    s.notes.unshift(note)
  })
  return { ok: true, message: '강의 AI 정리를 완료했습니다.', note }
}

export async function extractDeadlineCandidates(
  materialId: string,
): Promise<{ ok: boolean; message: string; candidates: DeadlineCandidate[] }> {
  const store = loadCampusStore()
  const mat = store.materials.find((m) => m.id === materialId)
  if (!mat?.textExtract) return { ok: false, message: '자료 텍스트가 없습니다.', candidates: [] }
  const prompt = [
    '강의계획서/공지 텍스트에서 과제·시험·발표·프로젝트 후보만 추출.',
    '일정에 확정 저장하지 말고 후보만. 확실한 날짜면 certain, 추론이면 inferred.',
    '원문에 없으면 만들지 마세요. JSON:',
    '{ "items": [{"kind":"assignment|exam|presentation|project","title":string,"dueHint":string,"dueAt":string|null,"confidence":"certain|inferred","excerpt":string}] }',
    'SOURCE:',
    mat.textExtract.slice(0, 12_000),
  ].join('\n')
  const res = await askCampusAi(prompt)
  if (!res.ok) return { ok: false, message: res.error, candidates: [] }
  const parsed = safeJson<{
    items?: Array<{
      kind?: DeadlineCandidate['kind']
      title?: string
      dueHint?: string
      dueAt?: string | null
      confidence?: 'certain' | 'inferred'
      excerpt?: string
    }>
  }>(res.text)
  const items = parsed?.items || []
  const candidates: DeadlineCandidate[] = items
    .filter((i) => i.title)
    .map((i) => ({
      id: campusId('cand'),
      courseId: mat.courseId,
      kind: i.kind || 'assignment',
      title: String(i.title).slice(0, 120),
      dueHint: String(i.dueHint || ''),
      dueAt: i.dueAt || null,
      confidence: i.confidence === 'certain' ? 'certain' : 'inferred',
      excerpt: String(i.excerpt || '').slice(0, 400),
      accepted: false,
      createdAt: nowIso(),
    }))
  updateCampusStore((s) => {
    s.candidates = [...candidates, ...s.candidates].slice(0, 200)
  })
  return {
    ok: true,
    message: `후보 ${candidates.length}개를 추출했습니다. 확인 후 일정에 추가하세요.`,
    candidates,
  }
}

export async function generateQuizFromSources(input: {
  courseId: string
  count: number
  wrongOnly?: boolean
}): Promise<{ ok: boolean; message: string; quizId?: string }> {
  const store = loadCampusStore()
  const course = store.courses.find((c) => c.id === input.courseId)
  if (!course) return { ok: false, message: '과목을 찾을 수 없습니다.' }

  if (input.wrongOnly) {
    const { wrongQuestionsForCourse, createQuiz: cq } = await import('../quiz')
    const wrong = wrongQuestionsForCourse(input.courseId).slice(0, input.count)
    if (!wrong.length) return { ok: false, message: '틀린 문제가 없습니다.' }
    const quiz = cq({
      courseId: input.courseId,
      title: `${course.name} 오답 재도전`,
      questionIds: wrong.map((q) => q.id),
    })
    return { ok: true, message: `오답 ${wrong.length}문제를 준비했습니다.`, quizId: quiz.id }
  }

  const materials = store.materials
    .filter((m) => m.courseId === input.courseId && m.textExtract)
    .slice(0, 3)
  const notes = store.notes.filter((n) => n.courseId === input.courseId).slice(0, 2)
  const transcripts = store.transcripts
    .filter((t) => t.courseId === input.courseId && t.status === 'ready')
    .slice(0, 1)
  const source = [
    ...materials.map((m) => `MATERIAL(${m.name}):\n${m.textExtract.slice(0, 5000)}`),
    ...notes.map((n) => `NOTE:\n${n.fullSummary}\nConcepts:${n.concepts.join(', ')}`),
    ...transcripts.map((t) => `TRANSCRIPT:\n${t.text.slice(0, 5000)}`),
  ].join('\n\n')

  if (!source.trim()) {
    return {
      ok: false,
      message: '문제 생성용 강의자료/노트/transcript가 없습니다. 먼저 자료를 업로드하세요.',
    }
  }

  const count = Math.max(1, Math.min(20, input.count))
  const prompt = [
    '학생 업로드 SOURCE만 사용해 퀴즈를 만드세요. 일반 지식으로 보충하지 마세요.',
    `문제 ${count}개. JSON:`,
    '{ "questions": [{"type":"mcq|ox|short|essay|flash","prompt":string,"choices":string[],"answer":string,"explanation":string,"concepts":string[]}] }',
    'SOURCE:',
    source.slice(0, 16_000),
  ].join('\n')
  const res = await askCampusAi(prompt)
  if (!res.ok) return { ok: false, message: res.error }
  const parsed = safeJson<{
    questions?: Array<{
      type?: Question['type']
      prompt?: string
      choices?: string[]
      answer?: string
      explanation?: string
      concepts?: string[]
    }>
  }>(res.text)
  const qs = (parsed?.questions || []).filter((q) => q.prompt && q.answer)
  if (!qs.length) return { ok: false, message: 'AI가 유효한 문제를 만들지 못했습니다.' }
  const ids: string[] = []
  for (const q of qs.slice(0, count)) {
    const created = createQuestion({
      courseId: input.courseId,
      type: q.type || 'short',
      prompt: String(q.prompt),
      answer: String(q.answer),
      choices: q.choices || [],
      explanation: q.explanation || '',
      concepts: q.concepts || [],
      sourceMaterialIds: materials.map((m) => m.id),
    })
    ids.push(created.id)
  }
  const quiz = createQuiz({
    courseId: input.courseId,
    title: `${course.name} 연습 ${ids.length}문제`,
    questionIds: ids,
  })
  return { ok: true, message: `${ids.length}문제를 생성했습니다.`, quizId: quiz.id }
}

export async function draftProfessorEmail(request: string): Promise<{ ok: boolean; message: string }> {
  const res = await askCampusAi(
    [
      '대학생이 교수님께 보낼 이메일 초안만 작성하세요.',
      '보내기/전송 완료라고 말하지 마세요. 검토용 초안임을 마지막에 한 줄 안내.',
      `요청: ${request}`,
    ].join('\n'),
  )
  if (!res.ok) return { ok: false, message: res.error }
  return { ok: true, message: res.text }
}

export async function explainReviewRecommendation(items: Array<{ title: string; reasons: string[] }>): Promise<string | null> {
  if (!items.length || !hasAnyConfiguredProvider() || !online()) return null
  const res = await askCampusAi(
    [
      '아래 복습 추천의 이유를 2~3문장으로 설명. 숫자는 바꾸지 마세요.',
      JSON.stringify(items),
    ].join('\n'),
  )
  return res.ok ? res.text : null
}
