import { emitLifeOs2Event } from '../lifeEventBus'
import { loadHabits, saveHabits } from './habitRepository'
import { refreshHabitCandidates, formatHabitList } from './habitDetector'
import type { HabitRecord } from './habitTypes'

export function suggestHabitCandidates(): { text: string; habits: HabitRecord[] } {
  const habits = refreshHabitCandidates().filter((h) => h.status === 'candidate')
  if (!habits.length) {
    return { text: formatHabitList(), habits: [] }
  }
  const h = habits[0]
  const hour = h.pattern.hourHint != null ? `오전/오후 ${h.pattern.hourHint}시쯤` : '자주'
  const text = [
    formatHabitList(habits),
    '',
    `제안: ${hour} 「${h.label}」 패턴이 보여요. 습관으로 저장할까요?`,
    '「습관 확인」또는 「습관 거절」이라고 말해 주세요. 동의 전 자동 실행하지 않습니다.',
  ].join('\n')
  emitLifeOs2Event('habit.candidate', { id: h.id })
  return { text, habits }
}

export function confirmHabit(hint?: string): string {
  const habits = loadHabits()
  const h =
    habits.find((x) => x.status === 'candidate' && (!hint || x.label.includes(hint) || x.id === hint)) ||
    habits.find((x) => x.status === 'candidate')
  if (!h) return '확인할 습관 후보가 없습니다.'
  h.status = 'confirmed'
  h.userConfirmed = true
  saveHabits(habits)
  emitLifeOs2Event('habit.confirmed', { id: h.id })
  return `습관 「${h.label}」을(를) 확인했습니다. Routine으로 연결하려면 말씀해 주세요.`
}

export function rejectHabit(hint?: string): string {
  const habits = loadHabits()
  const h =
    habits.find((x) => x.status === 'candidate' && (!hint || x.label.includes(hint) || x.id === hint)) ||
    habits.find((x) => x.status === 'candidate')
  if (!h) return '거절할 습관 후보가 없습니다.'
  h.status = 'ignored'
  h.userConfirmed = false
  saveHabits(habits)
  emitLifeOs2Event('habit.rejected', { id: h.id })
  return `습관 「${h.label}」제안을 거절했습니다. 다시 제안하지 않습니다.`
}
