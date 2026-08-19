import type { AssetSpec } from './types'

/** Character Bible states — must look like the same Ssukssuk across all poses. */
export const SSUKSSUK_STATES = [
  'idle',
  'walk',
  'run',
  'point',
  'thinking',
  'happy',
  'surprised',
  'encourage',
  'sad',
  'celebrate',
  'wave',
] as const

export type SsukssukState = (typeof SSUKSSUK_STATES)[number]

export const SSUKSSUK_ASSETS: AssetSpec[] = SSUKSSUK_STATES.map((state) => ({
  id: `ASSET_SSUKSSUK_${state.toUpperCase()}`,
  kind: 'character' as const,
  labelKo: `쑥쑥이 · ${state}`,
  usage: `자동차 공방 가이드/리액션 · ${state}`,
  size: { w: 1024, h: 1024 },
  transparentBackground: true,
  partStructure: ['head', 'eyes', 'mouth', 'body', 'arms', 'legs', 'hat', 'overalls'],
  states: [...SSUKSSUK_STATES],
  animationRequirements:
    '동일 Character Bible: 얼굴·눈·몸 비율·의상·색·재질감 유지. 장면마다 다른 캐릭터 재생성 금지. 루프/원샷 포즈 시트.',
  status: 'ASSET_REQUIRED' as const,
  baselineGroup: 'ssukssuk' as const,
  qualityGateNotes: 'Visual Bible 비율/표정 참고만. crop·emoji·임시 SVG 금지.',
}))
