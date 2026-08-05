import { isLifeOs2Enabled } from '../featureFlags'
import { emitLifeOs2Event } from '../lifeEventBus'
import { planAutomationFromText } from './automationPlanner'
import {
  formatRun,
  loadAutomations,
  runAutomation,
  saveAutomations,
} from './automationRunner'
import type { AutomationV2 } from './automationTypes'

let pendingPlan: AutomationV2 | null = null

export function getPendingAutomationPlan(): AutomationV2 | null {
  return pendingPlan
}

export async function handleAutomationUtteranceAsync(text: string): Promise<string | null> {
  if (!isLifeOs2Enabled('automation2Enabled')) return null

  if (/자동화\s*중지|자동화\s*꺼|자동화\s*비활성/.test(text)) {
    const all = loadAutomations()
    for (const a of all) a.enabled = false
    saveAutomations(all)
    return '모든 자동화를 중지(비활성)했습니다. 데이터는 삭제하지 않았습니다.'
  }

  if (/자동화\s*(저장|승인|등록)/.test(text)) {
    if (!pendingPlan) return '저장할 자동화 계획이 없습니다. 먼저 자동화 문장을 말해 주세요.'
    pendingPlan.approved = true
    pendingPlan.enabled = true
    const all = loadAutomations()
    all.unshift(pendingPlan)
    saveAutomations(all)
    emitLifeOs2Event('automation.planned', { id: pendingPlan.id })
    const id = pendingPlan.id
    pendingPlan = null
    return `자동화를 저장하고 활성화했습니다. (id: ${id})`
  }

  if (/자동화\s*실행|자동화\s*돌려/.test(text)) {
    const all = loadAutomations().filter((a) => a.enabled && a.approved)
    const hit = all[0]
    if (!hit) return '실행 가능한 승인된 자동화가 없습니다.'
    const run = await runAutomation(hit)
    emitLifeOs2Event('automation.ran', { overall: run.overall })
    return formatRun(run)
  }

  if (/퇴근이야|퇴근해/.test(text)) {
    const all = loadAutomations().filter((a) => a.enabled && a.approved && a.trigger.phrase === '퇴근')
    if (all[0]) {
      const run = await runAutomation(all[0])
      emitLifeOs2Event('automation.ran', { overall: run.overall })
      return formatRun(run)
    }
    return null
  }

  if (/자동화|퇴근하면|하면\s*.*길\s*안내|하면\s*.*음악/.test(text)) {
    const planned = planAutomationFromText(text)
    if ('error' in planned) return planned.error
    pendingPlan = planned.plan
    emitLifeOs2Event('automation.planned', { draft: true })
    return planned.summary
  }

  return null
}

export { planAutomationFromText, loadAutomations }
