/**
 * Family Helper → traveler candidates (no auto-fill of legal passport fields).
 */

import { listFamilyMembers } from '../family-helper/store'

export type TravelerCandidate = {
  memberId: string
  displayName: string
  relation: string
}

export function listTravelerCandidates(): TravelerCandidate[] {
  try {
    return listFamilyMembers().map((m) => ({
      memberId: m.id,
      displayName: m.name,
      relation: m.relation,
    }))
  } catch {
    return []
  }
}

export function formatTravelerCandidates(): string {
  const list = listTravelerCandidates()
  if (!list.length) return ''
  return (
    '가족 구성원 후보: ' +
    list.map((m) => m.displayName).join(', ') +
    '\n※ 실제 항공 예약 시 영문 이름·생년월일·성별은 별도로 확인해 주세요.'
  )
}
