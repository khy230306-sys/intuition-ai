import type { LottoDraw, NumberRankingRow } from '../domain/types'
import type { BacktestReport } from '../backtest/backtest'
import type { CouncilEntry } from '../council/council'
import { councilSummary } from '../council/council'

export interface DrawReportInput {
  drawNumber: number
  analyzedAt: string
  rankings: NumberRankingRow[]
  council: CouncilEntry[]
  backtest?: BacktestReport
  generatedGames?: number[][]
}

export interface DrawReport {
  title: string
  sections: { heading: string; lines: string[] }[]
  textSummary: string
}

export function buildDrawReport(input: DrawReportInput): DrawReport {
  const top = input.rankings.slice(0, 10)
  const summary = councilSummary(input.council)
  const strong = input.council
    .filter((c) => c.consensus === 'strong_for')
    .sort((a, b) => b.supportScore - a.supportScore)
    .slice(0, 6)
  const split = input.council
    .map((c) => {
      const vals = Object.values(c.votes)
      const uniq = new Set(vals).size
      return { number: c.number, uniq, supportScore: c.supportScore }
    })
    .filter((x) => x.uniq >= 4)
    .sort((a, b) => b.uniq - a.uniq)
    .slice(0, 6)

  const sections: DrawReport['sections'] = [
    {
      heading: '분석 점수 상위 번호',
      lines: top.map(
        (r) =>
          `${r.rank}위 ${r.number}번 · 점수 ${r.score.toFixed(1)} · ${r.grade} · ${r.temperature}`,
      ),
    },
    {
      heading: '엔진 강한 합의',
      lines: strong.length
        ? strong.map((c) => `${c.number}번 (지지 ${c.supportScore.toFixed(0)})`)
        : ['해당 없음'],
    },
    {
      heading: '의견 분열',
      lines: split.length
        ? split.map((s) => `${s.number}번 (의견 종류 ${s.uniq})`)
        : ['뚜렷한 분열 없음'],
    },
    {
      heading: 'Council 요약',
      lines: Object.entries(summary).map(([k, v]) => `${k}: ${v}`),
    },
  ]

  if (input.generatedGames?.length) {
    sections.push({
      heading: '생성 조합',
      lines: input.generatedGames.map(
        (g, i) => `G${i + 1}: ${g.slice().sort((a, b) => a - b).join('-')}`,
      ),
    })
  }

  if (input.backtest) {
    const b = input.backtest
    sections.push({
      heading: 'Random Baseline 비교',
      lines: [
        `전략 ${b.strategyMode} 평균 일치 ${b.averageMatches.toFixed(3)}`,
        `RANDOM 평균 일치 ${b.randomAverageMatches.toFixed(3)}`,
        `차이 ${b.delta >= 0 ? '+' : ''}${b.delta.toFixed(3)} (표본 ${b.drawCount}회)`,
        `95% 근사 CI [${b.confidenceInterval.low.toFixed(3)}, ${b.confidenceInterval.high.toFixed(3)}]`,
        '차이는 통계 비교이며 미래 당첨을 보장하지 않습니다.',
      ],
    })
  }

  const title = `제 ${input.drawNumber}회 LottoLens 분석`
  const textSummary = [
    title,
    `분석 시각: ${input.analyzedAt}`,
    ...sections.flatMap((s) => [`## ${s.heading}`, ...s.lines]),
    '',
    'LottoLens의 분석 결과는 과거 데이터 기반 통계 정보이며 미래 당첨을 보장하거나 예측하지 않습니다.',
  ].join('\n')

  return { title, sections, textSummary }
}

export function formatBacktestHuman(report: BacktestReport): string {
  const h = report.matchHistogram
  return [
    `전략: ${report.strategyMode}`,
    `기간: ${report.fromDraw}–${report.toDraw} (${report.drawCount}회)`,
    `게임/회: ${report.gamesPerDraw}`,
    `평균 일치: ${report.averageMatches.toFixed(3)}`,
    `RANDOM 평균: ${report.randomAverageMatches.toFixed(3)}`,
    `차이: ${report.delta >= 0 ? '+' : ''}${report.delta.toFixed(3)}`,
    `히스토그램 0–6: ${[0, 1, 2, 3, 4, 5, 6].map((i) => h[i] ?? 0).join('/')}`,
    `best match: ${report.bestMatch}`,
    `CI: [${report.confidenceInterval.low.toFixed(3)}, ${report.confidenceInterval.high.toFixed(3)}]`,
  ].join('\n')
}

export function emptyDataMessage(hasCache: boolean): string {
  return hasCache
    ? '최신 로또 데이터를 불러오지 못했습니다. 저장된 데이터로 분석합니다.'
    : '분석에 필요한 데이터가 없습니다.'
}

/** Structural snapshot for a draw — used in reports, not prediction. */
export function describeDrawStructure(draw: LottoDraw): string {
  const nums = [...draw.numbers].sort((a, b) => a - b)
  const odd = nums.filter((n) => n % 2 === 1).length
  const sum = nums.reduce((a, b) => a + b, 0)
  return `${draw.drawNumber}회 ${nums.join('-')}+${draw.bonusNumber} · 홀짝 ${odd}:${6 - odd} · 합 ${sum}`
}
