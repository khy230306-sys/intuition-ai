/**
 * Suksuk Visual Asset Registry V3
 * status: REAL | TEMP | FALLBACK
 * Production UI prefers REAL; TEMP is a swap slot, never emoji.
 * Existing approved car WebP assets remain REAL and untouched.
 */

import { CHAR_IMG, CHAR_IMG_MD } from '../components/GameArt'

export type VisualKind = 'image' | 'svg'
export type AssetStatus = 'REAL' | 'TEMP' | 'FALLBACK'

export type VisualAsset = {
  key: string
  type: VisualKind
  kind: VisualKind
  status: AssetStatus
  primary: string
  /** category/group REAL fallback key, or svg id / image path */
  fallback: string
  alt: string
  label: string
  fallbackColor: string
  recommendedSize: number
  animated: boolean
  src: string
  /** intended drop path for premium WebP (even if not yet shipped) */
  slotPath?: string
}

const SM = CHAR_IMG
const MD = CHAR_IMG_MD
const SUK = '/assets/suksuk'

function realImg(key: string, src: string, label: string, color: string, size = 96, animated = false): VisualAsset {
  return {
    key,
    type: 'image',
    kind: 'image',
    status: 'REAL',
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

/** TEMP slot: svg shape until premium WebP arrives at slotPath */
function tempSvg(
  key: string,
  shape: string,
  label: string,
  color: string,
  slotPath: string,
  fallbackKey: string,
  size = 72,
  animated = false,
): VisualAsset {
  return {
    key,
    type: 'svg',
    kind: 'svg',
    status: 'TEMP',
    primary: shape,
    fallback: fallbackKey,
    src: shape,
    alt: label,
    label,
    fallbackColor: color,
    recommendedSize: size,
    animated,
    slotPath,
  }
}

const CHAR_STATES = ['idle', 'happy', 'celebrate', 'thinking', 'encourage', 'sad', 'surprised'] as const

function charEntries(who: 'hani' | 'youngi', color: string) {
  const out: Record<string, VisualAsset> = {}
  const base = `${SUK}/characters/${who}`
  out[`character.${who}`] = tempSvg(`character.${who}`, `char-${who}`, who === 'hani' ? '한이' : '영이', color, `${base}/${who}-idle.webp`, 'reward.star', 120)
  for (const st of CHAR_STATES) {
    out[`character.${who}.${st}`] = tempSvg(
      `character.${who}.${st}`,
      `char-${who}`,
      `${who === 'hani' ? '한이' : '영이'} ${st}`,
      color,
      `${base}/${who}-${st}.webp`,
      `character.${who}`,
      120,
      st === 'happy' || st === 'celebrate',
    )
  }
  return out
}

export const VISUAL_ASSETS: Record<string, VisualAsset> = {
  // —— REAL: approved vehicles / reward webp (do not delete/reprocess) ——
  'vehicle.car': realImg('vehicle.car', SM.car, '자동차', '#FF2D55'),
  'vehicle.bus': realImg('vehicle.bus', SM.bus, '버스', '#FFD400'),
  'vehicle.busFront': realImg('vehicle.busFront', SM.busFront, '스쿨버스', '#FFD400'),
  'vehicle.police': realImg('vehicle.police', SM.police, '경찰차', '#2F6BFF'),
  'vehicle.firetruck': realImg('vehicle.firetruck', SM.fire, '소방차', '#FF3B30'),
  'vehicle.ambulance': realImg('vehicle.ambulance', SM.ambulance, '구급차', '#FFF8E7'),
  'vehicle.dump': realImg('vehicle.dump', SM.dump, '트럭', '#FF7A00'),
  'vehicle.tractor': realImg('vehicle.tractor', SM.tractor, '트랙터', '#22C55E'),
  'vehicle.car.md': realImg('vehicle.car.md', MD.car, '자동차', '#FF2D55', 160),
  'vehicle.bus.md': realImg('vehicle.bus.md', MD.bus, '버스', '#FFD400', 160),
  'reward.star': realImg('reward.star', SM.star, '별', '#FFD400', 64),
  'reward.paint': realImg('reward.paint', SM.paint, '팔레트', '#FF8FAB', 64),
  'reward.drum': realImg('reward.drum', SM.drum, '북', '#FF2D55', 64),
  'reward.sand': realImg('reward.sand', SM.sand, '모래', '#E8B86D', 64),
  'reward.sticker': realImg('reward.sticker', SM.star, '스티커', '#FFD400', 64),

  ...charEntries('hani', '#FFE0B2'),
  ...charEntries('youngi', '#FFD6E8'),

  // —— Categories (TEMP scene slots) ——
  'category.language': tempSvg('category.language', 'book', '한글', '#FF8FAB', `${SUK}/categories/language.webp`, 'reward.paint'),
  'category.math': tempSvg('category.math', 'numbers', '수학', '#5B8CFF', `${SUK}/categories/math.webp`, 'vehicle.bus'),
  'category.cognition': tempSvg('category.cognition', 'brain', '두뇌', '#A78BFA', `${SUK}/categories/cognition.webp`, 'vehicle.car'),
  'category.science': tempSvg('category.science', 'leaf', '과학', '#3DDC84', `${SUK}/categories/science.webp`, 'reward.sand'),
  'category.creativity': tempSvg('category.creativity', 'palette', '미술', '#FF7A00', `${SUK}/categories/creativity.webp`, 'reward.paint'),
  'category.music': tempSvg('category.music', 'notes', '음악', '#FF4D6D', `${SUK}/categories/music.webp`, 'reward.drum'),
  'category.life': tempSvg('category.life', 'heart', '생활', '#FFD400', `${SUK}/categories/life.webp`, 'reward.star'),
  'category.exploration': tempSvg('category.exploration', 'compass', '탐험', '#2F6BFF', `${SUK}/categories/exploration.webp`, 'vehicle.police'),

  // —— Rewards TEMP (style-unify when art arrives) ——
  'reward.badge': tempSvg('reward.badge', 'badge', '뱃지', '#5B8CFF', `${SUK}/rewards/badge.webp`, 'reward.star', 64),
  'reward.gift': tempSvg('reward.gift', 'gift', '선물', '#FF4D6D', `${SUK}/rewards/gift.webp`, 'reward.star', 64),
  'reward.crown': tempSvg('reward.crown', 'crown', '왕관', '#FFD400', `${SUK}/rewards/crown.webp`, 'reward.star', 64),
  'reward.medal': tempSvg('reward.medal', 'medal', '메달', '#FF7A00', `${SUK}/rewards/medal.webp`, 'reward.star', 64),

  // —— Emotions (prefer character-based when REAL) ——
  'emotion.happy': tempSvg('emotion.happy', 'face-happy', '기쁨', '#FFD400', `${SUK}/emotions/happy.webp`, 'character.hani.happy'),
  'emotion.sad': tempSvg('emotion.sad', 'face-sad', '슬픔', '#5B8CFF', `${SUK}/emotions/sad.webp`, 'character.hani.sad'),
  'emotion.angry': tempSvg('emotion.angry', 'face-angry', '화남', '#FF3B30', `${SUK}/emotions/angry.webp`, 'character.youngi.surprised'),
  'emotion.surprised': tempSvg('emotion.surprised', 'face-surprised', '놀람', '#A78BFA', `${SUK}/emotions/surprised.webp`, 'character.hani.surprised'),
  'emotion.shy': tempSvg('emotion.shy', 'face-shy', '부끄', '#FF8FAB', `${SUK}/emotions/shy.webp`, 'character.youngi.idle'),
  'emotion.scared': tempSvg('emotion.scared', 'face-scared', '무서움', '#8B5CF6', `${SUK}/emotions/scared.webp`, 'character.hani.thinking'),
  'emotion.proud': tempSvg('emotion.proud', 'face-proud', '뿌듯', '#22C55E', `${SUK}/emotions/proud.webp`, 'character.hani.celebrate'),
  'emotion.calm': tempSvg('emotion.calm', 'face-calm', '차분', '#7DD3FC', `${SUK}/emotions/calm.webp`, 'character.youngi.idle'),

  // —— Animals ——
  ...Object.fromEntries(
    (
      [
        ['dog', 'dog', '강아지', '#E8B86D'],
        ['cat', 'cat', '고양이', '#FF8FAB'],
        ['rabbit', 'rabbit', '토끼', '#FFF0F5'],
        ['lion', 'lion', '사자', '#FFB020'],
        ['elephant', 'elephant', '코끼리', '#A8B4C8'],
        ['monkey', 'monkey', '원숭이', '#C68642'],
        ['bear', 'bear', '곰', '#8B5A2B'],
        ['fox', 'fox', '여우', '#FF7A00'],
        ['giraffe', 'giraffe', '기린', '#F4C430'],
        ['tiger', 'tiger', '호랑이', '#FF8C00'],
        ['panda', 'panda', '판다', '#F5F5F5'],
        ['penguin', 'penguin', '펭귄', '#4A5568'],
        ['dolphin', 'dolphin', '돌고래', '#7DD3FC'],
        ['whale', 'whale', '고래', '#3B82F6'],
        ['turtle', 'turtle', '거북이', '#22C55E'],
        ['fish', 'fish', '물고기', '#38BDF8'],
        ['butterfly', 'butterfly', '나비', '#A78BFA'],
        ['bee', 'bee', '벌', '#FFD400'],
        ['frog', 'frog', '개구리', '#4ADE80'],
      ] as const
    ).map(([id, shape, label, color]) => [
      `animal.${id}`,
      tempSvg(`animal.${id}`, shape, label, color, `${SUK}/animals/${id}.webp`, 'category.science'),
    ]),
  ),

  // —— Nature (nature.star ≠ reward.star) ——
  ...Object.fromEntries(
    (
      [
        ['sun', 'sun', '해', '#FFD400', true],
        ['cloud', 'cloud', '구름', '#B8D4FF', false],
        ['rain', 'rain', '비', '#60A5FA', false],
        ['snow', 'snow', '눈', '#E0F2FE', false],
        ['tree', 'tree', '나무', '#22C55E', false],
        ['flower', 'flower', '꽃', '#FF8FAB', false],
        ['mountain', 'mountain', '산', '#86EFAC', false],
        ['sea', 'sea', '바다', '#38BDF8', false],
        ['moon', 'moon', '달', '#FDE68A', false],
        ['star', 'star-shape', '반짝별', '#FFE08A', false],
      ] as const
    ).map(([id, shape, label, color, animated]) => [
      `nature.${id}`,
      tempSvg(`nature.${id}`, shape, label, color, `${SUK}/nature/${id}.webp`, 'reward.star', 64, animated),
    ]),
  ),

  // —— Food ——
  ...Object.fromEntries(
    (
      [
        ['apple', 'apple', '사과', '#FF3B30'],
        ['banana', 'banana', '바나나', '#FFD400'],
        ['strawberry', 'strawberry', '딸기', '#FF4D6D'],
        ['carrot', 'carrot', '당근', '#FF7A00'],
        ['bread', 'bread', '빵', '#E8B86D'],
        ['milk', 'milk', '우유', '#F8FAFC'],
      ] as const
    ).map(([id, shape, label, color]) => [
      `food.${id}`,
      tempSvg(`food.${id}`, shape, label, color, `${SUK}/food/${id}.webp`, 'category.life'),
    ]),
  ),

  // —— Places ——
  ...Object.fromEntries(
    (
      [
        ['home', 'home', '집', '#FF8FAB'],
        ['school', 'school', '학교', '#5B8CFF'],
        ['hospital', 'hospital', '병원', '#FF6B6B'],
        ['fireStation', 'fire-station', '소방서', '#FF3B30'],
        ['policeStation', 'police-station', '경찰서', '#2F6BFF'],
        ['supermarket', 'market', '마트', '#22C55E'],
        ['farm', 'farm', '농장', '#A3E635'],
        ['zoo', 'zoo', '동물원', '#F4C430'],
        ['park', 'park', '공원', '#4ADE80'],
        ['beach', 'beach', '해변', '#38BDF8'],
        ['space', 'space', '우주', '#6366F1'],
        ['museum', 'museum', '박물관', '#C4B5FD'],
      ] as const
    ).map(([id, shape, label, color]) => [
      `place.${id}`,
      tempSvg(`place.${id}`, shape, label, color, `${SUK}/places/${id}.webp`, 'category.exploration'),
    ]),
  ),

  // —— UI ——
  'ui.back': tempSvg('ui.back', 'back', '뒤로', '#1a1510', `${SUK}/rewards/badge.webp`, 'reward.star', 40),
  'ui.speaker': tempSvg('ui.speaker', 'speaker', '다시 듣기', '#2F6BFF', `${SUK}/rewards/badge.webp`, 'reward.star', 40),
  'ui.gift': tempSvg('ui.gift', 'gift', '선물', '#FF4D6D', `${SUK}/rewards/gift.webp`, 'reward.gift', 40),
  'ui.lock': tempSvg('ui.lock', 'lock', '잠금', '#7a6a58', `${SUK}/rewards/badge.webp`, 'reward.star', 40),
}

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

const FALLBACK_BLOB: VisualAsset = {
  key: 'fallback',
  type: 'svg',
  kind: 'svg',
  status: 'FALLBACK',
  primary: 'blob',
  fallback: 'reward.star',
  src: 'blob',
  alt: '그림',
  label: '그림',
  fallbackColor: '#FFD400',
  recommendedSize: 64,
  animated: false,
}

/** Runtime override: if TEMP slotPath file is later shipped, treat as REAL image */
const runtimeReal = new Set<string>()

export function markSlotReal(key: string) {
  runtimeReal.add(key)
}

export function getVisualAsset(key: string): VisualAsset {
  const base = VISUAL_ASSETS[key] || FALLBACK_BLOB
  if (base.status === 'TEMP' && base.slotPath && runtimeReal.has(key)) {
    return {
      ...base,
      status: 'REAL',
      type: 'image',
      kind: 'image',
      primary: base.slotPath,
      src: base.slotPath,
    }
  }
  // Prefer REAL fallback key when current is TEMP and fallback points to REAL
  if (base.status === 'TEMP' && base.fallback.includes('.')) {
    const fb = VISUAL_ASSETS[base.fallback]
    if (fb?.status === 'REAL' && !key.startsWith('character.')) {
      // keep TEMP primary for TEMP display in VisualIcon (svg), but expose fallback chain
      return { ...base, fallback: fb.primary }
    }
  }
  return base
}

/** @deprecated */
export function getVisual(key: string): VisualAsset {
  return getVisualAsset(key)
}

export function getGameIllustrationKey(gameId: string, categoryKey?: string): string {
  return GAME_ILLUSTRATION[gameId] || categoryKey || 'category.exploration'
}

export function characterSlotPath(who: 'hani' | 'youngi', state: string) {
  return `${SUK}/characters/${who}/${who}-${state}.webp`
}

export function countVisualAssets() {
  const all = Object.values(VISUAL_ASSETS)
  const real = all.filter((a) => a.status === 'REAL').length
  const temp = all.filter((a) => a.status === 'TEMP').length
  const fallback = all.filter((a) => a.status === 'FALLBACK').length
  return { total: all.length, real, temp, fallback, images: all.filter((a) => a.type === 'image').length }
}

export function listTempSlots() {
  return Object.values(VISUAL_ASSETS)
    .filter((a) => a.status === 'TEMP')
    .map((a) => ({ key: a.key, slotPath: a.slotPath, label: a.label }))
}

export function listVisualKeys() {
  return Object.keys(VISUAL_ASSETS)
}
