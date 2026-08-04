import type { RelationCode } from '../relationship/types'
import type { NotifyPrivacyMode } from '../push/reminderPushTypes'

export type ReminderStatus = 'scheduled' | 'triggered' | 'completed' | 'cancelled' | 'missed' | 'snoozed'

export type NotificationStatus = 'pending' | 'fired' | 'skipped_past' | 'permission_denied' | 'unsupported'

/** Closed-app push sync — separate from in-app notificationStatus */
export type PushScheduleStatus =
  | 'not_applicable'
  | 'pending'
  | 'synced'
  | 'failed'
  | 'cancelled'
  | 'unsupported'
  | 'permission_denied'
  | 'server_unconfigured'

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
  previewMode: NotifyPrivacyMode
  /** Push server sync */
  pushScheduleStatus?: PushScheduleStatus
  serverScheduleId?: string | null
  lastPushSyncAt?: string | null
  pushSyncErrorCode?: string | null
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

export function formatPushScheduleLabel(r: SmartReminder): string {
  const local =
    r.notificationStatus === 'permission_denied'
      ? '앱 내부 알림: 권한 거부'
      : r.notificationStatus === 'unsupported'
        ? '앱 내부 알림: 미지원'
        : r.mainAlarmId
          ? '앱 내부 알림 등록됨'
          : '앱 내부 알림 없음'
  const push = r.pushScheduleStatus || 'not_applicable'
  const pushLabel: Record<PushScheduleStatus, string> = {
    not_applicable: '푸시: 해당 없음',
    pending: '푸시 서버 동기화 대기',
    synced: '푸시 예약 완료',
    failed: '푸시 예약 실패',
    cancelled: '푸시 취소 완료',
    unsupported: 'Push 미지원',
    permission_denied: '알림 권한 거부',
    server_unconfigured: '서버 미연결',
  }
  return `${local} · ${pushLabel[push]}`
}
