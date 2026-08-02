export interface DescriptiveStats {
  n: number
  sum: number
  mean: number
  median: number
  mode: number[] | null
  min: number
  max: number
  range: number
  variance: number
  stdev: number
  popStdev: number
  q1: number
  q3: number
  iqr: number
  p90: number
  p95: number
  skewness: number | null
  outliers: number[]
  ci95Low: number
  ci95High: number
}

export interface RegressionResult {
  slope: number
  intercept: number
  r2: number
  predict: (x: number) => number
}

function sorted(values: number[]): number[] {
  return [...values].sort((a, b) => a - b)
}

export function parseNumbers(text: string): number[] {
  const cleaned = text
    .replace(/[−–]/g, '-')
    .replace(/,/g, ' ')
    .replace(/[%％]/g, '')
  const matches = cleaned.match(/-?\d+(?:\.\d+)?/g)
  if (!matches) return []
  return matches.map((m) => parseFloat(m)).filter((n) => Number.isFinite(n))
}

export function mean(values: number[]): number {
  if (!values.length) return NaN
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function median(values: number[]): number {
  if (!values.length) return NaN
  const s = sorted(values)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export function quantile(values: number[], q: number): number {
  if (!values.length) return NaN
  const s = sorted(values)
  if (s.length === 1) return s[0]
  const pos = (s.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  const next = s[Math.min(base + 1, s.length - 1)]
  return s[base] + rest * (next - s[base])
}

export function mode(values: number[]): number[] | null {
  if (!values.length) return null
  const freq = new Map<number, number>()
  for (const v of values) freq.set(v, (freq.get(v) || 0) + 1)
  let best = 0
  for (const c of freq.values()) best = Math.max(best, c)
  if (best <= 1) return null
  return [...freq.entries()].filter(([, c]) => c === best).map(([v]) => v)
}

export function varianceSample(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  return values.reduce((a, b) => a + (b - m) ** 2, 0) / (values.length - 1)
}

export function variancePop(values: number[]): number {
  if (!values.length) return 0
  const m = mean(values)
  return values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length
}

export function stdev(values: number[]): number {
  return Math.sqrt(varianceSample(values))
}

/** Pearson correlation. */
export function correlation(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 2) return null
  const x = xs.slice(0, n)
  const y = ys.slice(0, n)
  const mx = mean(x)
  const my = mean(y)
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx
    const b = y[i] - my
    num += a * b
    dx += a * a
    dy += b * b
  }
  if (dx === 0 || dy === 0) return null
  return num / Math.sqrt(dx * dy)
}

export function linearRegression(xs: number[], ys: number[]): RegressionResult | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 2) return null
  const x = xs.slice(0, n)
  const y = ys.slice(0, n)
  const mx = mean(x)
  const my = mean(y)
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my)
    den += (x[i] - mx) ** 2
  }
  if (den === 0) return null
  const slope = num / den
  const intercept = my - slope * mx
  const preds = x.map((xi) => slope * xi + intercept)
  const ssTot = y.reduce((a, yi) => a + (yi - my) ** 2, 0)
  const ssRes = y.reduce((a, yi, i) => a + (yi - preds[i]) ** 2, 0)
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot
  return {
    slope,
    intercept,
    r2,
    predict: (xv: number) => slope * xv + intercept,
  }
}

export function movingAverage(values: number[], window: number): number[] {
  const w = Math.max(1, Math.floor(window))
  const out: number[] = []
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - w + 1)
    out.push(mean(values.slice(start, i + 1)))
  }
  return out
}

export function winRate(values: number[]): number {
  if (!values.length) return NaN
  return values.filter((v) => v > 0).length / values.length
}

/** Approximate P(Z <= z) for standard normal (Abramowitz & Stegun). */
export function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp((-z * z) / 2)
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return z > 0 ? 1 - p : p
}

export function normalProbAbove(values: number[], threshold: number): number | null {
  if (values.length < 2) return null
  const m = mean(values)
  const s = stdev(values)
  if (s === 0) return threshold <= m ? 1 : 0
  const z = (threshold - m) / s
  return 1 - normCdf(z)
}

