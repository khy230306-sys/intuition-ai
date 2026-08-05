export type FocusStatus = 'active' | 'completed' | 'cancelled'

export type FocusSession = {
  id: string
  title: string
  startedAt: string
  plannedEndAt: string
  endedAt: string | null
  status: FocusStatus
  relatedProjectId: string | null
  relatedProjectName: string | null
  musicRequested: boolean
  notificationPolicy: 'normal' | 'reduced'
  completedMinutes: number
  plannedMinutes: number
}
