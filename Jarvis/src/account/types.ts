/** User identity & auth contracts — local-first; no cloud login yet. */

export type AuthMode = 'guest' | 'authenticated'

export type LocalUserProfile = {
  displayName: string
  locale?: string
  createdAt: string
  updatedAt: string
}

export type UserIdentity = {
  userId: string
  deviceId: string
  mode: AuthMode
  profile: LocalUserProfile
  /** Set when a future social/email login links this guest. */
  linkedAccountId?: string | null
}

export type AuthSession = {
  userId: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: string
  provider?: 'email' | 'apple' | 'google' | 'none'
}

export type AuthAdapter = {
  readonly id: string
  getIdentity(): Promise<UserIdentity>
  /** Future: email / social. Guest adapter returns unavailable. */
  signIn?(hint?: string): Promise<{ ok: boolean; session?: AuthSession; message: string }>
  signOut?(): Promise<void>
  /** Migrate guest-owned local data under a logged-in userId. */
  migrateGuestToUser?(guestUserId: string, userId: string): Promise<{ ok: boolean; message: string }>
}

/** Domains that must be scoped per user when accounts exist. */
export const USER_SCOPED_DOMAINS = [
  'profile',
  'userPreferences',
  'providerSettings',
  'relationships',
  'reminders',
  'smartReminders',
  'notes',
  'todos',
  'projects',
  'dna',
  'goals',
  'ideas',
  'timeline',
  'routines',
  'familyData',
  'pushSubscriptions',
  'lifeOs',
] as const

export type UserScopedDomain = (typeof USER_SCOPED_DOMAINS)[number]
