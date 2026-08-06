/** AI Parent · Family Helper — local-first family care data. */

export type FamilyRelation =
  | 'self'
  | 'spouse'
  | 'child'
  | 'parent'
  | 'sibling'
  | 'grandparent'
  | 'other'

export type FamilyMember = {
  id: string
  name: string
  relation: FamilyRelation
  birthDate?: string
  school?: string
  grade?: string
  phone?: string
  note?: string
  color: string
  icon: string
  active: boolean
  /** Sensitive — hidden by default in UI */
  healthNote?: string
  createdAt: number
  updatedAt: number
}

export type FamilyScheduleCategory =
  | 'dropoff'
  | 'pickup'
  | 'academy'
  | 'hospital'
  | 'vaccination'
  | 'medication'
  | 'homework'
  | 'supplies'
  | 'school_event'
  | 'birthday'
  | 'anniversary'
  | 'parent'
  | 'general'

export type FamilyHelperSchedule = {
  id: string
  memberId?: string
  title: string
  category: FamilyScheduleCategory
  date: string
  time?: string
  endDate?: string
  note?: string
  recur?: 'none' | 'daily' | 'weekly' | 'monthly'
  notifyMinutesBefore?: number
  done: boolean
  createdAt: number
  updatedAt: number
}

export type FamilyHelperTask = {
  id: string
  memberId?: string
  title: string
  body: string
  dueDate?: string
  kind: 'supplies' | 'homework' | 'other'
  ready: boolean
  done: boolean
  photoDataUrl?: string
  notifyAt?: number
  createdAt: number
  updatedAt: number
}

export type MedicationSchedule = {
  id: string
  memberId: string
  name: string
  times: string[]
  startDate: string
  endDate?: string
  recur: 'daily' | 'weekly' | 'once'
  note?: string
  active: boolean
  createdAt: number
  updatedAt: number
}

export type MedicationLog = {
  id: string
  medicationId: string
  at: number
  status: 'taken' | 'skipped'
  note?: string
}

export type VaccinationSchedule = {
  id: string
  memberId: string
  name: string
  date: string
  nextDate?: string
  note?: string
  done: boolean
  createdAt: number
  updatedAt: number
}

export type GrowthRecord = {
  id: string
  memberId: string
  heightCm?: number
  weightKg?: number
  sleepHours?: number
  mealNote?: string
  lifeNote?: string
  photoDataUrl?: string
  specialDay?: string
  recordedAt: number
}

export type EmergencyCard = {
  memberId: string
  guardianPhone?: string
  emergencyPhone?: string
  allergyNote?: string
  cautionNote?: string
  locked: boolean
  updatedAt: number
}

export type FamilyHelperBundle = {
  schemaVersion: number
  members: FamilyMember[]
  schedules: FamilyHelperSchedule[]
  tasks: FamilyHelperTask[]
  medications: MedicationSchedule[]
  medicationLogs: MedicationLog[]
  vaccinations: VaccinationSchedule[]
  growth: GrowthRecord[]
  emergency: EmergencyCard[]
  updatedAt: number
}
