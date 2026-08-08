/**
 * Automatic Cloud ↔ Local AI router.
 * User never picks a mode — connection + pack state decide.
 */

import { getNetStatus, type NetStatus } from '../offline/networkStatus'
import { hasAnyConfiguredProvider } from '../ai-providers'
import { isChatModelInstalled } from './packState'
import { localAiChat } from './localAiRuntime'
import { offlineNetworkRefusal } from './hallucinationGuard'
import { aizioLocalChat } from '../aizioAi/localConversation'

export type AiRouteEngine = 'cloud' | 'local-model' | 'local-rules' | 'offline-refuse'

export function pickAiEngine(net: NetStatus = getNetStatus()): AiRouteEngine {
  const online = net === 'online' || net === 'degraded'
  if (online && hasAnyConfiguredProvider()) return 'cloud'
  if (isChatModelInstalled()) return 'local-model'
  return 'local-rules'
}

export async function runRoutedChat(input: {
  message: string
  history?: Array<{ role: string; text: string }>
  displayName?: string
  /** Injected cloud runner — avoids circular imports */
  runCloud?: () => Promise<{ text: string } | null>
}): Promise<{ text: string; engine: AiRouteEngine; speak: boolean }> {
  const net = getNetStatus()
  const offline = net === 'offline' || net === 'captive'

  if (offline) {
    const refusal = offlineNetworkRefusal(input.message)
    if (refusal) return { text: refusal, engine: 'offline-refuse', speak: true }
  }

  const engine = pickAiEngine(net)

  if (engine === 'cloud' && input.runCloud) {
    try {
      const cloud = await input.runCloud()
      if (cloud?.text) return { text: cloud.text, engine: 'cloud', speak: true }
    } catch {
      /* fall through */
    }
    // Degraded / cloud fail → local model or rules
    if (isChatModelInstalled()) {
      const local = await localAiChat(input)
      if ('text' in local) return { text: local.text, engine: 'local-model', speak: true }
    }
    const rules = await aizioLocalChat({
      text: input.message,
      history: input.history,
      displayName: input.displayName,
    })
    return { text: rules.text, engine: 'local-rules', speak: rules.speak }
  }

  if (engine === 'local-model' || (offline && isChatModelInstalled())) {
    const local = await localAiChat(input)
    if ('text' in local) return { text: local.text, engine: 'local-model', speak: true }
    // Model error — rules, never crash
    const rules = await aizioLocalChat({
      text: input.message,
      history: input.history,
      displayName: input.displayName,
    })
    const hint =
      'error' in local && local.needInstall
        ? `\n\n(${local.error})`
        : 'error' in local
          ? `\n\n(${local.error})`
          : ''
    return { text: rules.text + hint, engine: 'local-rules', speak: true }
  }

  // Offline without model: deterministic rules + clear capability
  const rules = await aizioLocalChat({
    text: input.message,
    history: input.history,
    displayName: input.displayName,
  })
  if (offline && /심심|퀴즈|바꿔|다듬|요약|설명|아이디어|자연스럽/i.test(input.message)) {
    return {
      text:
        rules.text +
        '\n\n오프라인 AI 모델이 없으면 고품질 문장 생성은 제한돼요. 설정 → AIZIO Anywhere에서 모델을 설치하면 비행기 모드에서도 더 자유롭게 대화할 수 있어요.',
      engine: 'local-rules',
      speak: true,
    }
  }
  return { text: rules.text, engine: 'local-rules', speak: rules.speak }
}

export function engineBadgeLabel(engine: AiRouteEngine, net: NetStatus = getNetStatus()): string {
  if (net === 'offline' || net === 'captive') return 'Local'
  if (engine === 'cloud') return 'Cloud'
  if (engine === 'local-model') return 'Local'
  return net === 'online' ? 'Cloud' : 'Local'
}