export function normalProbBetween(values: number[], low: number, high: number): number | null {
  if (values.length < 2) return null
  const m = mean(values)
  const s = stdev(values)
  if (s === 0) return low <= m && m <= high ? 1 : 0
  return normCdf((high - m) / s) - normCdf((low - m) / s)
}

export function skewness(values: number[]): number | null {
  if (values.length < 3) return null
  const m = mean(values)
  const s = stdev(values)
  if (s === 0) return 0
  const n = values.length
  const m3 = values.reduce((a, v) => a + ((v - m) / s) ** 3, 0) / n
  return m3
}

export function describe(values: number[]): DescriptiveStats | null {
  if (!values.length) return null
  const n = values.length
  const s = sorted(values)
  const m = mean(values)
  const v = varianceSample(values)
  const sd = Math.sqrt(v)
  const popSd = Math.sqrt(variancePop(values))
  const q1 = quantile(values, 0.25)
  const q3 = quantile(values, 0.75)
  const iqr = q3 - q1
  const lo = q1 - 1.5 * iqr
  const hi = q3 + 1.5 * iqr
  const outliers = values.filter((x) => x < lo || x > hi)
  const se = n > 1 ? sd / Math.sqrt(n) : 0
  return {
    n,
    sum: values.reduce((a, b) => a + b, 0),
    mean: m,
    median: median(values),
    mode: mode(values),
    min: s[0],
    max: s[s.length - 1],
    range: s[s.length - 1] - s[0],
    variance: v,
    stdev: sd,
    popStdev: popSd,
    q1,
    q3,
    iqr,
    p90: quantile(values, 0.9),
    p95: quantile(values, 0.95),
    skewness: skewness(values),
    outliers,
    ci95Low: m - 1.96 * se,
    ci95High: m + 1.96 * se,
  }
}

function fmt(n: number, digits = 4): string {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1000) return n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
  if (abs >= 1) return n.toLocaleString('ko-KR', { maximumFractionDigits: Math.min(digits, 4) })
  return n.toLocaleString('ko-KR', { maximumFractionDigits: digits })
}

function pct(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return `${(n * 100).toFixed(1)}%`
}

export function formatDescriptive(name: string, values: number[]): string {
  const d = describe(values)
  if (!d) return `"${name}" 데이터가 비어 있습니다. 숫자를 먼저 넣어 주세요.`
  const lines = [
    `【통계 분석】 ${name}`,
    `표본 수 n=${d.n}`,
    `합계 ${fmt(d.sum)} · 평균 ${fmt(d.mean)} · 중앙값 ${fmt(d.median)}`,
    d.mode ? `최빈값 ${d.mode.map((v) => fmt(v)).join(', ')}` : '최빈값 없음(모두 1회)',
    `최소 ${fmt(d.min)} · 최대 ${fmt(d.max)} · 범위 ${fmt(d.range)}`,
    `분산 ${fmt(d.variance)} · 표준편차(표본) ${fmt(d.stdev)}`,
    `Q1 ${fmt(d.q1)} · Q3 ${fmt(d.q3)} · IQR ${fmt(d.iqr)}`,
    `P90 ${fmt(d.p90)} · P95 ${fmt(d.p95)}`,
    `평균 95% CI [${fmt(d.ci95Low)}, ${fmt(d.ci95High)}]`,
  ]
  if (d.skewness != null) lines.push(`왜도(근사) ${fmt(d.skewness, 3)}`)
  if (d.outliers.length) {
    lines.push(`이상치(IQR×1.5) ${d.outliers.slice(0, 8).map((v) => fmt(v)).join(', ')}${d.outliers.length > 8 ? '…' : ''}`)
  } else {
    lines.push('이상치 없음(IQR 기준)')
  }
  const wr = winRate(values)
  if (values.some((v) => v < 0) || values.some((v) => v > 0)) {
    lines.push(`양수 비율(승률 개념) ${pct(wr)}`)
  }
  const ma5 = movingAverage(values, Math.min(5, values.length))
  lines.push(`최근 이동평균(${Math.min(5, values.length)}) ${fmt(ma5[ma5.length - 1])}`)
  lines.push('해석은 참고용이며, 표본·분포 가정에 따라 달라질 수 있습니다.')
  return lines.join('\n')
}

