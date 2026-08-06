import type {
  EmergencyCard,
  FamilyHelperBundle,
  FamilyHelperSchedule,
  FamilyHelperTask,
  FamilyMember,
  FamilyRelation,
  FamilyScheduleCategory,
  GrowthRecord,
  MedicationLog,
  MedicationSchedule,
  VaccinationSchedule,
} from './types'

export const FAMILY_HELPER_SCHEMA_VERSION = 1
const STORE_KEY = 'aizio_family_helper_v1'
const SCHEMA_KEY = 'aizio_family_helper_schema_v1'
const LAST_MEMBER_KEY = 'aizio_family_helper_last_member_v1'

export function getLastSelectedMemberId(): string {
  try {
    return localStorage.getItem(LAST_MEMBER_KEY) || ''
  } catch {
    return ''
  }
}

export function setLastSelectedMemberId(id: string): void {
  try {
    if (id) localStorage.setItem(LAST_MEMBER_KEY, id)
  } catch {
    /* ignore */
  }
}

const COLORS = ['#0d9488', '#2563eb', '#db2777', '#d97706', '#7c3aed', '#059669']

function nid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function emptyBundle(): FamilyHelperBundle {
  return {
    schemaVersion: FAMILY_HELPER_SCHEMA_VERSION,
    members: [],
    schedules: [],
    tasks: [],
    medications: [],
    medicationLogs: [],
    vaccinations: [],
    growth: [],
    emergency: [],
    updatedAt: Date.now(),
  }
}

export function ensureFamilyHelperSchema(): number {
  try {
    const raw = localStorage.getItem(SCHEMA_KEY)
    if (!raw) {
      localStorage.setItem(SCHEMA_KEY, JSON.stringify({ version: FAMILY_HELPER_SCHEMA_VERSION }))
      return FAMILY_HELPER_SCHEMA_VERSION
    }
    const v = Number((JSON.parse(raw) as { version?: number }).version) || 1
    if (v < FAMILY_HELPER_SCHEMA_VERSION) {
      // Future migrations go here — never wipe data.
      localStorage.setItem(SCHEMA_KEY, JSON.stringify({ version: FAMILY_HELPER_SCHEMA_VERSION }))
    }
    return Math.max(v, FAMILY_HELPER_SCHEMA_VERSION)
  } catch {
    return FAMILY_HELPER_SCHEMA_VERSION
  }
}

export function loadFamilyHelperBundle(): FamilyHelperBundle {
  ensureFamilyHelperSchema()
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return emptyBundle()
    const parsed = JSON.parse(raw) as Partial<FamilyHelperBundle>
    const base = emptyBundle()
    return {
      ...base,
      ...parsed,
      schemaVersion: FAMILY_HELPER_SCHEMA_VERSION,
      members: Array.isArray(parsed.members) ? parsed.members : [],
      schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      medications: Array.isArray(parsed.medications) ? parsed.medications : [],
      medicationLogs: Array.isArray(parsed.medicationLogs) ? parsed.medicationLogs : [],
      vaccinations: Array.isArray(parsed.vaccinations) ? parsed.vaccinations : [],
      growth: Array.isArray(parsed.growth) ? parsed.growth : [],
      emergency: Array.isArray(parsed.emergency) ? parsed.emergency : [],
      updatedAt: Number(parsed.updatedAt) || Date.now(),
    }
  } catch {
    return emptyBundle()
  }
}

function saveBundle(b: FamilyHelperBundle): FamilyHelperBundle {
  const next = { ...b, schemaVersion: FAMILY_HELPER_SCHEMA_VERSION, updatedAt: Date.now() }
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next))
  } catch (e) {
    console.warn('[family-helper] save failed (quota?)', e instanceof Error ? e.name : 'error')
  }
  return next
}

export function listFamilyMembers(includeInactive = false): FamilyMember[] {
  const m = loadFamilyHelperBundle().members
  return includeInactive ? m : m.filter((x) => x.active)
}

