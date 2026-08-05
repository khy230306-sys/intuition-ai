import { getActiveFocus } from './focus/focusSession'
import { getPendingAutomationPlan } from './automation/automationEngine2'
import { loadLifeOs2Flags } from './featureFlags'

export type LifeOs2RuntimeState = {
  focusActive: boolean
  pendingAutomation: boolean
  flags: ReturnType<typeof loadLifeOs2Flags>
}

export function getLifeOs2State(): LifeOs2RuntimeState {
  return {
    focusActive: Boolean(getActiveFocus()),
    pendingAutomation: Boolean(getPendingAutomationPlan()),
    flags: loadLifeOs2Flags(),
  }
}
