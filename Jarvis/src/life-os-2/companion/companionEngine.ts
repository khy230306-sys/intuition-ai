import { isLifeOs2Enabled } from '../featureFlags'
import { emitLifeOs2Event } from '../lifeEventBus'
import { buildMorningCompanion } from './morningCompanion'
import { buildEveningCompanion } from './eveningCompanion'
import { saveCompanionPrefs } from './companionPolicy'

export function handleCompanionQuery(text: string): string | null {
  if (!isLifeOs2Enabled('companionEnabled')) return null

  if (/컴패니언\s*꺼|모닝\s*브리프\s*꺼|저녁\s*요약\s*꺼/.test(text)) {
    saveCompanionPrefs({ morningEnabled: false, eveningEnabled: false })
    return 'Companion을 껐습니다. 데이터는 유지됩니다.'
  }
  if (/컴패니언\s*켜/.test(text)) {
    saveCompanionPrefs({ morningEnabled: true, eveningEnabled: true })
    return 'Companion을 켰습니다.'
  }

  if (/모닝|아침\s*브리프|morning\s*companion|좋은\s*아침\s*요약/i.test(text)) {
    const t = buildMorningCompanion()
    emitLifeOs2Event('companion.morning', {})
    return t
  }
  if (/저녁\s*요약|이브닝|오늘\s*정리|evening\s*summary/i.test(text)) {
    const t = buildEveningCompanion()
    emitLifeOs2Event('companion.evening', {})
    return t
  }
  return null
}

export { buildMorningCompanion, buildEveningCompanion }
