import type { CampusTab } from '../types'

export type CampusUiState = {
  tab: CampusTab
  courseId: string | null
  quizId: string | null
  quizIndex: number
  focusMinutes: number
  focusRemaining: number
  focusRunning: boolean
  focusCourseId: string
  recordingCourseId: string
  status: string
  searchQ: string
  morePane: 'menu' | 'gpa' | 'projects' | 'settings' | 'search'
}

export const campusUi: CampusUiState = {
  tab: 'today',
  courseId: null,
  quizId: null,
  quizIndex: 0,
  focusMinutes: 25,
  focusRemaining: 25 * 60,
  focusRunning: false,
  focusCourseId: '',
  recordingCourseId: '',
  status: '',
  searchQ: '',
  morePane: 'menu',
}

let focusTimer: number | null = null

export function stopFocusTicker(): void {
  if (focusTimer) {
    window.clearInterval(focusTimer)
    focusTimer = null
  }
  campusUi.focusRunning = false
}

export function startFocusTicker(onTick: () => void, onDone: () => void): void {
  stopFocusTicker()
  campusUi.focusRunning = true
  focusTimer = window.setInterval(() => {
    if (!campusUi.focusRunning) return
    campusUi.focusRemaining -= 1
    if (campusUi.focusRemaining <= 0) {
      stopFocusTicker()
      campusUi.focusRemaining = 0
      onDone()
    } else {
      onTick()
    }
  }, 1000)
}
