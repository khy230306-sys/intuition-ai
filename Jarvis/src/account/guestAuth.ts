/**
 * Guest Mode — stable local userId + deviceId.
 * Existing jarvis_* / aizio_life_* keys remain owned by the guest until login lands.
 */

import type { AuthAdapter, LocalUserProfile, UserIdentity } from './types'

const IDENTITY_KEY = 'aizio_user_identity_v1'
const LEGACY_DEVICE_HINTS = ['jarvis_family_member_id_v1', 'jarvis_friends_member_id_v1'] as const

function uuid(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  }
}

function readIdentity(): UserIdentity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserIdentity
    if (!parsed?.userId || !parsed?.deviceId) return null
    return parsed
  } catch {
    return null
  }
}

function writeIdentity(id: UserIdentity): void {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(id))
}

function reuseLegacyDeviceId(): string | null {
  for (const k of LEGACY_DEVICE_HINTS) {
    try {
      const v = localStorage.getItem(k)
      if (v && v.length >= 8) return v
    } catch {
      /* ignore */
    }
  }
  return null
}

export function ensureGuestIdentity(): UserIdentity {
  const existing = readIdentity()
  if (existing) return existing
  const now = new Date().toISOString()
  const profile: LocalUserProfile = {
    displayName: '게스트',
    createdAt: now,
    updatedAt: now,
  }
  const identity: UserIdentity = {
    userId: uuid(),
    deviceId: reuseLegacyDeviceId() || uuid(),
    mode: 'guest',
    profile,
    linkedAccountId: null,
  }
  writeIdentity(identity)
  return identity
}

export function getGuestIdentity(): UserIdentity {
  return ensureGuestIdentity()
}

export function updateGuestProfile(patch: Partial<LocalUserProfile>): UserIdentity {
  const cur = ensureGuestIdentity()
  const next: UserIdentity = {
    ...cur,
    profile: {
      ...cur.profile,
      ...patch,
      updatedAt: new Date().toISOString(),
    },
  }
  writeIdentity(next)
  return next
}

/** Prepare link from guest → future authenticated user (does not move keys yet). */
export function planGuestMigration(targetUserId: string): {
  guestUserId: string
  targetUserId: string
  mode: 'copy-then-rekey'
  note: string
} {
  const guest = ensureGuestIdentity()
  return {
    guestUserId: guest.userId,
    targetUserId,
    mode: 'copy-then-rekey',
    note: 'Keys stay unprefixed for guest compatibility. After login, copy into u:{userId}:* then set mode=authenticated.',
  }
}

export const guestAuthAdapter: AuthAdapter = {
  id: 'guest',
  async getIdentity() {
    return ensureGuestIdentity()
  },
  async signIn() {
    return {
      ok: false,
      message: '로그인은 아직 연결되지 않았습니다. 현재는 게스트(이 기기) 모드입니다.',
    }
  },
  async signOut() {
    /* guest has no session */
  },
  async migrateGuestToUser(guestUserId, userId) {
    const plan = planGuestMigration(userId)
    if (plan.guestUserId !== guestUserId) {
      return { ok: false, message: '게스트 ID가 일치하지 않습니다.' }
    }
    const cur = ensureGuestIdentity()
    writeIdentity({
      ...cur,
      userId,
      mode: 'authenticated',
      linkedAccountId: userId,
      profile: { ...cur.profile, updatedAt: new Date().toISOString() },
    })
    return {
      ok: true,
      message: '계정 연결 메타데이터를 기록했습니다. 저장 키 재배치(네임스페이스)는 로그인 Provider 연결 후 수행합니다.',
    }
  },
}

export function getActiveAuthAdapter(): AuthAdapter {
  return guestAuthAdapter
}

/** Test helper */
export function resetGuestIdentityForTests(): void {
  localStorage.removeItem(IDENTITY_KEY)
}
