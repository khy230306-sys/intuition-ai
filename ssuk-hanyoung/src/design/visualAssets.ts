/**
 * Suksuk Visual Asset Registry V1
 * UI must reference keys here — never raw emoji strings.
 * Existing car WebP assets are preserved and registered.
 */

import { CHAR_IMG, CHAR_IMG_MD } from '../components/GameArt'

export type VisualKind = 'image' | 'svg'

export type VisualAsset = {
  key: string
  kind: VisualKind
  /** image src or svg id */
  src: string
  label: string
  fallbackColor: string
}

const SM = CHAR_IMG
const MD = CHAR_IMG_MD

export const VISUAL_ASSETS: Record<string, VisualAsset> = {
  // Vehicles (approved existing art)
  'vehicle.car': { key: 'vehicle.car', kind: 'image', src: SM.car, label: '자동차', fallbackColor: '#FF2D55' },
  'vehicle.bus': { key: 'vehicle.bus', kind: 'image', src: SM.bus, label: '버스', fallbackColor: '#FFD400' },
  'vehicle.busFront': { key: 'vehicle.busFront', kind: 'image', src: SM.busFront, label: '스쿨버스', fallbackColor: '#FFD400' },
  'vehicle.police': { key: 'vehicle.police', kind: 'image', src: SM.police, label: '경찰차', fallbackColor: '#2F6BFF' },
  'vehicle.firetruck': { key: 'vehicle.firetruck', kind: 'image', src: SM.fire, label: '소방차', fallbackColor: '#FF3B30' },
  'vehicle.ambulance': { key: 'vehicle.ambulance', kind: 'image', src: SM.ambulance, label: '구급차', fallbackColor: '#FFF8E7' },
  'vehicle.dump': { key: 'vehicle.dump', kind: 'image', src: SM.dump, label: '트럭', fallbackColor: '#FF7A00' },
  'vehicle.tractor': { key: 'vehicle.tractor', kind: 'image', src: SM.tractor, label: '트랙터', fallbackColor: '#22C55E' },

  // MD variants for stages
  'vehicle.car.md': { key: 'vehicle.car.md', kind: 'image', src: MD.car, label: '자동차', fallbackColor: '#FF2D55' },
  'vehicle.bus.md': { key: 'vehicle.bus.md', kind: 'image', src: MD.bus, label: '버스', fallbackColor: '#FFD400' },

  // Rewards / props
  'reward.star': { key: 'reward.star', kind: 'image', src: SM.star, label: '별', fallbackColor: '#FFD400' },
  'reward.paint': { key: 'reward.paint', kind: 'image', src: SM.paint, label: '팔레트', fallbackColor: '#FF8FAB' },
  'reward.drum': { key: 'reward.drum', kind: 'image', src: SM.drum, label: '북', fallbackColor: '#FF2D55' },
  'reward.sand': { key: 'reward.sand', kind: 'image', src: SM.sand, label: '모래', fallbackColor: '#E8B86D' },

  // Categories — svg illustrations
  'category.language': { key: 'category.language', kind: 'svg', src: 'book', label: '한글', fallbackColor: '#FF8FAB' },
  'category.math': { key: 'category.math', kind: 'svg', src: 'numbers', label: '수학', fallbackColor: '#5B8CFF' },
  'category.cognition': { key: 'category.cognition', kind: 'svg', src: 'brain', label: '두뇌', fallbackColor: '#A78BFA' },
  'category.science': { key: 'category.science', kind: 'svg', src: 'leaf', label: '과학', fallbackColor: '#3DDC84' },
  'category.creativity': { key: 'category.creativity', kind: 'svg', src: 'palette', label: '미술', fallbackColor: '#FF7A00' },
  'category.music': { key: 'category.music', kind: 'svg', src: 'notes', label: '음악', fallbackColor: '#FF4D6D' },
  'category.life': { key: 'category.life', kind: 'svg', src: 'heart', label: '생활', fallbackColor: '#FFD400' },
  'category.exploration': { key: 'category.exploration', kind: 'svg', src: 'compass', label: '탐험', fallbackColor: '#2F6BFF' },

  // UI chrome
  'ui.back': { key: 'ui.back', kind: 'svg', src: 'back', label: '뒤로', fallbackColor: '#1a1510' },
  'ui.speaker': { key: 'ui.speaker', kind: 'svg', src: 'speaker', label: '다시 듣기', fallbackColor: '#2F6BFF' },
  'ui.gift': { key: 'ui.gift', kind: 'svg', src: 'gift', label: '선물', fallbackColor: '#FF4D6D' },

  // Emotions (character faces use Character component; these are badge helpers)
  'emotion.happy': { key: 'emotion.happy', kind: 'svg', src: 'face-happy', label: '기쁨', fallbackColor: '#FFD400' },
  'emotion.sad': { key: 'emotion.sad', kind: 'svg', src: 'face-sad', label: '슬픔', fallbackColor: '#5B8CFF' },
  'emotion.angry': { key: 'emotion.angry', kind: 'svg', src: 'face-angry', label: '화남', fallbackColor: '#FF3B30' },
  'emotion.surprised': { key: 'emotion.surprised', kind: 'svg', src: 'face-surprised', label: '놀람', fallbackColor: '#A78BFA' },

  // Nature / food placeholders (svg)
  'nature.sun': { key: 'nature.sun', kind: 'svg', src: 'sun', label: '해', fallbackColor: '#FFD400' },
  'nature.cloud': { key: 'nature.cloud', kind: 'svg', src: 'cloud', label: '구름', fallbackColor: '#B8D4FF' },
  'nature.tree': { key: 'nature.tree', kind: 'svg', src: 'tree', label: '나무', fallbackColor: '#22C55E' },
  'nature.flower': { key: 'nature.flower', kind: 'svg', src: 'flower', label: '꽃', fallbackColor: '#FF8FAB' },
  'food.apple': { key: 'food.apple', kind: 'svg', src: 'apple', label: '사과', fallbackColor: '#FF3B30' },
  'food.banana': { key: 'food.banana', kind: 'svg', src: 'banana', label: '바나나', fallbackColor: '#FFD400' },
  'animal.dog': { key: 'animal.dog', kind: 'svg', src: 'dog', label: '강아지', fallbackColor: '#E8B86D' },
  'animal.cat': { key: 'animal.cat', kind: 'svg', src: 'cat', label: '고양이', fallbackColor: '#FF8FAB' },
  'animal.rabbit': { key: 'animal.rabbit', kind: 'svg', src: 'rabbit', label: '토끼', fallbackColor: '#FFF0F5' },
}

export function getVisual(key: string): VisualAsset {
  return (
    VISUAL_ASSETS[key] || {
      key,
      kind: 'svg',
      src: 'fallback',
      label: key,
      fallbackColor: '#FFD400',
    }
  )
}
