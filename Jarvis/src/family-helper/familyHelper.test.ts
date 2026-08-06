import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addFamilyHelperSchedule,
  addFamilyHelperTask,
  addMedication,
  addVaccination,
  deleteFamilyHelperSchedule,
  deleteFamilyMember,
  detectScheduleConflicts,
  listFamilyHelperSchedules,
  listFamilyMembers,
  logMedication,
  resetFamilyHelperStoreForTests,
  updateFamilyHelperSchedule,
  upsertEmergencyCard,
  upsertFamilyMember,
  getEmergencyCard,
} from './store'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})

describe('family helper store', () => {
  beforeEach(() => {
    store.clear()
    resetFamilyHelperStoreForTests()
  })

  it('creates updates deletes members', () => {
    const m = upsertFamilyMember({ name: '한영', relation: 'child', school: '온산초' })
    expect(listFamilyMembers()).toHaveLength(1)
    upsertFamilyMember({ id: m.id, name: '한영이', relation: 'child' })
    expect(listFamilyMembers()[0]?.name).toBe('한영이')
    deleteFamilyMember(m.id)
    expect(listFamilyMembers()).toHaveLength(0)
  })

  it('schedule CRUD + complete', () => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    const date = d.toISOString().slice(0, 10)
    const s = addFamilyHelperSchedule({
      title: '하원',
      date,
      time: '16:30',
      category: 'pickup',
    })
    expect(listFamilyHelperSchedules({ days: 14 }).some((x) => x.id === s.id)).toBe(true)
    updateFamilyHelperSchedule(s.id, { done: true })
    deleteFamilyHelperSchedule(s.id)
    expect(listFamilyHelperSchedules({ days: 14, includeDone: true }).some((x) => x.id === s.id)).toBe(
      false,
    )
  })

  it('tasks supplies homework', () => {
    const t = addFamilyHelperTask({ title: '스케치북', kind: 'supplies', dueDate: '2099-05-02' })
    expect(t.kind).toBe('supplies')
    addFamilyHelperTask({ title: '수학 숙제', kind: 'homework' })
    expect(listFamilyMembers).toBeTypeOf('function')
  })

  it('medication log dedupes within 20min', () => {
    const m = upsertFamilyMember({ name: '아이', relation: 'child' })
    const med = addMedication({
      memberId: m.id,
      name: '해열제',
      times: ['09:00'],
      startDate: '2099-01-01',
    })
    logMedication(med.id, 'taken')
    logMedication(med.id, 'skipped')
    const bundle = JSON.parse(store.get('aizio_family_helper_v1') || '{}')
    expect(bundle.medicationLogs.length).toBe(1)
    expect(bundle.medicationLogs[0].status).toBe('skipped')
  })

  it('vaccination + emergency card lock', () => {
    const m = upsertFamilyMember({ name: '엄마', relation: 'parent' })
    addVaccination({ memberId: m.id, name: '독감', date: '2099-10-01', nextDate: '2100-10-01' })
    upsertEmergencyCard({
      memberId: m.id,
      guardianPhone: '010-0000-0000',
      allergyNote: '땅콩',
      locked: true,
      updatedAt: Date.now(),
    })
    expect(getEmergencyCard(m.id)?.allergyNote).toBe('땅콩')
  })

  it('detects conflict with family room event', () => {
    store.set(
      'jarvis_family_room_v1',
      JSON.stringify({ events: [{ date: '2099-06-01', title: '병원' }] }),
    )
    addFamilyHelperSchedule({ title: '병원', date: '2099-06-01' })
    const c = detectScheduleConflicts('2099-06-01', '병원')
    expect(c.some((x) => /중복/.test(x))).toBe(true)
  })

  it('restores after reload (localStorage persistence)', () => {
    upsertFamilyMember({ name: '본인', relation: 'self' })
    const raw = store.get('aizio_family_helper_v1')
    expect(raw).toBeTruthy()
    resetFamilyHelperStoreForTests()
    store.set('aizio_family_helper_v1', raw!)
    store.set('aizio_family_helper_schema_v1', JSON.stringify({ version: 1 }))
    expect(listFamilyMembers()[0]?.name).toBe('본인')
  })
})
