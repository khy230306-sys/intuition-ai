import { loadStoreList, saveStoreList } from '../lifeRepository'
import { addTimelineEvent } from '../timeline/timelineService'
import { lifeId, nowIso } from '../types'

export type TravelPlan = {
  id: string
  title: string
  notes: string
  checklist: string[]
  budgetPlan: string
  createdAt: string
  updatedAt: string
}

const KEY = 'aizio_life_travel_v1'
const SCHEMA = 1

export function createTravelPlan(title: string, notes = ''): TravelPlan {
  const now = nowIso()
  const plan: TravelPlan = {
    id: lifeId('trv'),
    title: title.slice(0, 80),
    notes,
    checklist: ['여권/신분증', '숙소', '교통', '충전기', '비상연락'],
    budgetPlan: '',
    createdAt: now,
    updatedAt: now,
  }
  const items = loadStoreList<TravelPlan>(KEY, SCHEMA)
  items.unshift(plan)
  saveStoreList(KEY, SCHEMA, items, 40)
  addTimelineEvent({
    type: 'travel',
    title: `여행 계획: ${plan.title}`,
    summary: notes.slice(0, 120),
    sourceId: plan.id,
    sourceType: 'travel',
  })
  return plan
}

export function formatTravelPlans(): string {
  const items = loadStoreList<TravelPlan>(KEY, SCHEMA)
  if (!items.length) return '여행 계획이 없습니다. 실시간 항공·호텔은 미연결입니다.'
  return [
    '【여행 계획 · 로컬】',
    ...items.slice(0, 10).map((p) => `• ${p.title}\n  준비물: ${p.checklist.join(', ')}`),
    '※ 실시간 예약/환율 API 미연결',
  ].join('\n')
}