export function upsertFamilyMember(input: {
  id?: string
  name: string
  relation?: FamilyRelation
  birthDate?: string
  school?: string
  grade?: string
  phone?: string
  note?: string
  color?: string
  icon?: string
  active?: boolean
  healthNote?: string
}): FamilyMember {
  const b = loadFamilyHelperBundle()
  const now = Date.now()
  const existing = input.id ? b.members.find((m) => m.id === input.id) : undefined
  const member: FamilyMember = {
    id: existing?.id || nid('fm'),
    name: String(input.name || '').trim() || '이름 없음',
    relation: input.relation || existing?.relation || 'other',
    birthDate: input.birthDate ?? existing?.birthDate,
    school: input.school ?? existing?.school,
    grade: input.grade ?? existing?.grade,
    phone: input.phone ?? existing?.phone,
    note: input.note ?? existing?.note,
    color: input.color || existing?.color || COLORS[b.members.length % COLORS.length]!,
    icon: input.icon || existing?.icon || '👤',
    active: input.active ?? existing?.active ?? true,
    healthNote: input.healthNote ?? existing?.healthNote,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }
  b.members = existing
    ? b.members.map((m) => (m.id === member.id ? member : m))
    : [member, ...b.members]
  saveBundle(b)
  return member
}

/**
 * Remove member profile. Related schedules/tasks are kept by default (orphan memberId)
 * unless purgeRelated=true.
 */
export function deleteFamilyMember(id: string, opts?: { purgeRelated?: boolean }): boolean {
  const b = loadFamilyHelperBundle()
  const before = b.members.length
  b.members = b.members.filter((m) => m.id !== id)
  if (opts?.purgeRelated) {
    b.schedules = b.schedules.filter((s) => s.memberId !== id)
    b.tasks = b.tasks.filter((t) => t.memberId !== id)
    b.medications = b.medications.filter((m) => m.memberId !== id)
    b.vaccinations = b.vaccinations.filter((v) => v.memberId !== id)
    b.growth = b.growth.filter((g) => g.memberId !== id)
    b.emergency = b.emergency.filter((e) => e.memberId !== id)
  }
  if (getLastSelectedMemberId() === id) {
    try {
      localStorage.removeItem(LAST_MEMBER_KEY)
    } catch {
      /* ignore */
    }
  }
  saveBundle(b)
  return b.members.length < before
}

export function addFamilyHelperSchedule(input: {
  title: string
  date: string
  time?: string
  memberId?: string
  category?: FamilyScheduleCategory
  note?: string
  recur?: FamilyHelperSchedule['recur']
  notifyMinutesBefore?: number
}): FamilyHelperSchedule {
  const b = loadFamilyHelperBundle()
  const now = Date.now()
  const item: FamilyHelperSchedule = {
    id: nid('fs'),
    memberId: input.memberId,
    title: String(input.title || '').trim() || '가족 일정',
    category: input.category || 'general',
    date: input.date,
    time: input.time,
    note: input.note,
    recur: input.recur || 'none',
    notifyMinutesBefore: input.notifyMinutesBefore,
    done: false,
    createdAt: now,
    updatedAt: now,
  }
  b.schedules = [item, ...b.schedules].slice(0, 400)
  saveBundle(b)
  return item
}

export function updateFamilyHelperSchedule(
  id: string,
  patch: Partial<FamilyHelperSchedule>,
): FamilyHelperSchedule | null {
  const b = loadFamilyHelperBundle()
  const idx = b.schedules.findIndex((s) => s.id === id)
  if (idx < 0) return null
  const next = { ...b.schedules[idx]!, ...patch, id, updatedAt: Date.now() }
  b.schedules[idx] = next
  saveBundle(b)
  return next
}

export function deleteFamilyHelperSchedule(id: string): boolean {
  const b = loadFamilyHelperBundle()
  const before = b.schedules.length
  b.schedules = b.schedules.filter((s) => s.id !== id)
  saveBundle(b)
  return b.schedules.length < before
}

