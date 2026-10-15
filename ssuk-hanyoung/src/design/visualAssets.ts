/**
 * Suksuk Visual Asset Registry V2
 * Components must use getVisualAsset(key) — never raw paths or emoji.
 * Existing car WebP assets are preserved and registered as-is.
 */

import { CHAR_IMG, CHAR_IMG_MD } from '../components/GameArt'

export type VisualKind = 'image' | 'svg'

export type VisualAsset = {
  key: string
  type: VisualKind
  /** @deprecated use type */
  kind: VisualKind
  /** image URL or svg shape id */
  primary: string
  fallback: string
  alt: string
  label: string
  fallbackColor: string
  recommendedSize: number
  animated: boolean
  /** @deprecated use primary */
  src: string
}

const SM = CHAR_IMG
const MD = CHAR_IMG_MD

function img(key: string, src: string, label: string, color: string, size = 96, animated = false): VisualAsset {
  return {
    key,
    type: 'image',
    kind: 'image',
    primary: src,
    fallback: src,
    src,
    alt: label,
    label,
    fallbackColor: color,
    recommendedSize: size,
    animated,
  }
}

function svg(key: string, shape: string, label: string, color: string, size = 72, animated = false): VisualAsset {
  return {
    key,
    type: 'svg',
    kind: 'svg',
    primary: shape,
    fallback: 'blob',
    src: shape,
    alt: label,
    label,
    fallbackColor: color,
    recommendedSize: size,
    animated,
  }
}

