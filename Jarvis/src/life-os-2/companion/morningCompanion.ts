import { fuseContext } from '../context-fusion/contextFusionEngine'
import { loadSettings } from '../../storage'
import { companionAllowed, rememberCompanion, wasSameCompanionRecently } from './companionPolicy'

export function buildMorningCompanion(opts?: { explicitRequest?: boolean }): string {
  if (!companionAllowed('morning', { bypassQuietHours: !!opts?.explicitRequest })) {
    return 'Morning Companion이 꺼져 있거나 방해 금지 시간입니다.'
  }
  const ctx = fuseContext({ force: true })
  if (!ctx) return 'Context를 만들 수 없습니다.'

  const name = loadSettings().displayName
  const lines: string[] = [`좋은 아침입니다, ${name}.`]

  if (ctx.today.reminders.length) {
    lines.push('오늘 일정·할 일:')
    lines.push(...ctx.today.reminders.slice(0, 4).map((r, i) => `${i + 1}. ${r}`))
  }
  if (ctx.today.familyEvents.length) {
    lines.push(`가족: ${ctx.today.familyEvents.slice(0, 3).join(', ')}`)
  }
  const g = ctx.goals.find((x) => x.status === 'active')
  if (g) lines.push(`목표 다음: 「${g.title}」 (${Math.round(g.progress * 100)}%)`)
  const p = ctx.projects.find((x) => x.status === 'active')
  if (p) {
    lines.push(
      `프로젝트: ${p.name}${p.stalledDays >= 3 ? ` · ${p.stalledDays}일 정체 신호` : ''}`,
    )
  }
  // Weather / commute only if present — never invent
  lines.push('날씨·출근 예상시간은 실시간 연동이 있을 때만 표시합니다. (현재 Context에 없음 → 생략)')

  const text = lines.join('\n')
  const fp = `morning:${ctx.generatedAt.slice(0, 10)}:${ctx.today.reminders.length}`
  if (wasSameCompanionRecently(fp)) {
    return `${text}\n(같은 요약을 짧게 유지합니다.)`
  }
  rememberCompanion('morning', text, fp)
  return text
}
