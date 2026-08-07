/**
 * 쑥쑥 색칠놀이 — 자동차 & 중장비 스튜디오 (data-driven)
 *
 * GRAPHIC FREEZE:
 * - TEMP line-art = geometric playable placeholders (NOT premium 3D)
 * - ART_REQUIRED = catalog slot awaiting approved 2.5D/3D character art
 * - REAL reference = only existing approved WebP when mapped
 * Never promote TEMP SVG to REAL without approved production files.
 */

import { CHAR_IMG } from '../components/GameArt'
import {
  ambulanceRegions,
  bulldozerRegions,
  busRegions,
  craneRegions,
  dumpRegions,
  emptyRegions,
  excavatorRegions,
  fireRegions,
  mixerRegions,
  policeRegions,
  sedanRegions,
  truckRegions,
  type RegionPath,
} from './vehicleRegions'

export type ArtStatus = 'REAL' | 'TEMP' | 'ART_REQUIRED'
export type VehiclePaintCategory = 'cars' | 'rescue' | 'busTruck' | 'construction' | 'special'
export type PaintTool = 'crayon' | 'pencil' | 'brush' | 'marker' | 'eraser' | 'bucket'
export type BrushSize = 'sm' | 'md' | 'lg'
export type StudioMode = 'easy' | 'free' | 'numbers'

export type VehicleRegion = RegionPath

export type VehicleColoringTemplate = {
  id: string
  name: string
  category: VehiclePaintCategory
  /** Approved WebP when available — lazy-loaded thumbs only */
  thumbnail?: string
  referenceImage?: string
  referenceStatus: ArtStatus
  /** Line-art for coloring */
  lineArtStatus: ArtStatus
  difficulty: 1 | 2 | 3
  recommendedAge: [number, number]
  viewBox: string
  regions: VehicleRegion[]
  outlines?: string[]
  defaultPalette?: string[]
  learningTags: string[]
  celebrateEffect?: 'siren' | 'bucket' | 'crane' | 'dump' | 'door' | 'none'
  /** false when ART_REQUIRED with no regions */
  playable: boolean
}

export const VEHICLE_CATEGORY_LABEL: Record<VehiclePaintCategory, string> = {
  cars: '자동차',
  rescue: '경찰/구조',
  busTruck: '버스/트럭',
  construction: '중장비',
  special: '특수차',
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
  { id: 'mint', ko: '민트', hex: '#2DD4BF' },
  { id: 'teal', ko: '청록', hex: '#14B8A6' },
  { id: 'navy', ko: '남색', hex: '#1E3A8A' },
  { id: 'lilac', ko: '연보라', hex: '#C4B5FD' },
  { id: 'blush', ko: '연핑크', hex: '#FBCFE8' },
  { id: 'apricot', ko: '살구', hex: '#FFB086' },
] as const

/** Paint-by-number legend (optional mode) */
export const NUMBER_COLOR_MAP: Record<number, { ko: string; hex: string }> = {
  1: { ko: '하늘', hex: '#38BDF8' },
  2: { ko: '회색', hex: '#9CA3AF' },
  3: { ko: '빨강', hex: '#FF2D55' },
  4: { ko: '노랑', hex: '#FFD400' },
  5: { ko: '진회색', hex: '#4B5563' },
  6: { ko: '주황', hex: '#FF7A00' },
  7: { ko: '하양', hex: '#FFF8E7' },
}

export const TOOLS: Array<{ id: PaintTool; ko: string; visual: string }> = [
  { id: 'crayon', ko: '크레용', visual: 'reward.paint' },
  { id: 'pencil', ko: '색연필', visual: 'category.creativity' },
  { id: 'brush', ko: '붓', visual: 'category.creativity' },
  { id: 'marker', ko: '마커', visual: 'reward.paint' },
  { id: 'bucket', ko: '페인트통', visual: 'reward.gift' },
  { id: 'eraser', ko: '지우개', visual: 'emotion.calm' },
]

export const BRUSH_PX: Record<BrushSize, number> = { sm: 8, md: 18, lg: 32 }

function v(partial: Omit<VehicleColoringTemplate, 'playable'>): VehicleColoringTemplate {
  const playable = partial.lineArtStatus !== 'ART_REQUIRED' && partial.regions.length > 0
  return { ...partial, playable }
}

function artRequired(
  id: string,
  name: string,
  category: VehiclePaintCategory,
  difficulty: 1 | 2 | 3 = 2,
  celebrate: VehicleColoringTemplate['celebrateEffect'] = 'none',
): VehicleColoringTemplate {
  return v({
    id,
    name,
    category,
    referenceStatus: 'ART_REQUIRED',
    lineArtStatus: 'ART_REQUIRED',
    difficulty,
    recommendedAge: [3, 7],
    viewBox: '0 0 320 220',
    regions: emptyRegions(),
    learningTags: ['creativity', 'colorRecognition', category],
    celebrateEffect: celebrate,
  })
}