export function listFamilyHelperSchedules(opts?: {
  days?: number
  person?: string
  memberId?: string
  includeDone?: boolean
}): FamilyHelperSchedule[] {
  const days = opts?.days ?? 30
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + days)
  const startS = start.toISOString().slice(0, 10)
  const endS = end.toISOString().slice(0, 10)
  const members = listFamilyMembers(true)
  let list = loadFamilyHelperBundle().schedules.filter((s) => {
    if (!opts?.includeDone && s.done) return false
    if (s.date < startS.slice(0, 10) && s.date < startS) {
      // keep past 7 days for missed
      const past = new Date()
      past.setDate(past.getDate() - 7)
      if (s.date < past.toISOString().slice(0, 10)) return false
    }
    if (s.date > endS) return false
    if (opts?.memberId && s.memberId !== opts.memberId) return false
    if (opts?.person) {
      const m = members.find((x) => x.id === s.memberId)
      const hit =
        (m && (m.name.includes(opts.person!) || m.relation.includes(opts.person as FamilyRelation))) ||
        s.title.includes(opts.person!)
      if (!hit) return false
    }
    return true
  })
  list = list.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
  return list
}

export function addFamilyHelperTask(input: {
  title: string
  body?: string
  memberId?: string
  dueDate?: string
  kind?: FamilyHelperTask['kind']
  photoDataUrl?: string
}): FamilyHelperTask {
  const b = loadFamilyHelperBundle()
  const now = Date.now()
  const item: FamilyHelperTask = {
    id: nid('ft'),
    memberId: input.memberId,
    title: String(input.title || '').trim() || '준비물',
    body: String(input.body || '').trim(),
    dueDate: input.dueDate,
    kind: input.kind || 'supplies',
    ready: false,
    done: false,
    photoDataUrl: input.photoDataUrl,
    createdAt: now,
    updatedAt: now,
  }
  b.tasks = [item, ...b.tasks].slice(0, 300)
  saveBundle(b)
  return item
}

export function updateFamilyHelperTask(
  id: string,
  patch: Partial<FamilyHelperTask>,
): FamilyHelperTask | null {
  const b = loadFamilyHelperBundle()
  const idx = b.tasks.findIndex((t) => t.id === id)
  if (idx < 0) return null
  const next = { ...b.tasks[idx]!, ...patch, id, updatedAt: Date.now() }
  b.tasks[idx] = next
  saveBundle(b)
  return next
}

export function deleteFamilyHelperTask(id: string): boolean {
  const b = loadFamilyHelperBundle()
  const before = b.tasks.length
  b.tasks = b.tasks.filter((t) => t.id !== id)
  saveBundle(b)
  return b.tasks.length < before
}

export function listFamilyHelperTasks(includeDone = false): FamilyHelperTask[] {
  return loadFamilyHelperBundle().tasks.filter((t) => includeDone || !t.done)
}

export function addMedication(input: {
  memberId: string
  name: string
  times: string[]
  startDate: string
  endDate?: string
  note?: string
}): MedicationSchedule {
  const b = loadFamilyHelperBundle()
  const now = Date.now()
  const item: MedicationSchedule = {
    id: nid('med'),
    memberId: input.memberId,
    name: String(input.name || '').trim() || '약',
    times: input.times.length ? input.times : ['09:00'],
    startDate: input.startDate,
    endDate: input.endDate,
    recur: 'daily',
    note: input.note,
    active: true,
    createdAt: now,
    updatedAt: now,
  }
  b.medications = [item, ...b.medications].slice(0, 100)
  saveBundle(b)
  return item
}

