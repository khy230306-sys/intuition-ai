/**
 * Permission Layer V1 — action risk levels.
 * LEVEL 2–3 must never be presented as available without real connectors.
 */

export type PermissionLevel = 0 | 1 | 2 | 3

export type PermissionDecision =
  | { allowed: true; level: PermissionLevel; requiresUserConfirm: boolean }
  | {
      allowed: false
      level: PermissionLevel
      reason: string
      status: 'denied' | 'pending_external_setup'
    }

export const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  0: '읽기/검색',
  1: '로컬 저장',
  2: '외부 서비스 쓰기',
  3: '민감 행동',
}

export type EngineActionKind =
  | 'weather.read'
  | 'places.search'
  | 'places.select'
  | 'calendar.local_write'
  | 'calendar.external_write'
  | 'email.send'
  | 'booking.confirm'
  | 'payment'
  | 'delete'

export function actionPermissionLevel(action: EngineActionKind): PermissionLevel {
  switch (action) {
    case 'weather.read':
    case 'places.search':
    case 'places.select':
      return 0
    case 'calendar.local_write':
      return 1
    case 'calendar.external_write':
    case 'email.send':
      return 2
    case 'booking.confirm':
    case 'payment':
    case 'delete':
      return 3
  }
}

/**
 * V1.1: only LEVEL 0–1 are executable in-app.
 * LEVEL 2–3 return PENDING_EXTERNAL_SETUP / denied — never fake success.
 */
export function checkPermission(
  action: EngineActionKind,
  opts?: { userConfirmed?: boolean },
): PermissionDecision {
  const level = actionPermissionLevel(action)

  if (level <= 0) {
    return { allowed: true, level, requiresUserConfirm: false }
  }
  if (level === 1) {
    // Local write — allowed; utterance itself is the intent to save
    return { allowed: true, level, requiresUserConfirm: false }
  }
  if (level === 2) {
    return {
      allowed: false,
      level,
      reason:
        '외부 서비스 쓰기(캘린더 동기화·메일 등)는 아직 연결되어 있지 않습니다. (PENDING_EXTERNAL_SETUP)',
      status: 'pending_external_setup',
    }
  }
  // level 3
  if (!opts?.userConfirmed) {
    return {
      allowed: false,
      level,
      reason: '결제·예약 확정·삭제 등 민감 행동은 명시적 승인이 필요합니다.',
      status: 'denied',
    }
  }
  return {
    allowed: false,
    level,
    reason: '민감 행동용 외부 연결이 없습니다. (PENDING_EXTERNAL_SETUP)',
    status: 'pending_external_setup',
  }
}
