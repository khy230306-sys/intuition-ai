/**
 * Emergency mode — never claims auto-call or auto location share.
 * Distinguishes real distress cues from casual “살려줘”.
 */

export type EmergencyAssessment = {
  level: 'none' | 'possible' | 'likely'
  reasons: string[]
  showPanel: boolean
}

const CASUAL_RE =
  /문제\s*너무\s*어려|숙제|시험|버그|코드|디버그|이\s*문제|살려줘\s*좀\s*도와|미팅|야근/i

const LIKELY_RE =
  /119|112|救急|emergency|숨\s*을?\s*못\s*쉬|숨을\s*못|피가\s*나|쓰러졌|위험해|도와줘\s*긴급|긴급\s*상황|살려줘/i

const HELP_RE = /도와줘|help|긴급/i

export function assessEmergencyUtterance(text: string): EmergencyAssessment {
  const t = text.trim()
  if (!t) return { level: 'none', reasons: [], showPanel: false }

  // Casual hardship without medical/crime cues
  if (CASUAL_RE.test(t) && !/119|112|숨|피|쓰러|경찰/.test(t)) {
    return { level: 'none', reasons: ['일상 표현으로 판단'], showPanel: false }
  }

  if (/119|112/.test(t) || (/숨/.test(t) && /못/.test(t)) || /쓰러졌|피가\s*나/.test(t)) {
    return {
      level: 'likely',
      reasons: ['긴급 번호 또는 신체 위험 단서'],
      showPanel: true,
    }
  }

  if (LIKELY_RE.test(t) && t.length < 40) {
    return { level: 'possible', reasons: ['짧은 긴급 표현'], showPanel: true }
  }

  if (HELP_RE.test(t) && t.length <= 12) {
    return { level: 'possible', reasons: ['도움 요청'], showPanel: true }
  }

  return { level: 'none', reasons: [], showPanel: false }
}

export type EmergencyCard = {
  title: string
  priorityAdvice: string
  numbers: Array<{ label: string; tel: string }>
  disclaimers: string[]
  testMode: boolean
}

export function buildEmergencyCard(opts?: { region?: string; testMode?: boolean }): EmergencyCard {
  const region = opts?.region || 'KR'
  const numbers =
    region === 'KR'
      ? [
          { label: '화재·구급 (119)', tel: '119' },
          { label: '경찰 (112)', tel: '112' },
        ]
      : [
          { label: 'Emergency', tel: '112' },
          { label: 'Local emergency', tel: '911' },
        ]
  return {
    title: '비상 도움 (테스트/안내)',
    priorityAdvice: '실제 위급 시 즉시 현지 긴급전화로 직접 연락하세요. AIZIO는 긴급서비스를 대체하지 않습니다.',
    numbers,
    disclaimers: [
      '전화가 자동으로 연결되지 않습니다. 버튼을 누르면 전화 앱이 열릴 수 있습니다.',
      '위치가 자동 전송되지 않습니다. OS 권한과 사용자 확인이 필요합니다.',
      '의료·법률 자문이 아닙니다.',
    ],
    testMode: opts?.testMode !== false,
  }
}

export function formatEmergencyHelp(text: string): string {
  const a = assessEmergencyUtterance(text)
  if (!a.showPanel) {
    return '긴급 모드로 보이지 않습니다. 위급하면 즉시 119/112에 전화하세요.'
  }
  const card = buildEmergencyCard({ testMode: true })
  return [
    `【${card.title}】`,
    card.priorityAdvice,
    `판단: ${a.level} (${a.reasons.join(', ')})`,
    '',
    ...card.numbers.map((n) => `• ${n.label} → tel:${n.tel}`),
    '',
    ...card.disclaimers.map((d) => `※ ${d}`),
  ].join('\n')
}
