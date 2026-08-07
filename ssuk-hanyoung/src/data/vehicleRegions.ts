/** Shared TEMP line-art region paths — geometric placeholders, NOT premium 3D REAL art. */

export type RegionPath = { id: string; label: string; d: string; defaultFill?: string; number?: number }

const ink = '#FFFDF8'

export function sedanRegions(tint = '#FFE4EC'): RegionPath[] {
  return [
    { id: 'body', label: '차체', d: 'M48 138 Q58 98 120 94 L200 94 Q260 98 272 138 L272 158 L48 158 Z', defaultFill: tint, number: 1 },
    { id: 'door', label: '문', d: 'M150 100 h55 v55 h-55 z', defaultFill: tint, number: 2 },
    { id: 'window', label: '창문', d: 'M130 100 L195 100 Q210 100 215 118 L130 118 Z', defaultFill: '#D6E4FF', number: 3 },
    { id: 'wheelFront', label: '앞바퀴', d: 'M90 155 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0', defaultFill: '#3a3a3a', number: 4 },
    { id: 'wheelRear', label: '뒷바퀴', d: 'M230 155 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0', defaultFill: '#3a3a3a', number: 4 },
    { id: 'bumper', label: '범퍼', d: 'M48 158 h224 v10 H48 z', defaultFill: '#CFCFCF', number: 5 },
    { id: 'headlightLeft', label: '전조등', d: 'M265 125 h18 v16 h-18 z', defaultFill: '#FFF3B0', number: 6 },
    { id: 'grille', label: '그릴', d: 'M255 140 h22 v12 h-22 z', defaultFill: '#9CA3AF', number: 7 },
  ]
}

export function fireRegions(): RegionPath[] {
  return [
    { id: 'body', label: '차체', d: 'M40 150 L40 100 L155 100 L155 150 Z', defaultFill: '#FFD0D0', number: 1 },
    { id: 'door', label: '문', d: 'M160 150 L160 80 L240 80 L270 120 L270 150 Z', defaultFill: '#FFD0D0', number: 2 },
    { id: 'window', label: '창문', d: 'M175 95 L225 95 L245 120 L175 120 Z', defaultFill: '#C8E0FF', number: 3 },
    { id: 'sirenLeft', label: '사이렌', d: 'M185 68 h18 v12 h-18 z', defaultFill: '#FF6B6B', number: 4 },
    { id: 'sirenRight', label: '사이렌', d: 'M207 68 h18 v12 h-18 z', defaultFill: '#FFE08A', number: 4 },
    { id: 'ladder', label: '사다리', d: 'M55 105 h85 v8 H55 z', defaultFill: '#CFCFCF', number: 5 },
    { id: 'bumper', label: '범퍼', d: 'M40 150 h230 v8 H40 z', defaultFill: '#BBB', number: 6 },
    { id: 'wheelFront', label: '앞바퀴', d: 'M90 155 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', defaultFill: '#333', number: 7 },
    { id: 'wheelRear', label: '뒷바퀴', d: 'M230 155 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', defaultFill: '#333', number: 7 },
    { id: 'headlightLeft', label: '전조등', d: 'M268 125 h14 v14 h-14 z', defaultFill: '#FFF8DC', number: 6 },
  ]
}

export function policeRegions(): RegionPath[] {
  return [
    { id: 'body', label: '차체', d: 'M45 140 Q55 100 110 96 L210 96 Q265 100 275 140 L275 155 L45 155 Z', defaultFill: '#E8EEFF', number: 1 },
    { id: 'door', label: '문', d: 'M140 100 h50 v50 h-50 z', defaultFill: '#E8EEFF', number: 2 },
    { id: 'window', label: '창문', d: 'M125 102 L200 102 Q210 102 214 120 L125 120 Z', defaultFill: '#B8D4FF', number: 3 },
    { id: 'sirenLeft', label: '경광등', d: 'M145 82 h18 v12 h-18 z', defaultFill: '#FF8A8A', number: 4 },
    { id: 'sirenRight', label: '경광등', d: 'M167 82 h18 v12 h-18 z', defaultFill: '#7DD3FC', number: 4 },
    { id: 'bumper', label: '범퍼', d: 'M45 155 h230 v8 H45 z', defaultFill: '#BBB', number: 5 },
    { id: 'wheelFront', label: '앞바퀴', d: 'M95 155 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', defaultFill: '#333', number: 6 },
    { id: 'wheelRear', label: '뒷바퀴', d: 'M225 155 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', defaultFill: '#333', number: 6 },
    { id: 'headlightLeft', label: '전조등', d: 'M268 128 h14 v14 h-14 z', defaultFill: '#FFF3B0', number: 7 },
  ]
}

