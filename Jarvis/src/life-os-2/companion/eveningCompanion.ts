import { fuseContext } from '../context-fusion/contextFusionEngine'
import { loadFocusSessions } from '../focus/focusSession'
import { companionAllowed, rememberCompanion, wasSameCompanionRecently } from './companionPolicy'

export function buildEveningCompanion(): string {
  if (!companionAllowed('evening')) {
    return 'Evening Companion이 꺼져 있거나 방해 금지 시간입니다.'
  }
  const ctx = fuseContext({ force: true })
  if (!ctx) return 'Context를 만들 수 없습니다.'

  const lines: string[] = ['오늘 하루를 정리해 볼게요.']

  const today = new Date().toISOString().slice(0, 10)
  const focusDone = loadFocusSessions().filter(
    (s) => s.status === 'completed' && s.endedAt?.startsWith(today),
  )
  const focusMins = focusDone.reduce((a, s) => a + (s.completedMinutes || 0), 0)
  if (focusMins > 0) lines.push(`집중 기록: 약 ${focusMins}분`)

  const activeGoals = ctx.goals.filter((g) => g.status === 'active')
  if (activeGoals.length) {
    lines.push(
      `목표: ${activeGoals
        .slice(0, 3)
        .map((g) => `${g.title} ${Math.round(g.progress * 100)}%`)
        .join(', ')}`,
    )
  }

  if (ctx.today.reminders.length) {
    lines.push(`아직 남은 할 일·알림 ${ctx.today.reminders.length}건`)
  }

  const stalled = ctx.projects.filter((p) => p.status === 'active' && p.stalledDays >= 3)
  if (stalled.length) {
    lines.push(`정체 프로젝트 신호: ${stalled.map((p) => p.name).join(', ')}`)
  }

  if (ctx.routines.includes('잘 자')) {
    lines.push('취침 Routine 「잘 자」를 실행해 볼까요?')
  }

  if (lines.length === 1) lines.push('오늘 기록된 완료·미완료 항목이 거의 없어 짧게 마무리합니다.')

  const text = lines.join('\n')
  const fp = `evening:${ctx.generatedAt.slice(0, 10)}:${focusMins}:${ctx.today.reminders.length}`
  if (wasSameCompanionRecently(fp)) {
    return text
  }
  rememberCompanion('evening', text, fp)
  return text
}
