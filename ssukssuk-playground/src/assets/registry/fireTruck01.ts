import type { AssetSpec } from './types'

/** FIRE_TRUCK_01 — first baseline vehicle. All parts ASSET_REQUIRED until Quality Gate. */
export const FIRE_TRUCK_01_PART_IDS = [
  'body',
  'frontDoor',
  'rearDoor',
  'frontWheel',
  'rearWheel',
  'frontRim',
  'rearRim',
  'frontWindow',
  'sideWindow',
  'bumper',
  'ladder',
  'emergencyLight',
  'hose',
  'headLight',
  'shadow',
] as const

export type FireTruck01PartId = (typeof FIRE_TRUCK_01_PART_IDS)[number]

const part = (
  key: string,
  labelKo: string,
  size: { w: number; h: number },
  extra?: Partial<AssetSpec>,
): AssetSpec => ({
  id: `ASSET_FIRETRUCK_${key}`,
  kind: 'vehicle_part',
  labelKo,
  usage: '자동차 공방 · 조립 · 부분 색칠 · 운전 · 미션 (FIRE_TRUCK_01)',
  size,
  transparentBackground: true,
  partStructure: [...FIRE_TRUCK_01_PART_IDS],
  states: ['disassembled', 'assembled', 'painted', 'driving', 'mission', 'celebrate'],
  animationRequirements:
    '휠 회전, 경광등 점멸, 조립 스냅 바운스, 미션 성공 celebrate. 연결부(차축·문·사다리)가 애니메이션 중 깨지지 않아야 함.',
  status: 'ASSET_REQUIRED',
  baselineGroup: 'fire_truck_01',
  qualityGateNotes:
    '임시 SVG/CSS 자동차 금지. Visual Bible 화풍·둥근 토이 재질·파츠 경계·색칠 영역 분리 통과 시에만 APPROVED.',
  ...extra,
})

export const FIRE_TRUCK_01_ASSETS: AssetSpec[] = [
  part('BODY', '소방차 차체', { w: 1024, h: 640 }),
  part('FRONT_DOOR', '앞문', { w: 512, h: 512 }),
  part('REAR_DOOR', '뒷문/측면 패널', { w: 512, h: 512 }),
  part('WHEEL_FRONT', '앞바퀴 타이어', { w: 512, h: 512 }),
  part('WHEEL_REAR', '뒷바퀴 타이어', { w: 512, h: 512 }),
  part('RIM_FRONT', '앞 림', { w: 384, h: 384 }),
  part('RIM_REAR', '뒷 림', { w: 384, h: 384 }),
  part('WINDOW_FRONT', '앞유리(표정)', { w: 640, h: 480 }),
  part('WINDOW_SIDE', '옆유리', { w: 512, h: 384 }),
  part('BUMPER', '범퍼', { w: 640, h: 256 }),
  part('LADDER', '사다리', { w: 1024, h: 256 }),
  part('EMERGENCY_LIGHT', '경광등', { w: 384, h: 384 }),
  part('HOSE', '호스', { w: 512, h: 512 }),
  part('HEAD_LIGHT', '전조등', { w: 256, h: 256 }),
  part('SHADOW', '그림자', { w: 1024, h: 256 }, { transparentBackground: true }),
]

export const FIRE_TRUCK_01_VEHICLE = {
  id: 'FIRE_TRUCK_01',
  labelKo: '소방차',
  labelEn: 'Fire truck',
  status: 'ASSET_REQUIRED' as const,
  workshopReady: false,
  note: '기준 Asset 트라이어드(쑥쑥이 + FIRE_TRUCK_01 + 공방) Quality Gate 통과 전 플레이 불가. 임시 SVG READY 처리 금지.',
  parts: FIRE_TRUCK_01_PART_IDS,
  paintRegions: ['BODY', 'DOOR', 'RIM', 'BUMPER', 'LADDER', 'LIGHT', 'HOSE', 'WINDOW'] as const,
}