export function ambulanceRegions(): RegionPath[] {
  return [
    { id: 'body', label: '차체', d: 'M40 150 L40 90 L200 90 L200 150 Z', defaultFill: '#FFF5F5', number: 1 },
    { id: 'door', label: '문', d: 'M205 150 L205 95 L280 95 L290 130 L290 150 Z', defaultFill: '#FFF5F5', number: 2 },
    { id: 'window', label: '창문', d: 'M220 105 L270 105 L278 128 L220 128 Z', defaultFill: '#C8E0FF', number: 3 },
    { id: 'cross', label: '십자', d: 'M100 105 h30 v12 H100 z M111 94 h8 v34 h-8 z', defaultFill: '#FF2D55', number: 4 },
    { id: 'sirenLeft', label: '사이렌', d: 'M230 82 h40 v12 h-40 z', defaultFill: '#FF6B6B', number: 5 },
    { id: 'bumper', label: '범퍼', d: 'M40 150 h250 v8 H40 z', defaultFill: '#CFCFCF', number: 6 },
    { id: 'wheelFront', label: '앞바퀴', d: 'M95 155 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', defaultFill: '#333', number: 7 },
    { id: 'wheelRear', label: '뒷바퀴', d: 'M240 155 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', defaultFill: '#333', number: 7 },
  ]
}

export function busRegions(tint = '#FFF3B0'): RegionPath[] {
  return [
    { id: 'body', label: '차체', d: 'M35 150 L35 80 L270 80 L285 105 L285 150 Z', defaultFill: tint, number: 1 },
    { id: 'door', label: '문', d: 'M230 120 h40 v30 h-40 z', defaultFill: '#FFE08A', number: 2 },
    { id: 'window', label: '창문', d: 'M50 90 h200 v28 H50 z', defaultFill: '#C8E7FF', number: 3 },
    { id: 'wheelFront', label: '앞바퀴', d: 'M90 155 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', defaultFill: '#333', number: 4 },
    { id: 'wheelRear', label: '뒷바퀴', d: 'M230 155 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', defaultFill: '#333', number: 4 },
    { id: 'headlightLeft', label: '헤드라이트', d: 'M275 120 h12 v16 h-12 z', defaultFill: '#FFF8DC', number: 5 },
    { id: 'bumper', label: '범퍼', d: 'M35 150 h250 v8 H35 z', defaultFill: '#BBB', number: 6 },
  ]
}

export function dumpRegions(): RegionPath[] {
  return [
    { id: 'body', label: '운전석', d: 'M40 140 L40 90 L120 90 L140 120 L140 150 L40 150 Z', defaultFill: '#FFD0A0', number: 1 },
    { id: 'bed', label: '적재함', d: 'M145 100 L280 100 L280 150 L145 150 Z', defaultFill: '#FFB020', number: 2 },
    { id: 'window', label: '창문', d: 'M55 100 h55 v22 H55 z', defaultFill: '#C8E0FF', number: 3 },
    { id: 'wheelFront', label: '앞바퀴', d: 'M80 155 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0', defaultFill: '#333', number: 4 },
    { id: 'wheelRear', label: '뒷바퀴', d: 'M230 155 m-24 0 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0', defaultFill: '#333', number: 4 },
    { id: 'bumper', label: '범퍼', d: 'M40 150 h100 v8 H40 z', defaultFill: '#CFCFCF', number: 5 },
    { id: 'headlightLeft', label: '전조등', d: 'M42 125 h14 v12 h-14 z', defaultFill: '#FFF3B0', number: 6 },
  ]
}

export function excavatorRegions(): RegionPath[] {
  return [
    { id: 'body', label: '몸체', d: 'M80 130 H220 V170 H80 Z', defaultFill: '#FFE08A', number: 1 },
    { id: 'cabin', label: '운전석', d: 'M120 90 H180 V130 H120 Z', defaultFill: '#FFD400', number: 2 },
    { id: 'window', label: '창문', d: 'M128 98 h44 v24 h-44 z', defaultFill: '#B8D4FF', number: 3 },
    { id: 'arm', label: '팔', d: 'M180 110 L260 70 L270 85 L190 125 Z', defaultFill: '#FFB020', number: 4 },
    { id: 'bucket', label: '버킷', d: 'M255 65 L290 95 L270 110 L245 80 Z', defaultFill: '#CFCFCF', number: 5 },
    { id: 'track', label: '궤도', d: 'M70 170 H230 V195 H70 Z', defaultFill: '#3a3a3a', number: 6 },
    { id: 'wheelFront', label: '바퀴', d: 'M95 182 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0', defaultFill: '#222', number: 7 },
    { id: 'wheelRear', label: '바퀴', d: 'M200 182 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0', defaultFill: '#222', number: 7 },
  ]
}

