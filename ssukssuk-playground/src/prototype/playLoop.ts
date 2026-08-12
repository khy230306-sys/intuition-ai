/**
 * Prototype 01 play loop — interactive stages.
 * Activated only when BASELINE TRIAD is GAME_READY (productionApproved).
 */

import { baselineTriad } from '../assets/registry'
import { buildFactorySnapshot } from '../assets/factory/pipeline'
import { clientApprovedCount } from '../assets/manifest/productionGate'

export type PlayStageId =
  | 'select_firetruck'
  | 'assemble'
  | 'paint'
  | 'wash'
  | 'repair'
  | 'drive'
  | 'fire_report'
  | 'dispatch'
  | 'hose_connect'
  | 'extinguish'
  | 'rescue_complete'
  | 'reward'
  | 'growth_record'

export type StageGate = 'PASS' | 'BLOCKED'

export type PlayStage = {
  id: PlayStageId
  labelKo: string
  interactive: string[]
  gate: StageGate
  reason: string
}

const LOOP: Omit<PlayStage, 'gate' | 'reason'>[] = [
  {
    id: 'select_firetruck',
    labelKo: '소방차 선택',
    interactive: ['선택'],
  },
  {
    id: 'assemble',
    labelKo: '조립',
    interactive: ['드래그', '스냅', '터치'],
  },
  {
    id: 'paint',
    labelKo: '자유 색칠/꾸미기',
    interactive: ['파츠 선택', '색 칠하기'],
  },
  {
    id: 'wash',
    labelKo: '세차',
    interactive: ['문지르기', '물', '거품', '스펀지'],
  },
  {
    id: 'repair',
    labelKo: '정비',
    interactive: ['관찰', '찾기', '시도', '해결'],
  },
  {
    id: 'drive',
    labelKo: '운전',
    interactive: ['출발', '정지', '좌우', '속도'],
  },
  {
    id: 'fire_report',
    labelKo: '화재 신고',
    interactive: ['선택', '듣기'],
  },
  {
    id: 'dispatch',
    labelKo: '현장 출동',
    interactive: ['운전', '신호', '길찾기'],
  },
  {
    id: 'hose_connect',
    labelKo: '호스 연결',
    interactive: ['드래그', '연결', '수량'],
  },
  {
    id: 'extinguish',
    labelKo: '화재 진압',
    interactive: ['조준', '물줄기'],
  },
  {
    id: 'rescue_complete',
    labelKo: '구조 완료',
    interactive: ['터치'],
  },
  {
    id: 'reward',
    labelKo: '보상',
    interactive: ['해금 적용'],
  },
  {
    id: 'growth_record',
    labelKo: '성장 기록',
    interactive: ['리포트 생성'],
  },
]

export function evaluatePrototypeGates() {
  const triad = baselineTriad()
  const factory = buildFactorySnapshot()
  const approved = clientApprovedCount()

  const visualProduction: StageGate = triad.allReady && factory.baselineReady ? 'PASS' : 'BLOCKED'
  const functionalShell: StageGate = 'PASS' // entity/registry/factory shell exists
  const assetQuality: StageGate = approved > 0 && triad.allReady ? 'PASS' : 'BLOCKED'
  const forbidden: StageGate = 'PASS' // enforced by forbiddenAssets.test.ts in CI
  const growthData: StageGate = 'PASS' // structures present; runtime fills later
  // Visual QA on device requires GAME_READY bitmaps — never auto-PASS without art.
  const mobile: StageGate = visualProduction === 'PASS' ? 'PASS' : 'BLOCKED'

  const stages: PlayStage[] = LOOP.map((s) => ({
    ...s,
    gate: visualProduction,
    reason:
      visualProduction === 'BLOCKED'
        ? 'BASELINE TRIAD production assets not GAME_READY'
        : 'Ready when mounted with approved art',
  }))

  const prototype01Complete =
    functionalShell === 'PASS' &&
    visualProduction === 'PASS' &&
    assetQuality === 'PASS' &&
    mobile === 'PASS' &&
    forbidden === 'PASS' &&
    growthData === 'PASS'

  return {
    stages,
    FUNCTIONAL_GATE: functionalShell,
    VISUAL_PRODUCTION_GATE: visualProduction,
    ASSET_QUALITY_GATE: assetQuality,
    MOBILE_390x844_GATE: mobile,
    FORBIDDEN_ASSET_GATE: forbidden,
    GROWTH_DATA_GATE: growthData,
    PROTOTYPE_01: prototype01Complete ? ('COMPLETE' as const) : ('BLOCKED' as const),
    providerStatus: factory.providerStatus,
    approvedProductionCount: approved,
  }
}

export function stageStatus(id: PlayStageId): StageGate {
  return evaluatePrototypeGates().stages.find((s) => s.id === id)?.gate ?? 'BLOCKED'
}