/** 32+ vehicles — expandable to 50–100 without code changes beyond data rows */
export const VEHICLE_COLORING_TEMPLATES: VehicleColoringTemplate[] = [
  // —— 일반 자동차 (TEMP line-art playable; ref uses approved car WebP when possible) ——
  v({
    id: 'car-red-01',
    name: '빨간 자동차',
    category: 'cars',
    thumbnail: CHAR_IMG.car,
    referenceImage: CHAR_IMG.car,
    referenceStatus: 'REAL',
    lineArtStatus: 'TEMP',
    difficulty: 1,
    recommendedAge: [3, 5],
    viewBox: '0 0 320 220',
    regions: sedanRegions('#FFD0D0'),
    learningTags: ['creativity', 'colorRecognition', 'fineMotor'],
    celebrateEffect: 'none',
  }),
  v({
    id: 'car-blue-01',
    name: '파란 자동차',
    category: 'cars',
    thumbnail: CHAR_IMG.car,
    referenceImage: CHAR_IMG.car,
    referenceStatus: 'REAL',
    lineArtStatus: 'TEMP',
    difficulty: 1,
    recommendedAge: [3, 5],
    viewBox: '0 0 320 220',
    regions: sedanRegions('#C8E0FF'),
    learningTags: ['creativity', 'colorRecognition', 'fineMotor'],
  }),
  v({
    id: 'car-yellow-01',
    name: '노란 자동차',
    category: 'cars',
    thumbnail: CHAR_IMG.car,
    referenceImage: CHAR_IMG.car,
    referenceStatus: 'REAL',
    lineArtStatus: 'TEMP',
    difficulty: 1,
    recommendedAge: [3, 5],
    viewBox: '0 0 320 220',
    regions: sedanRegions('#FFF3B0'),
    learningTags: ['creativity', 'colorRecognition', 'fineMotor'],
  }),
  v({
    id: 'car-green-01',
    name: '초록 자동차',
    category: 'cars',
    thumbnail: CHAR_IMG.car,
    referenceImage: CHAR_IMG.car,
    referenceStatus: 'REAL',
    lineArtStatus: 'TEMP',
    difficulty: 1,
    recommendedAge: [3, 5],
    viewBox: '0 0 320 220',
    regions: sedanRegions('#BBF7D0'),
    learningTags: ['creativity', 'colorRecognition', 'fineMotor'],
  }),
  v({
    id: 'car-pink-01',
    name: '핑크 자동차',
    category: 'cars',
    thumbnail: CHAR_IMG.car,
    referenceImage: CHAR_IMG.car,
    referenceStatus: 'REAL',
    lineArtStatus: 'TEMP',
    difficulty: 1,
    recommendedAge: [3, 5],
    viewBox: '0 0 320 220',
    regions: sedanRegions('#FFD6E8'),
    learningTags: ['creativity', 'colorRecognition', 'fineMotor'],
  }),
  v({
    id: 'car-white-01',
    name: '흰 자동차',
    category: 'cars',
    thumbnail: CHAR_IMG.car,
    referenceImage: CHAR_IMG.car,
    referenceStatus: 'REAL',
    lineArtStatus: 'TEMP',
    difficulty: 1,
    recommendedAge: [3, 5],
    viewBox: '0 0 320 220',
    regions: sedanRegions('#FFF8E7'),
    learningTags: ['creativity', 'colorRecognition', 'fineMotor'],
  }),
  v({
    id: 'car-black-01',
    name: '검정 자동차',
    category: 'cars',
    thumbnail: CHAR_IMG.car,
    referenceImage: CHAR_IMG.car,
    referenceStatus: 'REAL',
    lineArtStatus: 'TEMP',
    difficulty: 1,
    recommendedAge: [3, 5],
    viewBox: '0 0 320 220',
    regions: sedanRegions('#D1D5DB'),
    learningTags: ['creativity', 'colorRecognition', 'fineMotor'],
  }),

  // —— 경찰 / 구조 ——
  v({
    id: 'police-01',
    name: '경찰차',
    category: 'rescue',
    thumbnail: CHAR_IMG.police,
    referenceImage: CHAR_IMG.police,
    referenceStatus: 'REAL',
    lineArtStatus: 'TEMP',
    difficulty: 2,
    recommendedAge: [3, 6],
    viewBox: '0 0 320 220',
    regions: policeRegions(),
    learningTags: ['creativity', 'observation', 'colorRecognition'],
    celebrateEffect: 'siren',
  }),
  v({
    id: 'fire-truck-01',
    name: '소방차',
    category: 'rescue',
    thumbnail: CHAR_IMG.fire,
    referenceImage: CHAR_IMG.fire,
    referenceStatus: 'REAL',
    lineArtStatus: 'TEMP',
    difficulty: 2,
    recommendedAge: [3, 6],
    viewBox: '0 0 320 220',
    regions: fireRegions(),
    learningTags: ['creativity', 'observation', 'colorRecognition'],
    celebrateEffect: 'siren',
  }),
  v({
    id: 'ambulance-01',
    name: '구급차',
    category: 'rescue',
    thumbnail: CHAR_IMG.ambulance,
    referenceImage: CHAR_IMG.ambulance,
    referenceStatus: 'REAL',
    lineArtStatus: 'TEMP',
    difficulty: 2,
    recommendedAge: [3, 6],
    viewBox: '0 0 320 220',
    regions: ambulanceRegions(),
    learningTags: ['creativity', 'observation', 'colorRecognition'],
    celebrateEffect: 'siren',
  }),

  // —— 버스 / 트럭 ——
  v({
    id: 'school-bus-01',
    name: '스쿨버스',
    category: 'busTruck',
    thumbnail: CHAR_IMG.bus,
    referenceImage: CHAR_IMG.bus,
    referenceStatus: 'REAL',
    lineArtStatus: 'TEMP',
    difficulty: 2,
    recommendedAge: [3, 6],
    viewBox: '0 0 320 220',
    regions: busRegions('#FFF3B0'),
    learningTags: ['creativity', 'colorRecognition'],
    celebrateEffect: 'door',
  }),
  v({
    id: 'city-bus-01',
    name: '시내버스',
    category: 'busTruck',
    thumbnail: CHAR_IMG.busFront,
    referenceImage: CHAR_IMG.busFront,
    referenceStatus: 'REAL',
    lineArtStatus: 'TEMP',
    difficulty: 2,
    recommendedAge: [3, 6],
    viewBox: '0 0 320 220',
    regions: busRegions('#C8E0FF'),
    learningTags: ['creativity', 'colorRecognition'],
    celebrateEffect: 'door',
  }),
  v({
    id: 'dump-truck-01',
    name: '덤프트럭',
    category: 'busTruck',
    thumbnail: CHAR_IMG.dump,
    referenceImage: CHAR_IMG.dump,
    referenceStatus: 'REAL',
    lineArtStatus: 'TEMP',
    difficulty: 2,
    recommendedAge: [4, 7],
    viewBox: '0 0 320 220',
    regions: dumpRegions(),
    learningTags: ['creativity', 'observation'],
    celebrateEffect: 'dump',
  }),
  v({
    id: 'cargo-truck-01',
    name: '화물트럭',
    category: 'busTruck',
    thumbnail: CHAR_IMG.dump,
    referenceImage: CHAR_IMG.dump,
    referenceStatus: 'REAL',
    lineArtStatus: 'TEMP',
    difficulty: 2,
    recommendedAge: [4, 7],
    viewBox: '0 0 320 220',
    regions: truckRegions('#B8E0FF'),
    learningTags: ['creativity', 'colorRecognition'],
  }),
  artRequired('delivery-truck-01', '택배트럭', 'busTruck', 2),
  artRequired('tanker-01', '탱크로리', 'busTruck', 2),
  artRequired('garbage-truck-01', '쓰레기차', 'busTruck', 2),

  // —— 건설 중장비 ——
  v({
    id: 'excavator-01',
    name: '굴착기',
    category: 'construction',
    referenceStatus: 'ART_REQUIRED',
    lineArtStatus: 'TEMP',
    difficulty: 2,
    recommendedAge: [4, 7],
    viewBox: '0 0 320 220',
    regions: excavatorRegions(),
    learningTags: ['creativity', 'observation', 'fineMotor'],
    celebrateEffect: 'bucket',
  }),
  v({
    id: 'bulldozer-01',
    name: '불도저',
    category: 'construction',
    referenceStatus: 'ART_REQUIRED',
    lineArtStatus: 'TEMP',
    difficulty: 2,
    recommendedAge: [4, 7],
    viewBox: '0 0 320 220',
    regions: bulldozerRegions(),
    learningTags: ['creativity', 'observation'],
    celebrateEffect: 'none',
  }),
  artRequired('wheel-loader-01', '휠로더', 'construction', 2, 'bucket'),
  artRequired('forklift-01', '지게차', 'construction', 2),
  v({
    id: 'mixer-01',
    name: '레미콘',
    category: 'construction',
    referenceStatus: 'ART_REQUIRED',
    lineArtStatus: 'TEMP',
    difficulty: 2,
    recommendedAge: [4, 7],
    viewBox: '0 0 320 220',
    regions: mixerRegions(),
    learningTags: ['creativity', 'observation'],
  }),
  v({
    id: 'crane-01',
    name: '크레인',
    category: 'construction',
    referenceStatus: 'ART_REQUIRED',
    lineArtStatus: 'TEMP',
    difficulty: 3,
    recommendedAge: [4, 7],
    viewBox: '0 0 320 220',
    regions: craneRegions(),
    learningTags: ['creativity', 'observation', 'fineMotor'],
    celebrateEffect: 'crane',
  }),
  artRequired('roller-01', '롤러', 'construction', 2),

  // —— 특수 ——
  artRequired('tow-truck-01', '견인차', 'special', 2),
  artRequired('car-carrier-01', '카캐리어', 'special', 3),
  artRequired('street-sweeper-01', '청소차', 'special', 2),
  artRequired('snowplow-01', '제설차', 'special', 2),
  artRequired('ice-cream-01', '아이스크림차', 'special', 1),
  artRequired('food-truck-01', '푸드트럭', 'special', 2),
  artRequired('camper-01', '캠핑카', 'special', 2),
  artRequired('monster-truck-01', '몬스터트럭', 'special', 2),
  // tractor as special/construction bridge — TEMP using dump-like + approved thumb
  v({
    id: 'tractor-01',
    name: '트랙터',
    category: 'special',
    thumbnail: CHAR_IMG.tractor,
    referenceImage: CHAR_IMG.tractor,
    referenceStatus: 'REAL',
    lineArtStatus: 'TEMP',
    difficulty: 2,
    recommendedAge: [3, 6],
    viewBox: '0 0 320 220',
    regions: [
      { id: 'body', label: '몸체', d: 'M90 120 H200 V165 H90 Z', defaultFill: '#BBF7D0', number: 1 },
      { id: 'cabin', label: '운전석', d: 'M120 80 H180 V120 H120 Z', defaultFill: '#86EFAC', number: 2 },
      { id: 'window', label: '창문', d: 'M128 88 h44 v24 h-44 z', defaultFill: '#C8E0FF', number: 3 },
      { id: 'hood', label: '보닛', d: 'M50 125 H90 V160 H50 Z', defaultFill: '#4ADE80', number: 4 },
      { id: 'wheelFront', label: '앞바퀴', d: 'M70 160 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0', defaultFill: '#333', number: 5 },
      { id: 'wheelRear', label: '뒷바퀴', d: 'M190 155 m-28 0 a28 28 0 1 0 56 0 a28 28 0 1 0 -56 0', defaultFill: '#333', number: 5 },
      { id: 'chimney', label: '굴뚝', d: 'M100 70 h14 v30 h-14 z', defaultFill: '#CFCFCF', number: 6 },
    ],
    learningTags: ['creativity', 'colorRecognition'],
  }),
]

