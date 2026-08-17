import type { LottoDraw } from '../../src/lotto/domain/types'

/** Synthetic draws for unit tests only — not used in production UI */
export const GOLDEN_DRAWS: LottoDraw[] = [
  {
    drawNumber: 1,
    drawDate: '2020-01-01',
    numbers: [1, 2, 3, 4, 5, 6],
    bonusNumber: 7,
    source: 'golden-test',
    fetchedAt: '2020-01-01T00:00:00.000Z',
  },
  {
    drawNumber: 2,
    drawDate: '2020-01-08',
    numbers: [7, 14, 21, 28, 35, 42],
    bonusNumber: 10,
    source: 'golden-test',
    fetchedAt: '2020-01-08T00:00:00.000Z',
  },
  {
    drawNumber: 3,
    drawDate: '2020-01-15',
    numbers: [3, 9, 15, 22, 33, 44],
    bonusNumber: 1,
    source: 'golden-test',
    fetchedAt: '2020-01-15T00:00:00.000Z',
  },
  {
    drawNumber: 4,
    drawDate: '2020-01-22',
    numbers: [5, 11, 17, 23, 29, 41],
    bonusNumber: 8,
    source: 'golden-test',
    fetchedAt: '2020-01-22T00:00:00.000Z',
  },
  {
    drawNumber: 5,
    drawDate: '2020-01-29',
    numbers: [6, 12, 18, 24, 30, 36],
    bonusNumber: 45,
    source: 'golden-test',
    fetchedAt: '2020-01-29T00:00:00.000Z',
  },
  {
    drawNumber: 6,
    drawDate: '2020-02-05',
    numbers: [2, 8, 16, 25, 31, 40],
    bonusNumber: 19,
    source: 'golden-test',
    fetchedAt: '2020-02-05T00:00:00.000Z',
  },
  {
    drawNumber: 7,
    drawDate: '2020-02-12',
    numbers: [4, 10, 20, 26, 32, 38],
    bonusNumber: 13,
    source: 'golden-test',
    fetchedAt: '2020-02-12T00:00:00.000Z',
  },
  {
    drawNumber: 8,
    drawDate: '2020-02-19',
    numbers: [1, 13, 19, 27, 34, 43],
    bonusNumber: 5,
    source: 'golden-test',
    fetchedAt: '2020-02-19T00:00:00.000Z',
  },
]

export const GOLDEN_DATASET_VERSION = 'golden-test|8|8'
