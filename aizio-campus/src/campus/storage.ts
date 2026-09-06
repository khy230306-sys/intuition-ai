import { campusId, nowIso } from './id'
import type { CampusProfile, CampusStore, GradeScale } from './types'

export const CAMPUS_STORE_KEY = 'aizio_campus_v1'
export const CAMPUS_SCHEMA_VERSION = 1

function defaultProfile(scale: GradeScale = '4.5'): CampusProfile {
  const now = nowIso()
  return {
    id: campusId('cpf'),
    schoolName: '',
    gradeScale: scale,
    onboardedAt: null,
    graduationCredits: null,
    majorCredits: null,
    generalCredits: null,
    notifyAssignmentD3: true,
    notifyAssignmentD1: true,
    notifyExamD7: true,
    notifyExamD1: true,
    notifyClassStart: false,
    createdAt: now,
    updatedAt: now,
  }
}

export function emptyCampusStore(): CampusStore {
  const now = nowIso()
  return {
    meta: { schemaVersion: CAMPUS_SCHEMA_VERSION, updatedAt: now, version: 1 },
    profile: defaultProfile(),
    semesters: [],
    courses: [],
    sessions: [],
    materials: [],
    recordings: [],
    transcripts: [],
    notes: [],
    assignments: [],
    exams: [],
    candidates: [],
    quizzes: [],
    questions: [],
    attempts: [],
    studyPlans: [],
    studySessions: [],
    projects: [],
  }
}

export function loadCampusStore(): CampusStore {
  try {
    const raw = localStorage.getItem(CAMPUS_STORE_KEY)
    if (!raw) return emptyCampusStore()
    const parsed = JSON.parse(raw) as CampusStore
    if (!parsed || typeof parsed !== 'object') return emptyCampusStore()
    const base = emptyCampusStore()
    return {
      ...base,
      ...parsed,
      meta: { ...base.meta, ...(parsed.meta || {}) },
      profile: { ...base.profile, ...(parsed.profile || {}) },
      semesters: Array.isArray(parsed.semesters) ? parsed.semesters : [],
      courses: Array.isArray(parsed.courses) ? parsed.courses : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      materials: Array.isArray(parsed.materials) ? parsed.materials : [],
      recordings: Array.isArray(parsed.recordings) ? parsed.recordings : [],
      transcripts: Array.isArray(parsed.transcripts) ? parsed.transcripts : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      exams: Array.isArray(parsed.exams) ? parsed.exams : [],
      candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
      quizzes: Array.isArray(parsed.quizzes) ? parsed.quizzes : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      studyPlans: Array.isArray(parsed.studyPlans) ? parsed.studyPlans : [],
      studySessions: Array.isArray(parsed.studySessions) ? parsed.studySessions : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    }
  } catch {
    return emptyCampusStore()
  }
}

export function saveCampusStore(store: CampusStore): void {
  const next: CampusStore = {
    ...store,
    meta: {
      schemaVersion: CAMPUS_SCHEMA_VERSION,
      updatedAt: nowIso(),
      version: (store.meta?.version || 0) + 1,
    },
  }
  localStorage.setItem(CAMPUS_STORE_KEY, JSON.stringify(next))
}

export function updateCampusStore(mutator: (store: CampusStore) => void): CampusStore {
  const store = loadCampusStore()
  mutator(store)
  saveCampusStore(store)
  return loadCampusStore()
}

export function clearCampusStore(): void {
  localStorage.removeItem(CAMPUS_STORE_KEY)
}