export function logMedication(
  medicationId: string,
  status: 'taken' | 'skipped',
  note?: string,
): MedicationLog {
  const b = loadFamilyHelperBundle()
  const log: MedicationLog = {
    id: nid('ml'),
    medicationId,
    at: Date.now(),
    status,
    note,
  }
  // Dedup same med within 20 minutes
  const recent = b.medicationLogs.find(
    (l) => l.medicationId === medicationId && Date.now() - l.at < 20 * 60_000,
  )
  if (recent) {
    recent.status = status
    recent.note = note
    recent.at = Date.now()
  } else {
    b.medicationLogs = [log, ...b.medicationLogs].slice(0, 500)
  }
  saveBundle(b)
  return log
}

export function listMedications(activeOnly = true): MedicationSchedule[] {
  return loadFamilyHelperBundle().medications.filter((m) => (activeOnly ? m.active : true))
}

export function addVaccination(input: {
  memberId: string
  name: string
  date: string
  nextDate?: string
  note?: string
}): VaccinationSchedule {
  const b = loadFamilyHelperBundle()
  const now = Date.now()
  const item: VaccinationSchedule = {
    id: nid('vac'),
    memberId: input.memberId,
    name: String(input.name || '').trim() || '예방접종',
    date: input.date,
    nextDate: input.nextDate,
    note: input.note,
    done: false,
    createdAt: now,
    updatedAt: now,
  }
  b.vaccinations = [item, ...b.vaccinations].slice(0, 100)
  saveBundle(b)
  return item
}

export function listVaccinations(): VaccinationSchedule[] {
  return loadFamilyHelperBundle().vaccinations
}

export function addGrowthRecord(input: Omit<GrowthRecord, 'id' | 'recordedAt'> & { recordedAt?: number }): GrowthRecord {
  const b = loadFamilyHelperBundle()
  const item: GrowthRecord = {
    id: nid('gr'),
    ...input,
    recordedAt: input.recordedAt || Date.now(),
  }
  b.growth = [item, ...b.growth].slice(0, 200)
  saveBundle(b)
  return item
}

export function listGrowth(memberId?: string): GrowthRecord[] {
  const g = loadFamilyHelperBundle().growth
  return memberId ? g.filter((x) => x.memberId === memberId) : g
}

export function upsertEmergencyCard(card: EmergencyCard): EmergencyCard {
  const b = loadFamilyHelperBundle()
  const next = { ...card, updatedAt: Date.now() }
  const idx = b.emergency.findIndex((e) => e.memberId === card.memberId)
  if (idx >= 0) b.emergency[idx] = next
  else b.emergency.push(next)
  saveBundle(b)
  return next
}

export function getEmergencyCard(memberId: string): EmergencyCard | null {
  return loadFamilyHelperBundle().emergency.find((e) => e.memberId === memberId) || null
}

/** Detect overlap with family room events (title+date). */
export function detectScheduleConflicts(date: string, title: string): string[] {
  const conflicts: string[] = []
  try {
    // Dynamic import avoided — sync read from familyStore localStorage key shape.
    const raw = localStorage.getItem('jarvis_family_room_v1')
    if (raw) {
      const room = JSON.parse(raw) as { events?: Array<{ date?: string; title?: string }> }
      for (const e of room.events || []) {
        if (
          e.date === date &&
          String(e.title || '').replace(/\s+/g, '') === title.replace(/\s+/g, '')
        ) {
          conflicts.push(`멤버 일정과 중복: ${e.title} (${e.date})`)
        }
      }
    }
  } catch {
    /* ignore */
  }
  const local = loadFamilyHelperBundle().schedules.filter(
    (s) => s.date === date && s.title.replace(/\s+/g, '') === title.replace(/\s+/g, '') && !s.done,
  )
  if (local.length >= 1) conflicts.push('가족 도우미에 같은 날짜·제목 일정이 이미 있어요.')
  return conflicts
}

/** Wipe only family-helper store — never touches jarvis_family_room_v1. */
export function resetFamilyHelperStoreForTests(): void {
  localStorage.removeItem(STORE_KEY)
  localStorage.removeItem(SCHEMA_KEY)
}
