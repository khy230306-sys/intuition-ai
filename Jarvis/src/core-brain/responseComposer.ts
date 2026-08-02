import type { BrainReply } from '../types'
import { isAllowedExternalUrl } from './safetyPolicy'
import type { CoreBrainResult, SkillResult, UiAction } from './types'
import { userFacingBrainError } from './brainErrors'

function shortSpeak(text: string): string {
  const one = text.split('\n')[0] || text
  return one.length > 140 ? `${one.slice(0, 137)}…` : one
}

export function composeResponse(results: SkillResult[], warnings: string[] = []): {
  responseText: string
  speakText: string
  status: CoreBrainResult['status']
  uiActions: UiAction[]
  brainReply: BrainReply
} {
  const uiActions: UiAction[] = []
  const messages: string[] = []
  let brainReply: BrainReply = { text: '', speak: true }

  for (const r of results) {
    if (r.message) messages.push(r.message)
    if (r.uiActions) {
      for (const a of r.uiActions) {
        if (a.type === 'OPEN_EXTERNAL_URL' && !isAllowedExternalUrl(a.payload.url)) {
          warnings.push('차단된 외부 링크')
          continue
        }
        uiActions.push(a)
      }
    }
    if (r.brainPatch) {
      brainReply = { ...brainReply, ...r.brainPatch, text: r.brainPatch.text || r.message || brainReply.text }
    }
  }

  const anySuccess = results.some((r) => r.success && r.status !== 'unavailable')
  const anyUnavail = results.some((r) => r.status === 'unavailable')
  const anyFail = results.some((r) => r.status === 'failed' || r.status === 'cancelled')
  const needsUser = results.some((r) => r.status === 'needs_user_action')

  let status: CoreBrainResult['status'] = 'success'
  if (needsUser) status = 'needs_user_action'
  else if (anySuccess && anyUnavail) status = 'partial'
  else if (!anySuccess && anyUnavail) status = 'failed'
  else if (anyFail && !anySuccess) status = 'failed'
  else if (anyFail && anySuccess) status = 'partial'

  const responseText =
    messages.filter(Boolean).join('\n\n') ||
    (anyUnavail ? userFacingBrainError('no_skill_available') : userFacingBrainError('unexpected_error'))

  const speakFromSkill = results.map((r) => r.speakText).find(Boolean)
  const speakText = speakFromSkill || shortSpeak(responseText)

  // Apply first OPEN_ROUTE / CLEAR_CHAT / music / RUN_ACTION onto BrainReply
  for (const a of uiActions) {
    if (a.type === 'OPEN_ROUTE') {
      brainReply.view = a.payload.view
      if (a.payload.arcadeId) {
        brainReply.arcadeId = a.payload.arcadeId as BrainReply['arcadeId']
      }
    }
    if (a.type === 'CLEAR_CHAT') brainReply.clearChat = true
    if (a.type === 'SHOW_MUSIC_PLAYER') {
      brainReply.musicShowMiniPlayer = true
      brainReply.musicPlayUrl = a.payload.playUrl
      brainReply.musicNeedsGesture = a.payload.needsGesture
    }
    if (a.type === 'RUN_ACTION') {
      brainReply.action = a.payload.run
    }
  }

  brainReply.text = brainReply.text || responseText
  brainReply.speak = brainReply.speak !== false

  if (warnings.length) {
    // keep warnings internal to CoreBrainResult; do not dump tech jargon into chat
  }

  return { responseText, speakText, status, uiActions, brainReply }
}
