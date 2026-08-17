import type { LottoDraw } from '../domain/types'
import { validateDraw } from '../domain/validate'

/** Compact row: [round, date, n1..n6, bonus] */
export type CompactRow = [
  number,
  string,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

export interface BundledDataset {
  source: string
  updated: string
  count: number
  draws: CompactRow[]
}

export interface LottoDataProvider {
  getDraw(drawNumber: number): Promise<LottoDraw>
  getLatestDraw(): Promise<LottoDraw>
  getDrawRange(from: number, to: number): Promise<LottoDraw[]>
  getAllDraws(): Promise<LottoDraw[]>
  getDatasetVersion(): string
}

function rowToDraw(row: CompactRow, source: string, fetchedAt: string): LottoDraw {
  return validateDraw({
    drawNumber: row[0],
    drawDate: row[1],
    numbers: [row[2], row[3], row[4], row[5], row[6], row[7]],
    bonusNumber: row[8],
    source,
    fetchedAt,
  })
}

export class BundledLottoProvider implements LottoDataProvider {
  private draws: LottoDraw[] = []
  private byNumber = new Map<number, LottoDraw>()
  private version = ''
  private ready = false
  private readonly raw: BundledDataset

  constructor(raw: BundledDataset) {
    this.raw = raw
  }

  private ensure(): void {
    if (this.ready) return
    const fetchedAt = new Date().toISOString()
    const list: LottoDraw[] = []
    for (const row of this.raw.draws) {
      try {
        list.push(rowToDraw(row, this.raw.source || 'bundled', fetchedAt))
      } catch {
        // skip invalid rows — never invent replacements
      }
    }
    list.sort((a, b) => a.drawNumber - b.drawNumber)
    this.draws = list
    this.byNumber = new Map(list.map((d) => [d.drawNumber, d]))
    this.version = `${this.raw.updated}|${list.length}|${list.at(-1)?.drawNumber ?? 0}`
    this.ready = true
  }

  getDatasetVersion(): string {
    this.ensure()
    return this.version
  }

  async getAllDraws(): Promise<LottoDraw[]> {
    this.ensure()
    return [...this.draws]
  }

  async getLatestDraw(): Promise<LottoDraw> {
    this.ensure()
    const d = this.draws.at(-1)
    if (!d) throw new Error('분석에 필요한 데이터가 없습니다.')
    return d
  }

  async getDraw(drawNumber: number): Promise<LottoDraw> {
    this.ensure()
    const d = this.byNumber.get(drawNumber)
    if (!d) throw new Error(`회차 데이터를 찾을 수 없습니다: ${drawNumber}`)
    return d
  }

  async getDrawRange(from: number, to: number): Promise<LottoDraw[]> {
    this.ensure()
    return this.draws.filter((d) => d.drawNumber >= from && d.drawNumber <= to)
  }
}

/** Draws strictly before asOf (look-ahead safe). */
export function drawsBefore(
  all: LottoDraw[],
  asOfDrawNumber?: number,
): LottoDraw[] {
  if (asOfDrawNumber == null) return all
  return all.filter((d) => d.drawNumber < asOfDrawNumber)
}

const cache = new Map<string, unknown>()

export function cached<T>(key: string, fn: () => T): T {
  if (cache.has(key)) return cache.get(key) as T
  const v = fn()
  cache.set(key, v)
  return v
}

export function clearAnalysisCache(): void {
  cache.clear()
}
