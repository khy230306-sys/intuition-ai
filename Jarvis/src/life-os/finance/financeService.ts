import { hasConsent } from '../consentManager'
import { looksLikeForbiddenSecret } from '../privacyPolicy'
import { loadStoreList, saveStoreList } from '../lifeRepository'
import { lifeId, nowIso } from '../types'

export type FinanceRecord = {
  id: string
  kind: 'expense' | 'budget' | 'subscription' | 'saving_goal'
  label: string
  amount: number
  createdAt: string
}

const KEY = 'aizio_life_finance_v1'
const SCHEMA = 1

export function addFinanceRecord(
  kind: FinanceRecord['kind'],
  label: string,
  amount: number,
): { ok: boolean; message: string } {
  if (!hasConsent('finance')) return { ok: false, message: '재무 기록 동의가 꺼져 있습니다.' }
  if (looksLikeForbiddenSecret(label)) {
    return { ok: false, message: '계좌·카드 등 민감정보는 저장하지 않습니다.' }
  }
  if (!Number.isFinite(amount)) return { ok: false, message: '금액이 올바르지 않습니다.' }
  const items = loadStoreList<FinanceRecord>(KEY, SCHEMA)
  items.unshift({
    id: lifeId('fin'),
    kind,
    label: label.slice(0, 80),
    amount,
    createdAt: nowIso(),
  })
  saveStoreList(KEY, SCHEMA, items, 300)
  return { ok: true, message: `재무 기록을 저장했습니다 (${kind} ${amount}). 은행 연결·자동결제는 없습니다.` }
}

export function formatFinanceSummary(): string {
  const items = loadStoreList<FinanceRecord>(KEY, SCHEMA)
  const expenses = items.filter((i) => i.kind === 'expense')
  const sum = expenses.reduce((a, b) => a + b.amount, 0)
  return [
    '【재무 · 수동 기록】',
    `지출 합계(기록분): ${sum}`,
    ...items.slice(0, 12).map((i) => `• ${i.kind} ${i.label}: ${i.amount}`),
    '※ 투자 주문·자동 결제·은행 연동 없음',
  ].join('\n')
}
