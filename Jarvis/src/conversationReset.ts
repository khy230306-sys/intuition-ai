/**
 * Shared conversation reset — used by Global Commands and UI 「대화 초기화」.
 * Clears dialog/task state only. Never touches API keys, theme, settings, long-term memory.
 */

import { clearAllTasks, getActiveTask, cancelActiveTask } from './actionAgent/sessionStore'
import { endTranslationSession, getActiveMode } from './commandRouter/session'
import { clearChat } from './storage'
import { clearTravelSession } from './travelAgent/session'

export type ResetScope = 'clear_chat' | 'reset_conversation' | 'cancel_task' | 'reset_task'

export type ResetResult = {
  scope: ResetScope
  clearedChat: boolean
  clearedTasks: boolean
  cancelledTaskLabel: string | null
  message: string
}

function clearTaskSessions(): string | null {
  const active = getActiveTask()
  const label = active?.label || null
  clearAllTasks()
  try {
    clearTravelSession()
  } catch {
    /* optional legacy session */
  }
  return label
}

/**
 * Reset conversation-scoped state.
 * Preserves: API keys, provider config, theme, app settings, persistent memory.
 */
export function resetConversationState(scope: ResetScope = 'reset_conversation'): ResetResult {
  if (scope === 'cancel_task') {
    const c = cancelActiveTask()
    const travel = c?.type?.startsWith('travel')
    return {
      scope,
      clearedChat: false,
      clearedTasks: Boolean(c),
      cancelledTaskLabel: c?.label || null,
      message: c
        ? travel
          ? '진행 중이던 여행 준비를 취소했어요.'
          : `진행 중이던 ${c.label}을(를) 취소했어요.`
        : '취소할 작업이 없어요.',
    }
  }

  if (scope === 'reset_task') {
    const label = clearTaskSessions()
    return {
      scope,
      clearedChat: false,
      clearedTasks: true,
      cancelledTaskLabel: label,
      message: label
        ? `진행 중이던 ${label}을(를) 초기화했어요.`
        : '진행 중인 작업이 없어요.',
    }
  }

  // CLEAR_CHAT / RESET_CONVERSATION / NEW_CONVERSATION
  const label = clearTaskSessions()
  if (getActiveMode() === 'translation') {
    try {
      endTranslationSession()
    } catch {
      /* optional */
    }
  }
  clearChat()

  return {
    scope,
    clearedChat: true,
    clearedTasks: true,
    cancelledTaskLabel: label,
    message:
      scope === 'clear_chat'
        ? '대화창을 지우고 진행 중이던 작업을 종료했어요.'
        : '대화를 초기화했어요. 이어서 말씀해 주세요.',
  }
}

export function executeGlobalCommandReset(
  command:
    | 'CLEAR_CHAT'
    | 'RESET_CONVERSATION'
    | 'CANCEL_ACTIVE_TASK'
    | 'RESET_ACTIVE_TASK'
    | 'NEW_CONVERSATION',
): ResetResult {
  if (command === 'CANCEL_ACTIVE_TASK') return resetConversationState('cancel_task')
  if (command === 'RESET_ACTIVE_TASK') return resetConversationState('reset_task')
  if (command === 'CLEAR_CHAT') return resetConversationState('clear_chat')
  return resetConversationState('reset_conversation')
}
