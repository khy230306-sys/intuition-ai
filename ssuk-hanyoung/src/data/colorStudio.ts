/** 쑥쑥 색칠 스튜디오 — templates & palettes (expandable to 50–100) */

export type ColorCategory =
  | 'cars'
  | 'animals'
  | 'dinosaurs'
  | 'sea'
  | 'space'
  | 'food'
  | 'nature'
  | 'town'
  | 'season'

export type PaintTool = 'crayon' | 'pencil' | 'brush' | 'marker' | 'eraser' | 'bucket'
export type BrushSize = 'sm' | 'md' | 'lg'
export type StudioMode = 'easy' | 'free'

export type RegionDef = {
  id: string
  label: string
  /** SVG path d */
  d: string
  defaultFill?: string
}

export type ColorTemplate = {
  id: string
  title: string
  category: ColorCategory
  /** quality gate — only ship when line-art is good enough */
  quality: 'ready' | 'planned'
  viewBox: string
  /** outline stroke paths (non-fillable) */
  outlines: string[]
  regions: RegionDef[]
  missionHints?: string[]
}

export const STUDIO_COLORS = [
  { id: 'red', ko: '빨강', hex: '#FF2D55' },
  { id: 'orange', ko: '주황', hex: '#FF7A00' },
  { id: 'yellow', ko: '노랑', hex: '#FFD400' },
  { id: 'lime', ko: '연두', hex: '#A3E635' },
  { id: 'green', ko: '초록', hex: '#22C55E' },
  { id: 'sky', ko: '하늘', hex: '#38BDF8' },
  { id: 'blue', ko: '파랑', hex: '#2F6BFF' },
  { id: 'purple', ko: '보라', hex: '#8B5CF6' },
  { id: 'pink', ko: '분홍', hex: '#FF5DA2' },
  { id: 'brown', ko: '갈색', hex: '#B86B3C' },
  { id: 'black', ko: '검정', hex: '#1A1510' },
  { id: 'white', ko: '하양', hex: '#FFF8E7' },
  { id: 'coral', ko: '코랄', hex: '#FF6B6B' },
  { id: 'mint', ko: '민트', hex: '#2DD4BF' },
  { id: 'navy', ko: '남색', hex: '#1E3A8A' },
  { id: 'cream', ko: '크림', hex: '#FFE4B5' },
] as const

export const TOOLS: Array<{ id: PaintTool; ko: string; visual: string }> = [
  { id: 'crayon', ko: '크레용', visual: 'reward.paint' },
  { id: 'pencil', ko: '색연필', visual: 'category.creativity' },
  { id: 'brush', ko: '붓', visual: 'category.creativity' },
  { id: 'marker', ko: '마커', visual: 'reward.paint' },
  { id: 'eraser', ko: '지우개', visual: 'emotion.calm' },
  { id: 'bucket', ko: '페인트통', visual: 'reward.gift' },
]

export const BRUSH_PX: Record<BrushSize, number> = { sm: 8, md: 18, lg: 32 }

export const CATEGORY_LABEL: Record<ColorCategory, string> = {
  cars: '자동차',
  animals: '동물',
  dinosaurs: '공룡',
  sea: '바다',
  space: '우주',
  food: '음식',
  nature: '자연',
  town: '우리동네',
  season: '계절',
}

