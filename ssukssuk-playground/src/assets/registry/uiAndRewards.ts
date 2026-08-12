import type { AssetSpec } from './types'

export const UI_ASSETS: AssetSpec[] = [
  {
    id: 'ASSET_UI_BTN_PRIMARY',
    kind: 'ui',
    labelKo: 'Primary 버튼',
    usage: '공방 CTA (시작/다음/미션)',
    size: { w: 512, h: 160 },
    transparentBackground: true,
    states: ['default', 'pressed', 'disabled'],
    animationRequirements: '눌림 시 scale/그림자. Design System 단일 화풍.',
    status: 'ASSET_REQUIRED',
    qualityGateNotes: 'Emoji 아이콘 금지. 큰 터치 영역·둥근 형태·동일 입체감.',
  },
  {
    id: 'ASSET_UI_ICON_HOME',
    kind: 'ui',
    labelKo: '홈 아이콘',
    usage: '네비게이션',
    size: { w: 256, h: 256 },
    transparentBackground: true,
    status: 'ASSET_REQUIRED',
  },
  {
    id: 'ASSET_UI_ICON_GARAGE',
    kind: 'ui',
    labelKo: '공방 아이콘',
    usage: '네비게이션 / 선택 카드',
    size: { w: 256, h: 256 },
    transparentBackground: true,
    status: 'ASSET_REQUIRED',
  },
]

export const REWARD_ASSETS: AssetSpec[] = [
  {
    id: 'ASSET_REWARD_STAR',
    kind: 'reward',
    labelKo: '보상 별',
    usage: '미션 완료 보상 표시 (게임 오브젝트)',
    size: { w: 256, h: 256 },
    transparentBackground: true,
    states: ['empty', 'earned', 'sparkle'],
    animationRequirements: '획득 시 pop + twinkle. Unicode ★ / emoji 사용 금지.',
    status: 'ASSET_REQUIRED',
  },
  {
    id: 'ASSET_EFFECT_FIRE',
    kind: 'effect',
    labelKo: '미션 불꽃',
    usage: '소방 미션 목표',
    size: { w: 512, h: 512 },
    transparentBackground: true,
    states: ['burn', 'extinguish'],
    animationRequirements: '루프 burn → 미션 성공 시 extinguish. CSS 가짜 불꽃 금지.',
    status: 'ASSET_REQUIRED',
  },
]
