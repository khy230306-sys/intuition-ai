import { assertNoPaidApiAuto, isAutomationTextSafe, sanitizeActions } from './automationPolicy'
import type { AutomationAction, AutomationV2 } from './automationTypes'
import { los2Id, nowIso } from '../repository'

/** Build a plan from natural language — does not execute until approved. */
export function planAutomationFromText(text: string): { plan: AutomationV2; summary: string } | { error: string } {
  if (!isAutomationTextSafe(text)) {
    return { error: '결제·주문·금융·외부 메시지 자동 발송은 자동화에 넣을 수 없습니다.' }
  }

  const actions: AutomationAction[] = []
  if (/길\s*안내|집\s*으로|내비|네비/.test(text)) {
    actions.push({
      kind: 'prepare_navigation',
      label: 'Navigation 목적지 준비',
      payload: { destination: /집/.test(text) ? '집' : '목적지' },
    })
  }
  if (/음악|잔잔|조용/.test(text)) {
    actions.push({
      kind: 'prepare_music',
      label: '음악 준비',
      payload: { mood: 'calm' },
    })
  }
  if (/브리핑|요약/.test(text)) {
    actions.push({ kind: 'show_brief', label: '브리핑 표시' })
  }
  if (/할\s*일|투두/.test(text)) {
    actions.push({ kind: 'show_todos', label: '할 일 표시' })
  }
  if (/가족/.test(text)) {
    actions.push({ kind: 'show_family', label: '가족 일정 표시' })
  }
  if (/집중/.test(text)) {
    actions.push({ kind: 'start_focus', label: 'Focus 시작' })
  }
  if (/알림|리마인더/.test(text)) {
    actions.push({
      kind: 'create_reminder',
      label: '리마인더 생성',
      payload: { text: '자동화 알림' },
    })
  }

  if (!actions.length) {
    return { error: '인식된 Action이 없습니다. 예: 「퇴근하면 집으로 길 안내하고 잔잔한 음악 준비해줘」' }
  }

  const safe = sanitizeActions(actions)
  const triggerPhrase = /퇴근/.test(text) ? '퇴근' : /출근/.test(text) ? '출근' : 'manual'
  const plan: AutomationV2 = {
    id: los2Id('auto'),
    name: text.slice(0, 40),
    trigger: {
      kind: triggerPhrase === 'manual' ? 'manual' : 'phrase',
      phrase: triggerPhrase === 'manual' ? undefined : triggerPhrase,
    },
    actions: safe,
    enabled: false,
    approved: false,
    createdAt: nowIso(),
    lastRunAt: null,
  }

  const summary = [
    '【자동화 실행 계획 · 미승인】',
    `이름: ${plan.name}`,
    `Trigger: ${plan.trigger.kind}${plan.trigger.phrase ? ` (${plan.trigger.phrase})` : ''}`,
    'Actions:',
    ...plan.actions.map((a, i) => `  ${i + 1}. ${a.label} [${a.kind}]`),
    assertNoPaidApiAuto(),
    '저장하려면 「자동화 저장」또는 「자동화 승인」이라고 말해 주세요. 승인 전 실행하지 않습니다.',
  ].join('\n')

  return { plan, summary }
}