/** Ready line-art with semantic regions — no hue-shift of finished cars */
export const COLOR_TEMPLATES: ColorTemplate[] = [
  {
    id: 'car-sedan',
    title: '승용차',
    category: 'cars',
    quality: 'ready',
    viewBox: '0 0 320 220',
    outlines: [
      'M40 140 Q50 90 120 85 L200 85 Q270 90 280 140 L300 150 Q305 170 280 175 L40 175 Q15 170 20 150 Z',
    ],
    regions: [
      { id: 'body', label: '차체', d: 'M48 138 Q58 98 120 94 L200 94 Q260 98 272 138 L272 158 L48 158 Z', defaultFill: '#FFE4EC' },
      { id: 'window', label: '창문', d: 'M130 100 L195 100 Q210 100 215 118 L130 118 Z', defaultFill: '#D6E4FF' },
      { id: 'wheel-l', label: '앞바퀴', d: 'M90 155 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0', defaultFill: '#3a3a3a' },
      { id: 'wheel-r', label: '뒷바퀴', d: 'M230 155 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0', defaultFill: '#3a3a3a' },
      { id: 'light', label: '전조등', d: 'M265 125 h18 v16 h-18 z', defaultFill: '#FFF3B0' },
      { id: 'bumper', label: '범퍼', d: 'M48 158 h224 v10 H48 z', defaultFill: '#CFCFCF' },
    ],
    missionHints: ['따뜻한 색으로 차체를 칠해 볼까요?', '바퀴는 어디에 있을까요?'],
  },
  {
    id: 'car-fire',
    title: '소방차',
    category: 'cars',
    quality: 'ready',
    viewBox: '0 0 320 220',
    outlines: ['M30 150 L30 90 L160 90 L160 70 L250 70 L280 110 L290 150 Z'],
    regions: [
      { id: 'body', label: '차체', d: 'M40 150 L40 100 L155 100 L155 150 Z', defaultFill: '#FFD0D0' },
      { id: 'cab', label: '운전석', d: 'M160 150 L160 80 L240 80 L270 120 L270 150 Z', defaultFill: '#FFD0D0' },
      { id: 'window', label: '창문', d: 'M175 95 L225 95 L245 120 L175 120 Z', defaultFill: '#C8E0FF' },
      { id: 'siren', label: '사이렌', d: 'M185 68 h40 v12 h-40 z', defaultFill: '#FFE08A' },
      { id: 'wheel-l', label: '앞바퀴', d: 'M90 155 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', defaultFill: '#333' },
      { id: 'wheel-r', label: '뒷바퀴', d: 'M230 155 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', defaultFill: '#333' },
      { id: 'ladder', label: '사다리', d: 'M55 105 h85 v8 H55 z', defaultFill: '#CFCFCF' },
    ],
    missionHints: ['소방차에서 빨간색을 찾아볼까요?', '사이렌을 밝은 색으로 칠해 봐요'],
  },
  {
    id: 'car-police',
    title: '경찰차',
    category: 'cars',
    quality: 'ready',
    viewBox: '0 0 320 220',
    outlines: ['M35 145 Q45 95 110 90 L210 90 Q275 95 285 145 L300 155 L20 155 Z'],
    regions: [
      { id: 'body', label: '차체', d: 'M45 140 Q55 100 110 96 L210 96 Q265 100 275 140 L275 155 L45 155 Z', defaultFill: '#E8EEFF' },
      { id: 'window', label: '창문', d: 'M125 102 L200 102 Q210 102 214 120 L125 120 Z', defaultFill: '#B8D4FF' },
      { id: 'light', label: '경광등', d: 'M145 82 h40 v12 h-40 z', defaultFill: '#FF8A8A' },
      { id: 'wheel-l', label: '앞바퀴', d: 'M95 155 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', defaultFill: '#333' },
      { id: 'wheel-r', label: '뒷바퀴', d: 'M225 155 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', defaultFill: '#333' },
      { id: 'bumper', label: '범퍼', d: 'M45 155 h230 v8 H45 z', defaultFill: '#BBB' },
    ],
    missionHints: ['차가운 색으로 꾸며볼까요?', '경광등을 칠해 봐요'],
  },
  {
    id: 'car-bus',
    title: '버스',
    category: 'cars',
    quality: 'ready',
    viewBox: '0 0 320 220',
    outlines: ['M25 150 L25 70 L280 70 L295 100 L295 150 Z'],
    regions: [
      { id: 'body', label: '차체', d: 'M35 150 L35 80 L270 80 L285 105 L285 150 Z', defaultFill: '#FFF3B0' },
      { id: 'window', label: '창문', d: 'M50 90 h200 v28 H50 z', defaultFill: '#C8E7FF' },
      { id: 'door', label: '문', d: 'M230 120 h40 v30 h-40 z', defaultFill: '#FFE08A' },
      { id: 'wheel-l', label: '앞바퀴', d: 'M90 155 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', defaultFill: '#333' },
      { id: 'wheel-r', label: '뒷바퀴', d: 'M230 155 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', defaultFill: '#333' },
      { id: 'light', label: '헤드라이트', d: 'M275 120 h12 v16 h-12 z', defaultFill: '#FFF8DC' },
    ],
  },
  {
    id: 'animal-dog',
    title: '강아지',
    category: 'animals',
    quality: 'ready',
    viewBox: '0 0 280 240',
    outlines: [],
    regions: [
      { id: 'body', label: '몸', d: 'M70 120 Q70 80 120 75 L180 80 Q210 100 205 150 L75 150 Z', defaultFill: '#F5D0A9' },
      { id: 'head', label: '머리', d: 'M160 70 m-40 0 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0', defaultFill: '#F5D0A9' },
      { id: 'ear-l', label: '귀', d: 'M135 45 Q120 20 145 40 Z', defaultFill: '#E8B86D' },
      { id: 'ear-r', label: '귀', d: 'M185 45 Q200 20 175 40 Z', defaultFill: '#E8B86D' },
      { id: 'tail', label: '꼬리', d: 'M70 110 Q40 90 45 120 Q55 130 70 125 Z', defaultFill: '#E8B86D' },
      { id: 'leg-l', label: '앞다리', d: 'M100 150 h18 v40 h-18 z', defaultFill: '#E8B86D' },
      { id: 'leg-r', label: '뒷다리', d: 'M170 150 h18 v40 h-18 z', defaultFill: '#E8B86D' },
    ],
    missionHints: ['부드러운 색으로 강아지를 칠해 볼까요?'],
  },
  {
    id: 'animal-fish',
    title: '물고기',
    category: 'sea',
    quality: 'ready',
    viewBox: '0 0 280 200',
    outlines: [],
    regions: [
      { id: 'body', label: '몸', d: 'M40 100 Q90 40 160 55 Q220 70 230 100 Q220 130 160 145 Q90 160 40 100 Z', defaultFill: '#B8E0FF' },
      { id: 'tail', label: '꼬리', d: 'M230 100 L270 60 L270 140 Z', defaultFill: '#7DD3FC' },
      { id: 'fin', label: '지느러미', d: 'M130 70 L160 40 L170 75 Z', defaultFill: '#7DD3FC' },
      { id: 'eye', label: '눈', d: 'M90 95 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0', defaultFill: '#FFF' },
    ],
  },
  {
    id: 'food-apple',
    title: '사과',
    category: 'food',
    quality: 'ready',
    viewBox: '0 0 240 240',
    outlines: [],
    regions: [
      { id: 'body', label: '사과', d: 'M120 60 C170 55 200 100 195 150 C190 200 150 215 120 215 C90 215 50 200 45 150 C40 100 70 55 120 60 Z', defaultFill: '#FFD0D0' },
      { id: 'leaf', label: '잎', d: 'M120 55 Q150 30 165 55 Q140 60 120 55 Z', defaultFill: '#B8F0C0' },
      { id: 'stem', label: '꼭지', d: 'M115 40 h10 v25 h-10 z', defaultFill: '#C4A484' },
    ],
    missionHints: ['사과에 맞는 색을 골라볼까요? (강요 없어요)'],
  },
  {
    id: 'nature-flower',
    title: '꽃',
    category: 'nature',
    quality: 'ready',
    viewBox: '0 0 240 260',
    outlines: [],
    regions: [
      { id: 'petal-1', label: '꽃잎', d: 'M120 80 m-28 -40 a28 40 0 1 0 56 0 a28 40 0 1 0 -56 0', defaultFill: '#FFD6E8' },
      { id: 'petal-2', label: '꽃잎', d: 'M160 110 m-20 -30 a28 40 70 1 0 40 40 a28 40 70 1 0 -40 -40', defaultFill: '#FFD6E8' },
      { id: 'petal-3', label: '꽃잎', d: 'M80 110 m20 -30 a28 40 -70 1 0 -40 40 a28 40 -70 1 0 40 -40', defaultFill: '#FFD6E8' },
      { id: 'center', label: '꽃술', d: 'M120 120 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0', defaultFill: '#FFE08A' },
      { id: 'stem', label: '줄기', d: 'M112 140 h16 v90 h-16 z', defaultFill: '#86EFAC' },
      { id: 'leaf', label: '잎', d: 'M128 180 Q170 170 175 200 Q140 205 128 190 Z', defaultFill: '#4ADE80' },
    ],
  },
  {
    id: 'space-rocket',
    title: '로켓',
    category: 'space',
    quality: 'ready',
    viewBox: '0 0 240 280',
    outlines: [],
    regions: [
      { id: 'body', label: '몸체', d: 'M90 60 L150 60 L160 180 L80 180 Z', defaultFill: '#E8EEFF' },
      { id: 'nose', label: '꼭대기', d: 'M90 60 L120 20 L150 60 Z', defaultFill: '#FFD0D0' },
      { id: 'window', label: '창문', d: 'M120 100 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0', defaultFill: '#B8D4FF' },
      { id: 'fin-l', label: '날개', d: 'M80 150 L50 200 L80 180 Z', defaultFill: '#FFD400' },
      { id: 'fin-r', label: '날개', d: 'M160 150 L190 200 L160 180 Z', defaultFill: '#FFD400' },
      { id: 'flame', label: '불꽃', d: 'M95 180 L120 135 L145 180 Z', defaultFill: '#FFB020' },
    ],
    missionHints: ['우주 느낌으로 꾸며볼까요?'],
  },
  {
    id: 'town-house',
    title: '집',
    category: 'town',
    quality: 'ready',
    viewBox: '0 0 280 240',
    outlines: [],
    regions: [
      { id: 'wall', label: '벽', d: 'M60 110 H220 V200 H60 Z', defaultFill: '#FFE4C4' },
      { id: 'roof', label: '지붕', d: 'M50 110 L140 40 L230 110 Z', defaultFill: '#FFB4B4' },
      { id: 'door', label: '문', d: 'M120 140 h40 v60 h-40 z', defaultFill: '#C4A484' },
      { id: 'window', label: '창문', d: 'M75 130 h35 v30 H75 z', defaultFill: '#B8D4FF' },
      { id: 'chimney', label: '굴뚝', d: 'M180 55 h25 v40 h-25 z', defaultFill: '#CFCFCF' },
    ],
  },
]

export function readyTemplates() {
  return COLOR_TEMPLATES.filter((t) => t.quality === 'ready')
}

export function getTemplate(id: string) {
  return COLOR_TEMPLATES.find((t) => t.id === id)
}

export function templatesByCategory(cat: ColorCategory | 'all') {
  const all = readyTemplates()
  if (cat === 'all') return all
  return all.filter((t) => t.category === cat)
}
