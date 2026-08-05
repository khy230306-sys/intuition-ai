import type { AutomationAction } from './automationTypes'

const BLOCKED = /결제|주문|송금|이체|카드|대출|자동\s*결제|문자\s*보내|메시지\s*전송|전화\s*걸|외부\s*공유/i

export function isAutomationTextSafe(text: string): boolean {
  return !BLOCKED.test(text)
}

export function sanitizeActions(actions: AutomationAction[]): AutomationAction[] {
  return actions.map((a) => {
    if (a.kind === 'create_reminder' && a.payload?.text && BLOCKED.test(a.payload.text)) {
      return { kind: 'noop_blocked', label: '위험 행동 차단됨' }
    }
    return a
  })
}

export function assertNoPaidApiAuto(): string {
  return '유료 API는 자동화로 자동 호출하지 않습니다.'
}
