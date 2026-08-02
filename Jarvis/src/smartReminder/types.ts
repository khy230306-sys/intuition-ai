import type { RelationCode } from '../relationship/types'

export type ReminderStatus = 'scheduled' | 'triggered' | 'completed' | 'cancelled' | 'missed' | 'snoozed'

export type NotificationStatus = 'pending' | 'fired' | 'skipped_past' | 'permission_denied' | 'unsupported'

export type SmartReminder = {
  id: string
  title: string
  description: string
  personId: string | null
  personRelation: RelationCode | null
  personDisplay: string | null
  scheduledAt: string
  scheduledAtMs: number
  timezone: string
  advanceAlertsMs: number[]
  advanceAlarmIds: string[]
  mainAlarmId: string | null
  repeatRule: string | null
  status: ReminderStatus
  notificationStatus: NotificationStatus
  category: string | null
  createdFrom: 'conversation'
  originalText: string
  createdAt: string
  updatedAt: string
  previewMode: 'full' | 'simple' | 'hidden'
}

export type ReminderParseKind =
  | 'create'
  | 'update_time'
  | 'add_advance'
  | 'cancel'
  | 'snooze'
  | 'complete'
  | 'list'
  | 'ask_person'
  | 'ask_next'
