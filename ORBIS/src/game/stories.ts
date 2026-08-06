import type { OrbId, SyncGrade } from './types'

type StorySet = Record<SyncGrade, { ko: string; en: string }>

const stories: Record<OrbId, StorySet> = {
  blue: {
    perfect: {
      ko: 'BLUE 궤도가 완벽하게 동기화되었습니다. 선명한 통찰이 CORE를 관통합니다.',
      en: 'BLUE orbit synced perfectly. Clear insight cuts through the CORE.',
    },
    great: {
      ko: 'BLUE의 흐름이 안정적으로 이어집니다. 다음 라운드의 길이 열립니다.',
      en: 'BLUE flow holds steady. A path for the next round opens.',
    },
    good: {
      ko: 'BLUE 에너지가 응답했습니다. 조금 더 집중하면 완벽한 공명이 가능합니다.',
      en: 'BLUE energy answered. A little more focus can unlock perfect resonance.',
    },
    miss: {
      ko: 'BLUE 궤도를 스쳐 지나갔습니다. 호흡을 고르고 다시 동기화하세요.',
      en: 'You grazed the BLUE orbit. Settle your breath and sync again.',
    },
  },
  gold: {
    perfect: {
      ko: 'GOLD 중심이 균형을 완성했습니다. 가치 있는 리듬이 궤도에 새겨집니다.',
      en: 'GOLD center found perfect balance. A valued rhythm is etched into orbit.',
    },
    great: {
      ko: 'GOLD의 안정된 빛이 퍼집니다. 이번 라운드는 단단한 기반을 남깁니다.',
      en: 'GOLD’s steady light expands. This round leaves a solid foundation.',
    },
    good: {
      ko: 'GOLD가 부드럽게 응답했습니다. 균형의 감각을 조금 더 끌어올려 보세요.',
      en: 'GOLD answered softly. Lift the sense of balance a little higher.',
    },
    miss: {
      ko: 'GOLD 궤도가 흔들렸습니다. 중심을 다시 잡고 다음 이야기를 이어가세요.',
      en: 'The GOLD orbit wavered. Recenter and continue the next story.',
    },
  },
  violet: {
    perfect: {
      ko: 'VIOLET이 신비로운 전환을 열었습니다. 예상치 못한 가능성이 빛납니다.',
      en: 'VIOLET opened a mystical shift. Unexpected possibility begins to shine.',
    },
    great: {
      ko: 'VIOLET의 직관이 길을 비춥니다. 변화의 문턱을 우아하게 넘었습니다.',
      en: 'VIOLET intuition lights the path. You crossed the threshold of change.',
    },
    good: {
      ko: 'VIOLET 에너지가 희미하게 닿았습니다. 직관을 믿고 한 번 더 도전하세요.',
      en: 'VIOLET energy brushed lightly. Trust intuition and try once more.',
    },
    miss: {
      ko: 'VIOLET 궤도가 흩어졌습니다. 새로운 가능성은 다음 동기화에서 기다립니다.',
      en: 'The VIOLET orbit scattered. New possibility waits in the next sync.',
    },
  },
}

export function getStoryText(
  orb: OrbId,
  grade: SyncGrade,
  language: 'ko' | 'en',
): string {
  return stories[orb][grade][language]
}

export function storyKey(orb: OrbId, grade: SyncGrade): string {
  return `${orb}.${grade}`
}
