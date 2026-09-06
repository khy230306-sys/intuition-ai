/**
 * Local backup/restore for Campus store (metadata JSON).
 * Recording/material binary blobs in IndexedDB are NOT included —
 * export warns the user so expectations stay honest.
 */

import {
  CAMPUS_SCHEMA_VERSION,
  emptyCampusStore,
  loadCampusStore,
  saveCampusStore,
} from './storage'
import type { CampusStore } from './types'

export type CampusBackupFile = {
  app: 'aizio-campus'
  exportedAt: string
  schemaVersion: number
  note: string
  store: CampusStore
}

export function exportCampusBackup(): CampusBackupFile {
  const store = loadCampusStore()
  return {
    app: 'aizio-campus',
    exportedAt: new Date().toISOString(),
    schemaVersion: CAMPUS_SCHEMA_VERSION,
    note: '녹음·강의자료 원본 파일(IndexedDB)은 포함되지 않습니다. 시간표·과제·시험·노트·퀴즈 등 텍스트 데이터만 백업됩니다.',
    store,
  }
}

export function exportCampusBackupJson(): string {
  return JSON.stringify(exportCampusBackup(), null, 2)
}

export function importCampusBackupJson(raw: string): { ok: true } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as CampusBackupFile | CampusStore
    const store =
      parsed && typeof parsed === 'object' && 'store' in parsed && (parsed as CampusBackupFile).store
        ? (parsed as CampusBackupFile).store
        : (parsed as CampusStore)
    if (!store || typeof store !== 'object' || !store.profile || !Array.isArray(store.courses)) {
      return { ok: false, error: '백업 형식이 올바르지 않습니다.' }
    }
    const base = emptyCampusStore()
    const next: CampusStore = {
      ...base,
      ...store,
      meta: { ...base.meta, ...(store.meta || {}) },
      profile: { ...base.profile, ...(store.profile || {}) },
      semesters: Array.isArray(store.semesters) ? store.semesters : [],
      courses: Array.isArray(store.courses) ? store.courses : [],
      sessions: Array.isArray(store.sessions) ? store.sessions : [],
      materials: Array.isArray(store.materials) ? store.materials : [],
      recordings: Array.isArray(store.recordings) ? store.recordings : [],
      transcripts: Array.isArray(store.transcripts) ? store.transcripts : [],
      notes: Array.isArray(store.notes) ? store.notes : [],
      assignments: Array.isArray(store.assignments) ? store.assignments : [],
      exams: Array.isArray(store.exams) ? store.exams : [],
      candidates: Array.isArray(store.candidates) ? store.candidates : [],
      quizzes: Array.isArray(store.quizzes) ? store.quizzes : [],
      questions: Array.isArray(store.questions) ? store.questions : [],
      attempts: Array.isArray(store.attempts) ? store.attempts : [],
      studyPlans: Array.isArray(store.studyPlans) ? store.studyPlans : [],
      studySessions: Array.isArray(store.studySessions) ? store.studySessions : [],
      projects: Array.isArray(store.projects) ? store.projects : [],
    }
    saveCampusStore(next)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '가져오기 실패' }
  }
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