export const VISUAL_ASSETS: Record<string, VisualAsset> = {
  // —— Vehicles (approved existing art — do not delete/reprocess) ——
  'vehicle.car': img('vehicle.car', SM.car, '자동차', '#FF2D55'),
  'vehicle.bus': img('vehicle.bus', SM.bus, '버스', '#FFD400'),
  'vehicle.busFront': img('vehicle.busFront', SM.busFront, '스쿨버스', '#FFD400'),
  'vehicle.police': img('vehicle.police', SM.police, '경찰차', '#2F6BFF'),
  'vehicle.firetruck': img('vehicle.firetruck', SM.fire, '소방차', '#FF3B30'),
  'vehicle.ambulance': img('vehicle.ambulance', SM.ambulance, '구급차', '#FFF8E7'),
  'vehicle.dump': img('vehicle.dump', SM.dump, '트럭', '#FF7A00'),
  'vehicle.tractor': img('vehicle.tractor', SM.tractor, '트랙터', '#22C55E'),
  'vehicle.car.md': img('vehicle.car.md', MD.car, '자동차', '#FF2D55', 160),
  'vehicle.bus.md': img('vehicle.bus.md', MD.bus, '버스', '#FFD400', 160),

  // —— Characters (image slots; SVG Character component is primary UI) ——
  'character.hani': svg('character.hani', 'char-hani', '한이', '#FFE0B2', 120),
  'character.youngi': svg('character.youngi', 'char-youngi', '영이', '#FFD6E8', 120),
  'character.hani.idle': svg('character.hani.idle', 'char-hani', '한이', '#FFE0B2', 120),
  'character.hani.happy': svg('character.hani.happy', 'char-hani', '한이 기쁨', '#FFE0B2', 120, true),
  'character.hani.celebrate': svg('character.hani.celebrate', 'char-hani', '한이 축하', '#FFE0B2', 120, true),
  'character.youngi.idle': svg('character.youngi.idle', 'char-youngi', '영이', '#FFD6E8', 120),
  'character.youngi.happy': svg('character.youngi.happy', 'char-youngi', '영이 기쁨', '#FFD6E8', 120, true),

  // —— Categories ——
  'category.language': svg('category.language', 'book', '한글', '#FF8FAB'),
  'category.math': svg('category.math', 'numbers', '수학', '#5B8CFF'),
  'category.cognition': svg('category.cognition', 'brain', '두뇌', '#A78BFA'),
  'category.science': svg('category.science', 'leaf', '과학', '#3DDC84'),
  'category.creativity': svg('category.creativity', 'palette', '미술', '#FF7A00'),
  'category.music': svg('category.music', 'notes', '음악', '#FF4D6D'),
  'category.life': svg('category.life', 'heart', '생활', '#FFD400'),
  'category.exploration': svg('category.exploration', 'compass', '탐험', '#2F6BFF'),

  // —— Rewards ——
  'reward.star': img('reward.star', SM.star, '별', '#FFD400', 64),
  'reward.badge': svg('reward.badge', 'badge', '뱃지', '#5B8CFF', 64),
  'reward.gift': svg('reward.gift', 'gift', '선물', '#FF4D6D', 64),
  'reward.crown': svg('reward.crown', 'crown', '왕관', '#FFD400', 64),
  'reward.medal': svg('reward.medal', 'medal', '메달', '#FF7A00', 64),
  'reward.sticker': img('reward.sticker', SM.star, '스티커', '#FFD400', 64),
  'reward.paint': img('reward.paint', SM.paint, '팔레트', '#FF8FAB', 64),
  'reward.drum': img('reward.drum', SM.drum, '북', '#FF2D55', 64),
  'reward.sand': img('reward.sand', SM.sand, '모래', '#E8B86D', 64),

  // —— Emotions ——
  'emotion.happy': svg('emotion.happy', 'face-happy', '기쁨', '#FFD400'),
  'emotion.sad': svg('emotion.sad', 'face-sad', '슬픔', '#5B8CFF'),
  'emotion.angry': svg('emotion.angry', 'face-angry', '화남', '#FF3B30'),
  'emotion.surprised': svg('emotion.surprised', 'face-surprised', '놀람', '#A78BFA'),
  'emotion.shy': svg('emotion.shy', 'face-shy', '부끄', '#FF8FAB'),
  'emotion.scared': svg('emotion.scared', 'face-scared', '무서움', '#8B5CF6'),
  'emotion.proud': svg('emotion.proud', 'face-proud', '뿌듯', '#22C55E'),
  'emotion.calm': svg('emotion.calm', 'face-calm', '차분', '#7DD3FC'),

  // —— Animals ——
  'animal.dog': svg('animal.dog', 'dog', '강아지', '#E8B86D'),
  'animal.cat': svg('animal.cat', 'cat', '고양이', '#FF8FAB'),
  'animal.rabbit': svg('animal.rabbit', 'rabbit', '토끼', '#FFF0F5'),
  'animal.lion': svg('animal.lion', 'lion', '사자', '#FFB020'),
  'animal.elephant': svg('animal.elephant', 'elephant', '코끼리', '#A8B4C8'),
  'animal.monkey': svg('animal.monkey', 'monkey', '원숭이', '#C68642'),
  'animal.bear': svg('animal.bear', 'bear', '곰', '#8B5A2B'),
  'animal.fox': svg('animal.fox', 'fox', '여우', '#FF7A00'),
  'animal.giraffe': svg('animal.giraffe', 'giraffe', '기린', '#F4C430'),
  'animal.tiger': svg('animal.tiger', 'tiger', '호랑이', '#FF8C00'),
  'animal.panda': svg('animal.panda', 'panda', '판다', '#F5F5F5'),
  'animal.penguin': svg('animal.penguin', 'penguin', '펭귄', '#4A5568'),
  'animal.dolphin': svg('animal.dolphin', 'dolphin', '돌고래', '#7DD3FC'),
  'animal.whale': svg('animal.whale', 'whale', '고래', '#3B82F6'),
  'animal.turtle': svg('animal.turtle', 'turtle', '거북이', '#22C55E'),
  'animal.fish': svg('animal.fish', 'fish', '물고기', '#38BDF8'),
  'animal.butterfly': svg('animal.butterfly', 'butterfly', '나비', '#A78BFA'),
  'animal.bee': svg('animal.bee', 'bee', '벌', '#FFD400'),
  'animal.frog': svg('animal.frog', 'frog', '개구리', '#4ADE80'),

  // —— Nature ——
  'nature.sun': svg('nature.sun', 'sun', '해', '#FFD400', 64, true),
  'nature.cloud': svg('nature.cloud', 'cloud', '구름', '#B8D4FF'),
  'nature.rain': svg('nature.rain', 'rain', '비', '#60A5FA'),
  'nature.snow': svg('nature.snow', 'snow', '눈', '#E0F2FE'),
  'nature.tree': svg('nature.tree', 'tree', '나무', '#22C55E'),
  'nature.flower': svg('nature.flower', 'flower', '꽃', '#FF8FAB'),
  'nature.mountain': svg('nature.mountain', 'mountain', '산', '#86EFAC'),
  'nature.sea': svg('nature.sea', 'sea', '바다', '#38BDF8'),
  'nature.moon': svg('nature.moon', 'moon', '달', '#FDE68A'),
  'nature.star': svg('nature.star', 'star-shape', '별', '#FFD400'),

  // —— Food ——
  'food.apple': svg('food.apple', 'apple', '사과', '#FF3B30'),
  'food.banana': svg('food.banana', 'banana', '바나나', '#FFD400'),
  'food.strawberry': svg('food.strawberry', 'strawberry', '딸기', '#FF4D6D'),
  'food.carrot': svg('food.carrot', 'carrot', '당근', '#FF7A00'),
  'food.bread': svg('food.bread', 'bread', '빵', '#E8B86D'),
  'food.milk': svg('food.milk', 'milk', '우유', '#F8FAFC'),

  // —— Places ——
  'place.home': svg('place.home', 'home', '집', '#FF8FAB'),
  'place.school': svg('place.school', 'school', '학교', '#5B8CFF'),
  'place.hospital': svg('place.hospital', 'hospital', '병원', '#FF6B6B'),
  'place.fireStation': svg('place.fireStation', 'fire-station', '소방서', '#FF3B30'),
  'place.policeStation': svg('place.policeStation', 'police-station', '경찰서', '#2F6BFF'),
  'place.supermarket': svg('place.supermarket', 'market', '마트', '#22C55E'),
  'place.farm': svg('place.farm', 'farm', '농장', '#A3E635'),
  'place.zoo': svg('place.zoo', 'zoo', '동물원', '#F4C430'),
  'place.park': svg('place.park', 'park', '공원', '#4ADE80'),
  'place.beach': svg('place.beach', 'beach', '해변', '#38BDF8'),
  'place.space': svg('place.space', 'space', '우주', '#6366F1'),
  'place.museum': svg('place.museum', 'museum', '박물관', '#C4B5FD'),

  // —— UI ——
  'ui.back': svg('ui.back', 'back', '뒤로', '#1a1510', 40),
  'ui.speaker': svg('ui.speaker', 'speaker', '다시 듣기', '#2F6BFF', 40),
  'ui.gift': svg('ui.gift', 'gift', '선물', '#FF4D6D', 40),
  'ui.lock': svg('ui.lock', 'lock', '잠금', '#7a6a58', 40),
}