export function formatProbabilityAnswer(name: string, values: number[], threshold: number, mode: 'above' | 'below'): string {
  const d = describe(values)
  if (!d || d.n < 2) return '확률 계산에는 최소 2개 이상의 데이터가 필요합니다.'
  const pAbove = normalProbAbove(values, threshold)
  if (pAbove == null) return '확률을 계산할 수 없습니다.'
  const p = mode === 'above' ? pAbove : 1 - pAbove
  return [
    `【확률 추정】 ${name}`,
    `정규분포 가정 · μ=${fmt(d.mean)}, σ=${fmt(d.stdev)}`,
    mode === 'above'
      ? `P(X ≥ ${fmt(threshold)}) ≈ ${pct(p)}`
      : `P(X ≤ ${fmt(threshold)}) ≈ ${pct(p)}`,
    `참고: 실제 분포가 정규가 아니면 오차가 큽니다.`,
  ].join('\n')
}

export function formatRegression(nameX: string, xs: number[], nameY: string, ys: number[]): string {
  const reg = linearRegression(xs, ys)
  const r = correlation(xs, ys)
  if (!reg || r == null) return '회귀/상관 계산에는 각 데이터셋에 최소 2개 값이 필요합니다.'
  return [
    `【회귀·상관】 ${nameY} ~ ${nameX}`,
    `표본 쌍 n=${Math.min(xs.length, ys.length)}`,
    `상관계수 r=${fmt(r, 4)}`,
    `회귀식: ${nameY} = ${fmt(reg.slope)} × ${nameX} + ${fmt(reg.intercept)}`,
    `결정계수 R²=${fmt(reg.r2, 4)}`,
    `예: ${nameX}=1 → ${nameY}≈${fmt(reg.predict(1))}`,
    '인과관계가 아닌 상관/선형 적합입니다.',
  ].join('\n')
}

export function answerStatQuestion(name: string, values: number[], question: string): string | null {
  const d = describe(values)
  if (!d) return `"${name}" 데이터가 없습니다.`
  const q = question.toLowerCase()

  if (/평균|mean|기대/.test(q)) return `${name} 평균 = ${fmt(d.mean)} (n=${d.n})`
  if (/중앙|median/.test(q)) return `${name} 중앙값 = ${fmt(d.median)}`
  if (/표준\s*편차|stdev|volatility|변동성/.test(q)) return `${name} 표준편차 = ${fmt(d.stdev)} (표본)`
  if (/분산|variance/.test(q)) return `${name} 분산 = ${fmt(d.variance)}`
  if (/최대|max|최고/.test(q)) return `${name} 최대 = ${fmt(d.max)}`
  if (/최소|min|최저/.test(q)) return `${name} 최소 = ${fmt(d.min)}`
  if (/합계|총합|sum/.test(q)) return `${name} 합계 = ${fmt(d.sum)}`
  if (/개수|표본|몇\s*개|n\b/.test(q)) return `${name} 표본 수 n = ${d.n}`
  if (/승률|양수\s*비율|히트/.test(q)) return `${name} 양수 비율 = ${pct(winRate(values))}`
  if (/사분위|iqr|q1|q3/.test(q)) return `${name} Q1=${fmt(d.q1)}, Q3=${fmt(d.q3)}, IQR=${fmt(d.iqr)}`
  if (/신뢰|ci|구간/.test(q)) return `${name} 평균 95% CI [${fmt(d.ci95Low)}, ${fmt(d.ci95High)}]`
  if (/이상치|outlier/.test(q)) {
    return d.outliers.length
      ? `${name} 이상치: ${d.outliers.map((v) => fmt(v)).join(', ')}`
      : `${name} 이상치 없음`
  }
  if (/요약|통계|분석|리포트|전체/.test(q)) return formatDescriptive(name, values)
  return null
}
