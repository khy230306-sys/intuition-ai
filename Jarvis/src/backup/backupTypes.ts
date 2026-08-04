export const BACKUP_SCHEMA_VERSION = 7 as const

export type BackupCategory =
  | 'chat'
  | 'life'
  | 'invest'
  | 'familyFriends'
  | 'relationships'
  | 'customers'
  | 'smartReminders'
  | 'lifeOs'
  | 'account'
  | 'settings'
  | 'arcade'

export const ALL_BACKUP_CATEGORIES: BackupCategory[] = [
  'chat',
  'life',
  'invest',
  'familyFriends',
  'relationships',
  'customers',
  'smartReminders',
  'lifeOs',
  'account',
  'settings',
  'arcade',
]

export type BackupPreview = {
  schemaVersion: number
  exportedAt?: string
  categories: BackupCategory[]
  counts: Record<string, number>
  hasSecretsBlocked: boolean
  warnings: string[]
}

export type BackupImportResult = {
  ok: boolean
  message: string
  imported: BackupCategory[]
  skipped: string[]
}

export type BackupBuildOptions = {
  categories?: BackupCategory[]
}
