import { hasAnyConfiguredProvider, runHybridChat } from '../../ai-providers'
import { isLifeFeatureEnabled } from '../featureFlags'
import { loadStoreList, saveStoreList } from '../lifeRepository'
import { composeLocalMeeting, formatMeeting, mergeAiMeetingOverlay } from './meetingComposer'
import type { MeetingResult } from './meetingTypes'

const KEY = 'aizio_life_meetings_v1'
const SCHEMA = 1

export async function runAiMeeting(topic: string): Promise<{ text: string; result: MeetingResult }> {
  if (!isLifeFeatureEnabled('aiMeetingEnabled')) {
    const blocked = composeLocalMeeting(topic)
    return {
      text: 'AI 회의 기능이 꺼져 있습니다. Feature Flag `aiMeetingEnabled`를 켜 주세요.',
      result: blocked,
    }
  }
  let result = composeLocalMeeting(topic)
  if (hasAnyConfiguredProvider()) {
    try {
      const prompt = [
        '다음 주제를 기획/개발/UX/보안/운영/검수 관점으로 짧게 검토하고,',
        '반대 의견과 다음 행동 3개를 한국어로 정리하세요. 한 번의 답변으로만.',
        `주제: ${topic}`,
      ].join('\n')
      const ai = await runHybridChat({
        message: prompt,
        history: [],
        displayName: 'AIZIO',
        locale: 'ko-KR',
      })
      result = mergeAiMeetingOverlay(result, ai.text)
    } catch {
      result = {
        ...result,
        providerNote: 'AI 호출 실패 — 로컬 템플릿만 사용',
      }
    }
  }
  const items = loadStoreList<MeetingResult>(KEY, SCHEMA)
  items.unshift(result)
  saveStoreList(KEY, SCHEMA, items, 40)
  return { text: formatMeeting(result), result }
}
