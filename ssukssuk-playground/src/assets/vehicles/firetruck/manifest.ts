/**
 * Firetruck production asset manifest.
 *
 * REFERENCE IMAGE IS NOT A GAME ASSET.
 * These parts are independently authored layered SVGs for the workshop pipeline.
 * Each part supports independent color, transform, animation, and hit-testing.
 */

import type { FiretruckPartId, PaintSwatch, Vec2 } from '../../../types/vehicle'

export const FIRETRUCK_VIEWBOX = { w: 420, h: 260 }

export const FIRETRUCK_PART_META: Record<
  FiretruckPartId,
  {
    labelKo: string
    defaultColor: string
    paintable: boolean
    slotPos: Vec2
    assembleable: boolean
    z: number
  }
> = {
  shadow: {
    labelKo: '그림자',
    defaultColor: '#000000',
    paintable: false,
    slotPos: { x: 210, y: 228 },
    assembleable: false,
    z: 0,
  },
  body: {
    labelKo: '차체',
    defaultColor: '#E53935',
    paintable: true,
    slotPos: { x: 168, y: 148 },
    assembleable: true,
    z: 2,
  },
  door: {
    labelKo: '문',
    defaultColor: '#FFD54F',
    paintable: true,
    slotPos: { x: 292, y: 142 },
    assembleable: true,
    z: 3,
  },
  window: {
    labelKo: '창문',
    defaultColor: '#81D4FA',
    paintable: true,
    slotPos: { x: 318, y: 112 },
    assembleable: true,
    z: 4,
  },
  bumper: {
    labelKo: '범퍼',
    defaultColor: '#CFD8DC',
    paintable: true,
    slotPos: { x: 368, y: 168 },
    assembleable: true,
    z: 5,
  },
  ladder: {
    labelKo: '사다리',
    defaultColor: '#90A4AE',
    paintable: true,
    slotPos: { x: 150, y: 92 },
    assembleable: true,
    z: 6,
  },
  light: {
    labelKo: '경광등',
    defaultColor: '#29B6F6',
    paintable: true,
    slotPos: { x: 300, y: 72 },
    assembleable: true,
    z: 7,
  },
  rearWheel: {
    labelKo: '뒷바퀴',
    defaultColor: '#37474F',
    paintable: true,
    slotPos: { x: 120, y: 198 },
    assembleable: true,
    z: 8,
  },
  frontWheel: {
    labelKo: '앞바퀴',
    defaultColor: '#37474F',
    paintable: true,
    slotPos: { x: 310, y: 198 },
    assembleable: true,
    z: 9,
  },
}

/** Drag-assemble order (child-friendly sequence). */
export const FIRETRUCK_ASSEMBLE_ORDER: FiretruckPartId[] = [
  'body',
  'door',
  'window',
  'bumper',
  'ladder',
  'light',
  'rearWheel',
  'frontWheel',
]

export const FIRETRUCK_PAINT_SWATCHES: PaintSwatch[] = [
  { id: 'red', ko: '빨강', hex: '#E53935' },
  { id: 'orange', ko: '주황', hex: '#FB8C00' },
  { id: 'yellow', ko: '노랑', hex: '#FFD54F' },
  { id: 'lime', ko: '연두', hex: '#AED581' },
  { id: 'green', ko: '초록', hex: '#43A047' },
  { id: 'sky', ko: '하늘', hex: '#4FC3F7' },
  { id: 'blue', ko: '파랑', hex: '#1E88E5' },
  { id: 'purple', ko: '보라', hex: '#8E24AA' },
  { id: 'pink', ko: '분홍', hex: '#F06292' },
  { id: 'gray', ko: '회색', hex: '#90A4AE' },
  { id: 'white', ko: '하양', hex: '#FFF8E7' },
  { id: 'black', ko: '검정', hex: '#263238' },
]

/** Suggested “classic firetruck” paint recipe for mission hint. */
export const FIRETRUCK_CLASSIC_COLORS: Partial<Record<FiretruckPartId, string>> = {
  body: '#E53935',
  door: '#FFD54F',
  window: '#81D4FA',
  frontWheel: '#1E88E5',
  rearWheel: '#1E88E5',
  ladder: '#90A4AE',
  light: '#29B6F6',
  bumper: '#CFD8DC',
}

export const FIRETRUCK_TRAY_LAYOUT: Record<FiretruckPartId, Vec2> = {
  shadow: { x: -999, y: -999 },
  body: { x: 70, y: 70 },
  door: { x: 200, y: 55 },
  window: { x: 310, y: 50 },
  bumper: { x: 70, y: 150 },
  ladder: { x: 200, y: 140 },
  light: { x: 320, y: 135 },
  rearWheel: { x: 120, y: 220 },
  frontWheel: { x: 260, y: 220 },
}

export const SNAP_RADIUS = 48