/** Game illustration slots — category fallback when game art missing */
export const GAME_ILLUSTRATION: Record<string, string> = {
  'sound-board': 'vehicle.police',
  'car-puzzle': 'vehicle.firetruck',
  'color-follow': 'reward.paint',
  'car-paint': 'reward.paint',
  'story-tap': 'vehicle.bus',
  'maze-drive': 'vehicle.tractor',
  'wait-go': 'vehicle.car',
  'car-parade': 'vehicle.car',
  'car-builder': 'vehicle.dump',
  'sand-play': 'reward.sand',
  balloons: 'nature.cloud',
  'color-mix': 'reward.paint',
  'sticker-book': 'reward.sticker',
  'hidden-cars': 'vehicle.dump',
  'rhythm-tap': 'reward.drum',
  'vroom-race': 'vehicle.car',
  'color-garage': 'vehicle.bus',
  parking: 'vehicle.police',
  'find-color-car': 'vehicle.firetruck',
  'car-memory': 'vehicle.busFront',
  'car-sounds': 'vehicle.ambulance',
  'shape-touch': 'category.math',
  'bubble-pop': 'nature.cloud',
  'stamp-pad': 'reward.paint',
  'finger-paint': 'reward.paint',
  'pop-it': 'emotion.happy',
  'traffic-light': 'vehicle.car',
  'car-wash': 'vehicle.ambulance',
  'bus-count': 'vehicle.bus',
  'color-quiz': 'reward.paint',
}

const FALLBACK: VisualAsset = svg('fallback', 'blob', '그림', '#FFD400', 64)

export function getVisualAsset(key: string): VisualAsset {
  return VISUAL_ASSETS[key] || { ...FALLBACK, key, label: key, alt: key }
}

/** @deprecated use getVisualAsset */
export function getVisual(key: string): VisualAsset {
  return getVisualAsset(key)
}

export function getGameIllustrationKey(gameId: string, categoryKey?: string): string {
  return GAME_ILLUSTRATION[gameId] || categoryKey || 'category.exploration'
}

export function listVisualKeys() {
  return Object.keys(VISUAL_ASSETS)
}

export function countVisualAssets() {
  const all = Object.values(VISUAL_ASSETS)
  return {
    total: all.length,
    images: all.filter((a) => a.type === 'image').length,
    placeholders: all.filter((a) => a.type === 'svg').length,
  }
}