export function getVehicleTemplate(id: string) {
  return VEHICLE_COLORING_TEMPLATES.find((t) => t.id === id)
}

export function playableVehicles() {
  return VEHICLE_COLORING_TEMPLATES.filter((t) => t.playable)
}

export function vehiclesByCategory(cat: VehiclePaintCategory | 'all') {
  if (cat === 'all') return VEHICLE_COLORING_TEMPLATES
  return VEHICLE_COLORING_TEMPLATES.filter((t) => t.category === cat)
}

export function countVehicleArt() {
  const all = VEHICLE_COLORING_TEMPLATES
  return {
    total: all.length,
    playable: all.filter((t) => t.playable).length,
    lineArtTemp: all.filter((t) => t.lineArtStatus === 'TEMP').length,
    lineArtReal: all.filter((t) => t.lineArtStatus === 'REAL').length,
    lineArtRequired: all.filter((t) => t.lineArtStatus === 'ART_REQUIRED').length,
    referenceReal: all.filter((t) => t.referenceStatus === 'REAL').length,
    referenceRequired: all.filter((t) => t.referenceStatus === 'ART_REQUIRED').length,
    regionSupport: all.filter((t) => t.regions.length > 0).length,
  }
}

/** Legacy aliases for ColorStudio migration */
export type ColorTemplate = VehicleColoringTemplate
export const COLOR_TEMPLATES = VEHICLE_COLORING_TEMPLATES
export function readyTemplates() {
  return playableVehicles()
}
export function getTemplate(id: string) {
  return getVehicleTemplate(id)
}
export function templatesByCategory(cat: VehiclePaintCategory | 'all' | string) {
  if (cat === 'all' || !cat) return playableVehicles()
  if (cat in VEHICLE_CATEGORY_LABEL) return vehiclesByCategory(cat as VehiclePaintCategory).filter((t) => t.playable)
  return playableVehicles()
}
export const CATEGORY_LABEL = VEHICLE_CATEGORY_LABEL