export function bulldozerRegions(): RegionPath[] {
  return [
    { id: 'body', label: '몸체', d: 'M90 110 H230 V165 H90 Z', defaultFill: '#FFE08A', number: 1 },
    { id: 'cabin', label: '운전석', d: 'M140 75 H200 V110 H140 Z', defaultFill: '#FFD400', number: 2 },
    { id: 'window', label: '창문', d: 'M148 82 h44 v22 h-44 z', defaultFill: '#B8D4FF', number: 3 },
    { id: 'blade', label: '블레이드', d: 'M40 120 L90 100 L90 180 L40 160 Z', defaultFill: '#CFCFCF', number: 4 },
    { id: 'track', label: '궤도', d: 'M95 165 H225 V195 H95 Z', defaultFill: '#3a3a3a', number: 5 },
    { id: 'wheelFront', label: '바퀴', d: 'M120 180 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0', defaultFill: '#222', number: 6 },
    { id: 'wheelRear', label: '바퀴', d: 'M200 180 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0', defaultFill: '#222', number: 6 },
  ]
}

export function mixerRegions(): RegionPath[] {
  return [
    { id: 'body', label: '운전석', d: 'M40 140 L40 95 L115 95 L130 130 L130 155 L40 155 Z', defaultFill: '#FFD0D0', number: 1 },
    { id: 'drum', label: '드럼', d: 'M140 90 Q220 70 260 110 Q220 160 140 145 Z', defaultFill: '#FF8FAB', number: 2 },
    { id: 'window', label: '창문', d: 'M55 105 h45 v22 H55 z', defaultFill: '#C8E0FF', number: 3 },
    { id: 'chute', label: '슈트', d: 'M250 120 L290 150 L270 155 L240 130 Z', defaultFill: '#CFCFCF', number: 4 },
    { id: 'wheelFront', label: '앞바퀴', d: 'M80 155 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', defaultFill: '#333', number: 5 },
    { id: 'wheelRear', label: '뒷바퀴', d: 'M210 155 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0', defaultFill: '#333', number: 5 },
    { id: 'bumper', label: '범퍼', d: 'M40 155 h90 v8 H40 z', defaultFill: '#BBB', number: 6 },
  ]
}

export function craneRegions(): RegionPath[] {
  return [
    { id: 'body', label: '몸체', d: 'M70 140 H200 V175 H70 Z', defaultFill: '#FFE08A', number: 1 },
    { id: 'cabin', label: '운전석', d: 'M90 105 H150 V140 H90 Z', defaultFill: '#FFD400', number: 2 },
    { id: 'window', label: '창문', d: 'M98 112 h42 v20 h-42 z', defaultFill: '#B8D4FF', number: 3 },
    { id: 'boom', label: '붐', d: 'M150 115 L280 50 L290 60 L160 130 Z', defaultFill: '#FFB020', number: 4 },
    { id: 'hook', label: '후크', d: 'M275 55 L285 55 L285 95 L270 95 L270 85 L275 85 Z', defaultFill: '#CFCFCF', number: 5 },
    { id: 'outrigger', label: '아우트리거', d: 'M60 175 H210 V190 H60 Z', defaultFill: '#3a3a3a', number: 6 },
    { id: 'wheelFront', label: '바퀴', d: 'M95 182 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0', defaultFill: '#222', number: 7 },
    { id: 'wheelRear', label: '바퀴', d: 'M175 182 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0', defaultFill: '#222', number: 7 },
  ]
}

export function truckRegions(tint = '#B8E0FF'): RegionPath[] {
  return [
    { id: 'body', label: '운전석', d: 'M35 145 L35 95 L110 95 L125 125 L125 155 L35 155 Z', defaultFill: tint, number: 1 },
    { id: 'bed', label: '적재함', d: 'M130 105 L285 105 L285 155 L130 155 Z', defaultFill: '#E8EEFF', number: 2 },
    { id: 'window', label: '창문', d: 'M48 105 h50 v22 H48 z', defaultFill: '#C8E0FF', number: 3 },
    { id: 'wheelFront', label: '앞바퀴', d: 'M75 155 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', defaultFill: '#333', number: 4 },
    { id: 'wheelRear', label: '뒷바퀴', d: 'M230 155 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0', defaultFill: '#333', number: 4 },
    { id: 'bumper', label: '범퍼', d: 'M35 155 h90 v8 H35 z', defaultFill: '#BBB', number: 5 },
    { id: 'headlightLeft', label: '전조등', d: 'M36 128 h14 v12 h-14 z', defaultFill: '#FFF3B0', number: 6 },
  ]
}

/** Empty region set for ART_REQUIRED catalog entries (not playable). */
export function emptyRegions(): RegionPath[] {
  return []
}

export { ink }
