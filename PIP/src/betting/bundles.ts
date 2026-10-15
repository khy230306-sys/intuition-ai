import type { ExtraMode, PrimaryMode } from '../game/types'

export type BundlePick = {
  mode: PrimaryMode | ExtraMode
  choice: string
}

export type BundleCategory = 'duel' | 'total' | 'cross' | 'extra'

export type BundleDef = {
  id: string
  category: BundleCategory
  label: string
  picks: BundlePick[]
}

export const BUNDLE_CATALOG: BundleDef[] = [
  // 카드 비교 묶음
  {
    id: 'duel-down-same',
    category: 'duel',
    label: '하 + 무',
    picks: [
      { mode: 'CARD_DUEL', choice: 'DOWN' },
      { mode: 'CARD_DUEL', choice: 'SAME' },
    ],
  },
  {
    id: 'duel-same-up',
    category: 'duel',
    label: '무 + 상',
    picks: [
      { mode: 'CARD_DUEL', choice: 'SAME' },
      { mode: 'CARD_DUEL', choice: 'UP' },
    ],
  },
  {
    id: 'duel-down-up',
    category: 'duel',
    label: '하 + 상',
    picks: [
      { mode: 'CARD_DUEL', choice: 'DOWN' },
      { mode: 'CARD_DUEL', choice: 'UP' },
    ],
  },
  // 합계 묶음
  {
    id: 'total-low-center',
    category: 'total',
    label: '낮음 + 중앙',
    picks: [
      { mode: 'TOTAL', choice: 'LOW' },
      { mode: 'TOTAL', choice: 'CENTER' },
    ],
  },
  {
    id: 'total-center-high',
    category: 'total',
    label: '중앙 + 높음',
    picks: [
      { mode: 'TOTAL', choice: 'CENTER' },
      { mode: 'TOTAL', choice: 'HIGH' },
    ],
  },
  {
    id: 'total-low-high',
    category: 'total',
    label: '낮음 + 높음',
    picks: [
      { mode: 'TOTAL', choice: 'LOW' },
      { mode: 'TOTAL', choice: 'HIGH' },
    ],
  },
  // 교차 묶음
  ...(['UP', 'SAME', 'DOWN'] as const).flatMap((duel) =>
    (['HIGH', 'CENTER', 'LOW'] as const).map((total) => ({
      id: `cross-${duel}-${total}`.toLowerCase(),
      category: 'cross' as const,
      label: `${
        duel === 'UP' ? '상' : duel === 'SAME' ? '무' : '하'
      } + ${total === 'HIGH' ? '높음' : total === 'CENTER' ? '중앙' : '낮음'}`,
      picks: [
        { mode: 'CARD_DUEL' as const, choice: duel },
        { mode: 'TOTAL' as const, choice: total },
      ],
    })),
  ),
  // 추가 묶음
  {
    id: 'extra-odd-up',
    category: 'extra',
    label: '홀 + 상',
    picks: [
      { mode: 'ODD_EVEN', choice: 'ODD' },
      { mode: 'CARD_DUEL', choice: 'UP' },
    ],
  },
  {
    id: 'extra-even-up',
    category: 'extra',
    label: '짝 + 상',
    picks: [
      { mode: 'ODD_EVEN', choice: 'EVEN' },
      { mode: 'CARD_DUEL', choice: 'UP' },
    ],
  },
  {
    id: 'extra-odd-down',
    category: 'extra',
    label: '홀 + 하',
    picks: [
      { mode: 'ODD_EVEN', choice: 'ODD' },
      { mode: 'CARD_DUEL', choice: 'DOWN' },
    ],
  },
  {
    id: 'extra-even-down',
    category: 'extra',
    label: '짝 + 하',
    picks: [
      { mode: 'ODD_EVEN', choice: 'EVEN' },
      { mode: 'CARD_DUEL', choice: 'DOWN' },
    ],
  },
]

export const BUNDLE_CATEGORY_LABEL: Record<BundleCategory, string> = {
  duel: '카드 비교 묶음',
  total: '합계 묶음',
  cross: '교차 묶음',
  extra: '추가 묶음',
}

export function getBundleById(id: string): BundleDef | undefined {
  return BUNDLE_CATALOG.find((bundle) => bundle.id === id)
}
