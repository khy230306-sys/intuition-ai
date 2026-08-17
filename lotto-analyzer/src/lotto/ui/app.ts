import bundled from '../../data/draws.json'
import { ALL_ENGINES, ENGINE_BY_ID, masterEngine } from '../engines'
import { BundledLottoProvider } from '../data/provider'
import type { BundledDataset } from '../data/provider'
import { buildNumberRankings } from '../ranking/ranking'
import { generateCombinations } from '../generator/generator'
import { runBacktest, walkForward } from '../backtest/backtest'
import { computeNumberStatistics } from '../features/numberStats'
import { findSimilarDraws } from '../similarity/similarity'
import {
  createStrategy,
  listPresets,
  normalizeWeights,
  defaultWeights,
} from '../strategy/strategy'
import { proposeWeightEvolution } from '../strategy/evolution'
import {
  listTickets,
  saveTicket,
  deleteTicket,
  getConstraints,
  saveConstraints,
  savePredictionSnapshot,
  exportStore,
  listStrategies,
  saveStrategy,
  deleteStrategy,
  listFavorites,
  saveFavorite,
  type UserConstraints,
} from '../persistence/store'
import type {
  Combination,
  GeneratorMode,
  LottoDraw,
  NumberRankingRow,
  UserTicket,
} from '../domain/types'
import { validateCombination } from '../domain/validate'
import { ballColor } from '../../lib/stats'
import { buildCouncil } from '../council/council'
import { buildDrawReport, formatBacktestHuman } from '../reports/report'
import {
  parseNaturalLanguageConstraints,
  mergeParsedConstraints,
} from '../generator/nlConstraints'
import { analyzeUserBias } from '../performance/userBias'
import { buildNetworkGraph, renderRelationSvg } from '../engines/network/graph'
import { mapWithYield } from '../workers/scheduler'
import { MAX_N } from '../domain/types'

export type Screen =
  | 'home'
  | 'lab'
  | 'numbers'
  | 'detail'
  | 'generator'
  | 'backtest'
  | 'mylotto'
  | 'research'
  | 'legacy'

const provider = new BundledLottoProvider(bundled as BundledDataset)

interface AppModel {
  screen: Screen
  detailNumber: number
  draws: LottoDraw[]
  datasetVersion: string
  latest: LottoDraw | null
  rankings: NumberRankingRow[]
  engineScores: Record<string, Record<number, number>>
  analyzing: boolean
  analyzeError: string | null
  analyzedAt: string | null
  genMode: GeneratorMode
  gameCount: number
  combos: Combination[]
  prefs: UserConstraints
  tickets: UserTicket[]
  backtestText: string
  selectedFilter: 'ALL' | 'HOT' | 'COLD' | 'FROZEN'
  disclaimer: string
  reportText: string
  relationTopK: 5 | 10 | 20 | 45
  relationFocus: number
  strategyDraft: Record<string, number>
  progressText: string
}

const DISCLAIMER =
  'LottoLens의 분석 결과는 과거 데이터 기반 통계 정보이며 미래 당첨을 보장하거나 예측하지 않습니다.'

let model: AppModel = {
  screen: 'home',
  detailNumber: 1,
  draws: [],
  datasetVersion: '',
  latest: null,
  rankings: [],
  engineScores: {},
  analyzing: false,
  analyzeError: null,
  analyzedAt: null,
  genMode: 'MASTER',
  gameCount: 5,
  combos: [],
  prefs: getConstraints(),
  tickets: listTickets(),
  backtestText: '',
  selectedFilter: 'ALL',
  disclaimer: DISCLAIMER,
  reportText: '',
  relationTopK: 10,
  relationFocus: 7,
  strategyDraft: defaultWeights('MASTER'),
  progressText: '',
}

let root: HTMLElement
let shellBound = false

export function mountApp(el: HTMLElement): void {
  root = el
  if (!shellBound) {
    shellBound = true
    root.addEventListener('click', onRootClick)
    root.addEventListener('change', onRootChange)
    root.addEventListener('input', onRootInput)
  }
  void boot()
}

async function boot(): Promise<void> {
  try {
    const draws = await provider.getAllDraws()
    if (!draws.length) {
      model.analyzeError = '분석에 필요한 데이터가 없습니다.'
      paint()
      return
    }
    model.draws = draws
    model.datasetVersion = provider.getDatasetVersion()
    model.latest = await provider.getLatestDraw()
    paint()
    await runAnalysis()
  } catch (e) {
    model.analyzeError =
      e instanceof Error ? e.message : '최신 로또 데이터를 불러오지 못했습니다.'
    paint()
  }
}

async function runAnalysis(): Promise<void> {
  if (!model.draws.length) return
  model.analyzing = true
  model.analyzeError = null
  paint()
  try {
    const ctx = {
      draws: model.draws,
      datasetVersion: model.datasetVersion,
      seed: 42,
    }
    const engines = ALL_ENGINES.filter((e) => e.id !== 'master' && e.id !== 'monte')
    const results = await mapWithYield(engines, async (eng) => eng.analyze(ctx), (done, total) => {
      model.progressText = `엔진 분석 ${done}/${total}`
      if (done === total || done % 3 === 0) paint()
    })
    const monte = ENGINE_BY_ID['monte']
    if (monte) results.push(await monte.analyze({ ...ctx, seed: 7 }))
    const master = await masterEngine.analyze({
      ...ctx,
      master: { precomputed: results },
    } as typeof ctx & { master: { precomputed: typeof results } })

    const map: Record<string, Record<number, number>> = {}
    for (const r of results) map[r.engineId] = r.numberScores
    map.master = master.numberScores
    model.engineScores = map

    const stats = computeNumberStatistics(model.draws)
    model.rankings = buildNumberRankings([...results, master], stats)
    model.analyzedAt = new Date().toISOString()
    model.progressText = ''

    const council = buildCouncil([...results, master])
    if (model.latest) {
      savePredictionSnapshot({
        drawNumber: model.latest.drawNumber,
        engine: 'master',
        engineVersion: master.engineVersion,
        candidateNumbers: master.rankedNumbers.slice(0, 15),
        rankedNumbers: master.rankedNumbers,
        generatedGames: [],
        scores: master.numberScores,
        createdAt: model.analyzedAt,
        datasetVersion: model.datasetVersion,
      })
      const report = buildDrawReport({
        drawNumber: model.latest.drawNumber,
        analyzedAt: model.analyzedAt,
        rankings: model.rankings,
        council,
      })
      model.reportText = report.textSummary
    }
  } catch (e) {
    model.analyzeError =
      e instanceof Error ? e.message : '분석 중 오류가 발생했습니다.'
  } finally {
    model.analyzing = false
    paint()
  }
}

function paint(): void {
  root.innerHTML = shell()
}

function shell(): string {
  const primary: { id: Screen; label: string }[] = [
    { id: 'home', label: 'HOME' },
    { id: 'lab', label: 'AI LAB' },
    { id: 'numbers', label: '번호' },
    { id: 'generator', label: '생성' },
    { id: 'mylotto', label: 'MY' },
  ]
  const moreActive =
    model.screen === 'backtest' ||
    model.screen === 'research' ||
    model.screen === 'legacy' ||
    model.screen === 'detail'
  return `
  <div class="v3-app">
    <header class="v3-top">
      <div class="brand-mark">
        <span class="aizio">AIZIO</span>
        <span class="product">로또렌즈 3.0</span>
      </div>
      <div class="nav-meta">${model.latest ? `${model.latest.drawNumber}회 · ${model.draws.length}회차` : '데이터 없음'}</div>
    </header>
    <main class="v3-main wrap" id="v3-main">${screenBody()}</main>
    <p class="v3-disclaimer wrap">${model.disclaimer}</p>
    <nav class="v3-tabbar" aria-label="주요 메뉴">
      ${primary
        .map(
          (n) =>
            `<button type="button" class="v3-tab ${model.screen === n.id ? 'on' : ''}" data-nav="${n.id}">${n.label}</button>`,
        )
        .join('')}
      <button type="button" class="v3-tab ${moreActive ? 'on' : ''}" data-nav="research" aria-label="연구 및 더보기">더보기</button>
    </nav>
  </div>`
}

function screenBody(): string {
  if (model.analyzeError && !model.draws.length) {
    return `<section class="v3-card"><h2>데이터 없음</h2><p>${model.analyzeError}</p></section>`
  }
  switch (model.screen) {
    case 'home':
      return homeScreen()
    case 'lab':
      return labScreen()
    case 'numbers':
      return numbersScreen()
    case 'detail':
      return detailScreen()
    case 'generator':
      return generatorScreen()
    case 'backtest':
      return backtestScreen()
    case 'mylotto':
      return myLottoScreen()
    case 'research':
      return researchScreen()
    case 'legacy':
      return `<section class="v3-card"><h2>클래식 뷰</h2><p>기존 단일 페이지 통계 화면을 엽니다.</p><button type="button" class="btn btn-primary" id="open-legacy">클래식 열기</button></section>`
    default:
      return homeScreen()
  }
}

function ball(n: number, size: 'sm' | 'lg' | '' = ''): string {
  return `<span class="ball ${ballColor(n)} ${size}">${n}</span>`
}

function homeScreen(): string {
  const top = model.rankings.slice(0, 10)
  const strong = model.rankings
    .filter((r) => r.engineConsensus === 'strong_for')
    .slice(0, 6)
  return `
  <section class="v3-hero-card">
    <p class="aizio-logo">AIZIO</p>
    <h1 class="brand-hero" style="font-size:clamp(2.2rem,10vw,3.5rem)">로또렌즈</h1>
    <p>제 ${model.latest?.drawNumber ?? '—'}회 Intelligence Engine</p>
    <p class="nav-meta">${model.analyzing ? model.progressText || '분석 중…' : model.analyzedAt ? `분석 완료 ${model.analyzedAt.slice(11, 19)}` : '대기'}</p>
    ${model.analyzeError ? `<p class="v3-error">${model.analyzeError}</p>` : ''}
  </section>
  <section class="v3-card">
    <h2>MASTER TOP</h2>
    <p class="strategy-blurb">분석 점수 상위 번호 (당첨 예측이 아닙니다)</p>
    <div class="chip-list">${top.map((r) => ball(r.number)).join('')}</div>
  </section>
  <section class="v3-card">
    <h2>강한 합의</h2>
    <div class="chip-list">${strong.length ? strong.map((r) => ball(r.number)).join('') : '<span class="nav-meta">해당 없음</span>'}</div>
  </section>
  <div class="cta-row">
    <button type="button" class="btn btn-primary" data-nav="generator">조합 생성</button>
    <button type="button" class="btn btn-ghost" data-nav="mylotto">MY LOTTO</button>
  </div>
  <div class="cta-row">
    <button type="button" class="btn btn-ghost" data-nav="lab">AI LAB</button>
    <button type="button" class="btn btn-ghost" data-nav="backtest">백테스트</button>
    <button type="button" class="btn btn-ghost" data-nav="research">연구</button>
    <button type="button" class="btn btn-ghost" data-nav="legacy">클래식</button>
  </div>`
}

function labScreen(): string {
  const engines = Object.keys(model.engineScores)
  return `
  <section class="v3-card">
    <h2>AI LAB · Engine Council</h2>
    <p class="strategy-blurb">엔진별 점수와 합의입니다. 계산 결과 기반입니다.</p>
    ${engines
      .map((id) => {
        const scores = model.engineScores[id]!
        const ranked = Object.entries(scores)
          .sort((a, b) => b[1]! - a[1]!)
          .slice(0, 6)
          .map(([n]) => Number(n))
        return `<div class="panel"><h3>${id}</h3><div class="chip-list">${ranked.map((n) => ball(n, 'sm')).join('')}</div></div>`
      })
      .join('')}
  </section>
  <section class="v3-card">
    <h2>번호별 합의</h2>
    <div class="v3-rank-list">
      ${model.rankings
        .slice(0, 15)
        .map(
          (r) =>
            `<button type="button" class="v3-rank-row" data-detail="${r.number}"><span>#${r.rank} ${ball(r.number, 'sm')}</span><span>${r.score.toFixed(0)} · ${r.grade} · ${r.engineConsensus}</span></button>`,
        )
        .join('')}
    </div>
  </section>`
}

function numbersScreen(): string {
  let rows = model.rankings
  if (model.selectedFilter === 'HOT')
    rows = rows.filter((r) => r.temperature === 'HOT' || r.temperature === 'WARM')
  if (model.selectedFilter === 'COLD') rows = rows.filter((r) => r.temperature === 'COLD')
  if (model.selectedFilter === 'FROZEN')
    rows = rows.filter((r) => r.temperature === 'FROZEN')
  return `
  <section class="v3-card">
    <h2>NUMBERS 1–45</h2>
    <div class="strategies">
      ${(['ALL', 'HOT', 'COLD', 'FROZEN'] as const)
        .map(
          (f) =>
            `<button type="button" class="strategy ${model.selectedFilter === f ? 'active' : ''}" data-filter="${f}">${f}</button>`,
        )
        .join('')}
    </div>
    <div class="heat">
      ${rows
        .map(
          (r) =>
            `<button type="button" class="heat-cell" data-detail="${r.number}" title="${r.reasonSummary.join(' · ')}"><span class="n">${r.number}</span><span class="c">${r.score.toFixed(0)} ${r.temperature}</span></button>`,
        )
        .join('')}
    </div>
  </section>`
}

function detailScreen(): string {
  const n = model.detailNumber
  const row = model.rankings.find((r) => r.number === n)
  const stats = computeNumberStatistics(model.draws).find((s) => s.number === n)
  const pairScores = model.engineScores['pair']
  const related = pairScores
    ? Object.entries(pairScores)
        .filter(([k]) => Number(k) !== n)
        .sort((a, b) => b[1]! - a[1]!)
        .slice(0, 10)
        .map(([k]) => Number(k))
    : []
  return `
  <section class="v3-card">
    <button type="button" class="btn btn-ghost" data-nav="numbers">← NUMBERS</button>
    <h2>${ball(n, 'lg')} 상세</h2>
    <p>분석 점수 ${row?.score.toFixed(1) ?? '—'} · 등급 ${row?.grade ?? '—'} · ${row?.temperature ?? '—'}</p>
    <div class="insight-grid">
      <div class="insight"><div class="label">출현</div><div class="value">${stats?.totalAppearances ?? 0}</div></div>
      <div class="insight"><div class="label">현재 공백</div><div class="value">${stats?.currentDelay ?? 0}</div></div>
      <div class="insight"><div class="label">평균 공백</div><div class="value">${stats?.averageDelay.toFixed(1) ?? '—'}</div></div>
      <div class="insight"><div class="label">최근10</div><div class="value">${stats?.recent10 ?? 0}</div></div>
    </div>
    <h3>엔진 점수</h3>
    <div class="stat-list">
      ${Object.entries(row?.breakdown ?? {})
        .map(
          ([k, v]) =>
            `<div class="stat-row"><span>${k}</span><div class="bar"><i style="width:${v}%"></i></div><span class="val">${v.toFixed(0)}</span></div>`,
        )
        .join('')}
    </div>
    <h3>관련 번호 (pair 강도)</h3>
    <div class="chip-list">${related.map((x) => ball(x)).join('')}</div>
    <h3>관계 지도</h3>
    <div class="v3-relation">${renderRelationSvg(buildNetworkGraph(model.draws), n, 10)}</div>
    <h3>출현/공백 차트</h3>
    <div class="v3-chart" aria-label="최근 창 출현">
      ${(['recent5', 'recent10', 'recent20', 'recent50', 'recent100'] as const)
        .map((k) => {
          const v = stats?.[k] ?? 0
          const max = k === 'recent5' ? 5 : k === 'recent10' ? 6 : 12
          return `<div class="v3-bar-col"><div class="v3-bar" style="height:${Math.min(100, (v / max) * 100)}%"></div><span>${k.replace('recent', 'R')}</span><span class="nav-meta">${v}</span></div>`
        })
        .join('')}
    </div>
  </section>`
}

function generatorScreen(): string {
  const modes = listPresets().map((p) => p.mode)
  const c = model.prefs
  return `
  <section class="v3-card">
    <h2>GENERATOR</h2>
    <div class="strategies">
      ${modes
        .map(
          (m) =>
            `<button type="button" class="strategy ${model.genMode === m ? 'active' : ''}" data-mode="${m}">${m}</button>`,
        )
        .join('')}
    </div>
    <label class="v3-label">자연어 조건
      <textarea id="nl-input" rows="3" placeholder="예: 최근 많이 나온 번호는 줄이고 21번은 고정하고 10게임 만들어줘">${''}</textarea>
    </label>
    <button type="button" class="btn btn-ghost" id="nl-apply">조건 반영</button>
    <div class="insight-grid">
      <div class="insight"><div class="label">고정수</div><div class="value balls">${c.fixed.map((n) => ball(n, 'sm')).join('') || '—'}</div></div>
      <div class="insight"><div class="label">제외수</div><div class="value balls">${c.excluded.map((n) => ball(n, 'sm')).join('') || '—'}</div></div>
      <div class="insight"><div class="label">관심수</div><div class="value balls">${c.watch.map((n) => ball(n, 'sm')).join('') || '—'}</div></div>
    </div>
    <div class="v3-numpad" aria-label="번호 선택">
      ${Array.from({ length: MAX_N }, (_, i) => i + 1)
        .map((n) => {
          const role = c.fixed.includes(n)
            ? 'fix'
            : c.excluded.includes(n)
              ? 'ex'
              : c.watch.includes(n)
                ? 'watch'
                : ''
          return `<button type="button" class="v3-pad ${role}" data-toggle-num="${n}" aria-label="${n}번">${n}</button>`
        })
        .join('')}
    </div>
    <p class="nav-meta">탭: 고정 → 관심 → 제외 → 해제. 고정+제외 충돌은 차단됩니다.</p>
    <div class="cta-row">
      <label>게임 수 <input id="game-count" type="number" min="1" max="20" value="${model.gameCount}" style="width:4rem;margin-left:.4rem"/></label>
      <button type="button" class="btn btn-primary" id="do-gen">조합 생성</button>
    </div>
    <div class="pick-list">
      ${model.combos
        .map(
          (combo) => `
        <article class="pick">
          <div class="pick-top">${combo.numbers.map((n) => ball(n, 'lg')).join('')}<div class="pick-score">${combo.score.toFixed(0)}</div></div>
          <div class="pick-meta"><span>${combo.strategy}</span><span>DNA ${combo.dna.dnaString}</span><span>다양성 ${combo.diversityScore.toFixed(0)}</span></div>
          <ul class="reasons">${combo.dna.readable.map((r) => `<li>${r}</li>`).join('')}${(combo.warnings ?? []).map((w) => `<li class="warn">${w}</li>`).join('')}</ul>
          <button type="button" class="btn btn-ghost" data-save-combo='${JSON.stringify(combo.numbers)}'>MY에 저장</button>
        </article>`,
        )
        .join('') || '<p class="nav-meta">아직 생성된 조합이 없습니다.</p>'}
    </div>
  </section>`
}

function backtestScreen(): string {
  return `
  <section class="v3-card">
    <h2>BACKTEST LAB</h2>
    <p class="strategy-blurb">회차 N 평가는 N 이전 데이터만 사용합니다. Random Baseline 포함.</p>
    <div class="cta-row">
      <button type="button" class="btn btn-primary" id="bt-50">최근 50 · MASTER</button>
      <button type="button" class="btn btn-ghost" id="bt-100">최근 100</button>
      <button type="button" class="btn btn-ghost" id="bt-wf">Walk-forward</button>
      <button type="button" class="btn btn-ghost" id="bt-arena">Strategy Arena</button>
    </div>
    <pre class="v3-pre">${model.backtestText || '실행 결과가 여기 표시됩니다.'}</pre>
    ${histogramBars(model.backtestText)}
  </section>`
}

function histogramBars(text: string): string {
  const m = text.match(/"histogram":\s*\{([^}]+)\}/)
  if (!m && !text.includes('히스토그램')) return ''
  // Prefer structured parse from last JSON dump
  try {
    const jsonStart = text.indexOf('{')
    if (jsonStart < 0) return ''
    const obj = JSON.parse(text.slice(jsonStart)) as {
      histogram?: Record<string, number>
      matchHistogram?: Record<string, number>
    }
    const h = obj.histogram ?? obj.matchHistogram
    if (!h) return ''
    const max = Math.max(...Object.values(h), 1)
    return `<div class="v3-chart" aria-label="일치 개수 분포">${[0, 1, 2, 3, 4, 5, 6]
      .map(
        (i) =>
          `<div class="v3-bar-col"><div class="v3-bar" style="height:${((h[i] ?? 0) / max) * 100}%"></div><span>${i}</span><span class="nav-meta">${h[i] ?? 0}</span></div>`,
      )
      .join('')}</div>`
  } catch {
    return ''
  }
}

function myLottoScreen(): string {
  const tickets = model.tickets
  const bias = analyzeUserBias(tickets, model.draws)
  if (!tickets.length) {
    return `<section class="v3-card"><h2>MY LOTTO</h2><p>아직 구매한 로또가 없습니다. 직접 번호를 추가해보세요.</p>
    <button type="button" class="btn btn-primary" id="add-ticket">직접 추가</button>
    <button type="button" class="btn btn-ghost" id="scan-ticket">스캐너 (기기 플러그인 필요)</button>
    <p class="nav-meta">카메라 OCR/QR은 Capacitor 카메라 플러그인 연결 후 사용 가능합니다 (BLOCKED on Linux CI).</p>
    </section>`
  }
  const spent = tickets.reduce((s, t) => s + t.purchaseAmount, 0)
  const won = tickets.reduce((s, t) => s + t.winnings, 0)
  const allNums = tickets.flatMap((t) => t.games.flatMap((g) => g.numbers))
  const freq = new Map<number, number>()
  for (const n of allNums) freq.set(n, (freq.get(n) ?? 0) + 1)
  const frequent = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const rare = Array.from({ length: MAX_N }, (_, i) => i + 1)
    .map((n) => [n, freq.get(n) ?? 0] as const)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 6)
  return `
  <section class="v3-card">
    <h2>MY LOTTO</h2>
    <div class="insight-grid">
      <div class="insight"><div class="label">구매액</div><div class="value">${spent.toLocaleString()}</div></div>
      <div class="insight"><div class="label">당첨액</div><div class="value">${won.toLocaleString()}</div></div>
      <div class="insight"><div class="label">손익</div><div class="value">${(won - spent).toLocaleString()}</div></div>
      <div class="insight"><div class="label">티켓</div><div class="value">${tickets.length}</div></div>
    </div>
    <h3>자주 / 덜 사용한 번호</h3>
    <div class="chip-list">${frequent.map(([n]) => ball(n, 'sm')).join('')}</div>
    <div class="chip-list">${rare.map(([n]) => ball(n, 'sm')).join('')}</div>
    <h3>선택 습관 분석</h3>
    ${
      bias.insufficient
        ? `<p class="nav-meta">${bias.message}</p>`
        : `<ul class="reasons">${bias.findings
            .slice(0, 5)
            .map((f) => `<li>${f.label}: ${f.detail}</li>`)
            .join('')}</ul>`
    }
    <button type="button" class="btn btn-primary" id="add-ticket">추가</button>
    ${tickets
      .map(
        (t) =>
          `<article class="pick"><div class="pick-meta">${t.drawNumber}회 · ${t.purchaseDate} · ${t.source}</div>
          ${t.games.map((g) => `<div class="chip-list">${g.numbers.map((n) => ball(n, 'sm')).join('')}</div>`).join('')}
          <button type="button" class="btn btn-ghost" data-del-ticket="${t.id}">삭제</button></article>`,
      )
      .join('')}
  </section>`
}

function researchScreen(): string {
  const presets = listPresets()
  const saved = listStrategies()
  const favs = listFavorites()
  const top = model.rankings.slice(0, 6).map((r) => r.number)
  const sims = top.length === 6 ? findSimilarDraws(top, model.draws, 8) : []
  const graph = buildNetworkGraph(model.draws)
  const svg = renderRelationSvg(graph, model.relationFocus, model.relationTopK)
  const draft = normalizeWeights(model.strategyDraft)
  const weightKeys = Object.keys(draft)
  return `
  <section class="v3-card">
    <h2>RESEARCH / 더보기</h2>
    <div class="cta-row">
      <button type="button" class="btn btn-primary" data-nav="backtest">Backtest Lab</button>
      <button type="button" class="btn btn-ghost" data-nav="legacy">클래식 뷰</button>
    </div>
    <h3>Number Relation Map</h3>
    <div class="strategies">
      ${([5, 10, 20, 45] as const)
        .map(
          (k) =>
            `<button type="button" class="strategy ${model.relationTopK === k ? 'active' : ''}" data-rel-k="${k}">Top ${k === 45 ? '전체' : k}</button>`,
        )
        .join('')}
    </div>
    <label class="v3-label">중심 번호 <input id="rel-focus" type="number" min="1" max="45" value="${model.relationFocus}" style="width:4rem"/></label>
    <div class="v3-relation">${svg}</div>
    <h3>Strategy Builder</h3>
    <div class="v3-sliders">
      ${weightKeys
        .map(
          (k) =>
            `<label class="v3-slider-row"><span>${k}</span><input type="range" min="0" max="300" data-w="${k}" value="${Math.round((model.strategyDraft[k] ?? 0) * 100)}" /><span>${(draft[k] ?? 0).toFixed(2)}</span></label>`,
        )
        .join('')}
    </div>
    <div class="cta-row">
      <button type="button" class="btn btn-primary" id="save-strategy">전략 저장</button>
      <button type="button" class="btn btn-ghost" id="run-evolution">Experimental Evolution</button>
    </div>
    <ul class="reasons">${saved.map((s) => `<li>${s.name} <button type="button" data-del-strategy="${s.id}">삭제</button></li>`).join('') || '<li>저장된 사용자 전략 없음</li>'}</ul>
    <h3>Presets</h3>
    <ul class="reasons">${presets.map((p) => `<li>${p.name}: ${p.description}</li>`).join('')}</ul>
    <h3>Favorite presets</h3>
    <button type="button" class="btn btn-ghost" id="save-fav">현재 고정/제외/관심을 즐겨찾기</button>
    <ul class="reasons">${favs.map((f) => `<li>${f.name}</li>`).join('') || '<li>없음</li>'}</ul>
    <h3>Similar draw</h3>
    ${
      sims.length
        ? `<div class="stat-list">${sims.map((s) => `<div class="stat-row"><span>${s.drawNumber}</span><div class="bar"><i style="width:${(s.similarity * 100).toFixed(0)}%"></i></div><span class="val">${(s.similarity * 100).toFixed(0)}</span></div>`).join('')}</div>`
        : '<p class="nav-meta">분석 후 이용 가능</p>'
    }
    <h3>회차 리포트</h3>
    <pre class="v3-pre">${model.reportText || '분석 후 생성됩니다.'}</pre>
    <button type="button" class="btn btn-ghost" id="share-report">리포트 복사</button>
    <button type="button" class="btn btn-ghost" id="export-data">내보내기 JSON</button>
  </section>`
}

function onRootClick(ev: Event): void {
  const el = (ev.target as HTMLElement | null)?.closest(
    'button, [data-nav], [data-detail], [data-filter], [data-mode], [data-toggle-num], [data-rel-k], [data-del-strategy], [data-del-ticket], [data-save-combo], a.btn',
  ) as HTMLElement | null
  if (!el) return

  if (el.dataset.nav) {
    model.screen = el.dataset.nav as Screen
    paint()
    return
  }
  if (el.dataset.detail) {
    model.detailNumber = Number(el.dataset.detail)
    model.screen = 'detail'
    paint()
    return
  }
  if (el.dataset.filter) {
    model.selectedFilter = el.dataset.filter as AppModel['selectedFilter']
    paint()
    return
  }
  if (el.dataset.mode) {
    model.genMode = el.dataset.mode as GeneratorMode
    paint()
    return
  }
  if (el.dataset.toggleNum) {
    const n = Number(el.dataset.toggleNum)
    const c = { ...model.prefs }
    if (c.fixed.includes(n)) {
      c.fixed = c.fixed.filter((x) => x !== n)
      if (!c.watch.includes(n)) c.watch = [...c.watch, n].sort((a, b) => a - b)
    } else if (c.watch.includes(n)) {
      c.watch = c.watch.filter((x) => x !== n)
      if (!c.excluded.includes(n)) c.excluded = [...c.excluded, n].sort((a, b) => a - b)
    } else if (c.excluded.includes(n)) {
      c.excluded = c.excluded.filter((x) => x !== n)
    } else {
      if (c.fixed.length >= 6) {
        alert('고정수는 최대 6개입니다.')
        return
      }
      c.fixed = [...c.fixed, n].sort((a, b) => a - b)
    }
    model.prefs = c
    saveConstraints(c)
    paint()
    return
  }
  if (el.dataset.relK) {
    model.relationTopK = Number(el.dataset.relK) as 5 | 10 | 20 | 45
    paint()
    return
  }
  if (el.dataset.delStrategy) {
    deleteStrategy(el.dataset.delStrategy)
    paint()
    return
  }
  if (el.dataset.delTicket) {
    deleteTicket(el.dataset.delTicket)
    model.tickets = listTickets()
    paint()
    return
  }
  if (el.dataset.saveCombo) {
    const nums = JSON.parse(el.dataset.saveCombo) as number[]
    saveTicket({
      id: `t_${Date.now()}`,
      drawNumber: (model.latest?.drawNumber ?? 0) + 1,
      purchaseDate: new Date().toISOString().slice(0, 10),
      games: [{ label: 'A', numbers: nums }],
      purchaseAmount: 1000,
      winnings: 0,
      createdAt: new Date().toISOString(),
      source: 'generator',
    })
    model.tickets = listTickets()
    alert('MY LOTTO에 저장했습니다.')
    return
  }

  switch (el.id) {
    case 'do-gen':
      void onGenerate()
      break
    case 'nl-apply': {
      const text =
        (root.querySelector('#nl-input') as HTMLTextAreaElement | null)?.value ?? ''
      const parsed = parseNaturalLanguageConstraints(text)
      if (parsed.errors.length) {
        alert(parsed.errors.join('\n'))
        return
      }
      model.prefs = mergeParsedConstraints(model.prefs, parsed)
      saveConstraints(model.prefs)
      if (parsed.gameCount) model.gameCount = parsed.gameCount
      if (parsed.modeHint) model.genMode = parsed.modeHint
      if (parsed.reduceHot) model.genMode = 'CONTRARIAN'
      if (parsed.preferDelay && !parsed.modeHint) model.genMode = 'DELAY'
      paint()
      break
    }
    case 'bt-50':
      void onBacktest(50)
      break
    case 'bt-100':
      void onBacktest(100)
      break
    case 'bt-wf':
      void onWalkForward()
      break
    case 'bt-arena':
      void onArena()
      break
    case 'save-strategy': {
      const name = prompt('전략 이름', `USER ${new Date().toLocaleDateString('ko-KR')}`)
      if (!name) return
      const s = createStrategy(
        name,
        'MASTER',
        {
          fixed: model.prefs.fixed,
          excluded: model.prefs.excluded,
          watch: model.prefs.watch,
          gameCount: model.gameCount,
          seed: 1,
        },
        {
          weights: normalizeWeights(model.strategyDraft),
          description: '사용자 가중치 전략',
        },
      )
      saveStrategy(s)
      paint()
      break
    }
    case 'save-fav': {
      const name = prompt('즐겨찾기 이름', '기본 조합')
      if (!name) return
      saveFavorite({
        id: `fav_${Date.now()}`,
        name,
        fixed: model.prefs.fixed,
        watch: model.prefs.watch,
        excluded: model.prefs.excluded,
        createdAt: new Date().toISOString(),
      })
      paint()
      break
    }
    case 'run-evolution':
      void onEvolution()
      break
    case 'share-report':
      void navigator.clipboard
        .writeText(model.reportText)
        .then(() => alert('리포트를 클립보드에 복사했습니다.'))
        .catch(() => alert(model.reportText.slice(0, 500)))
      break
    case 'add-ticket':
      onAddTicket()
      break
    case 'scan-ticket':
      alert(
        '카메라 OCR/QR은 실기기에서 Capacitor 카메라 플러그인 연결 후 사용할 수 있습니다. 지금은 직접 추가를 이용해 주세요.',
      )
      break
    case 'export-data': {
      const blob = new Blob([JSON.stringify(exportStore(), null, 2)], {
        type: 'application/json',
      })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'lottolens-v3-export.json'
      a.click()
      break
    }
    case 'open-legacy':
      window.dispatchEvent(new CustomEvent('lottolens:open-legacy'))
      break
    default:
      break
  }
}

function onRootChange(ev: Event): void {
  const t = ev.target as HTMLInputElement
  if (t.id === 'game-count') {
    model.gameCount = Math.max(1, Math.min(20, Number(t.value) || 1))
  }
  if (t.id === 'rel-focus') {
    const v = Number(t.value)
    if (v >= 1 && v <= 45) {
      model.relationFocus = v
      paint()
    }
  }
}

function onRootInput(ev: Event): void {
  const t = ev.target as HTMLInputElement
  if (t.dataset.w) {
    model.strategyDraft = {
      ...model.strategyDraft,
      [t.dataset.w]: Number(t.value) / 100,
    }
  }
}

async function onGenerate(): Promise<void> {
  try {
    model.prefs = getConstraints()
    model.combos = await generateCombinations({
      draws: model.draws,
      datasetVersion: model.datasetVersion,
      mode: model.genMode,
      gameCount: model.gameCount,
      fixed: model.prefs.fixed,
      excluded: model.prefs.excluded,
      watch: model.prefs.watch,
      seed: Date.now() % 1e9,
      masterScores: model.engineScores['master'],
    })
    paint()
  } catch (e) {
    alert(e instanceof Error ? e.message : '생성 실패')
  }
}

async function onBacktest(windowSize: number): Promise<void> {
  if (!model.latest) return
  const to = model.latest.drawNumber
  const from = Math.max(2, to - windowSize + 1)
  model.backtestText = '계산 중…'
  paint()
  try {
    const report = await runBacktest({
      allDraws: model.draws,
      strategyMode: 'MASTER',
      fromDraw: from,
      toDraw: to,
      gamesPerDraw: 5,
      seed: 123,
    })
    model.backtestText =
      formatBacktestHuman(report) +
      '\n\n' +
      JSON.stringify(
        {
          from,
          to,
          drawCount: report.drawCount,
          averageMatches: report.averageMatches,
          randomAverageMatches: report.randomAverageMatches,
          delta: report.delta,
          matchHistogram: report.matchHistogram,
          bestMatch: report.bestMatch,
          note: '통계 비교이며 미래 당첨을 보장하지 않습니다.',
        },
        null,
        2,
      )
  } catch (e) {
    model.backtestText = e instanceof Error ? e.message : '백테스트 실패'
  }
  paint()
}

async function onArena(): Promise<void> {
  if (!model.latest) return
  const to = model.latest.drawNumber
  const from = Math.max(2, to - 49)
  model.backtestText = 'Strategy Arena 계산 중…'
  paint()
  const modes: GeneratorMode[] = ['MASTER', 'TREND', 'DELAY', 'RELATION', 'CONTRARIAN', 'RANDOM']
  const lines: string[] = ['Strategy Arena (동일 50회 · 5게임)', 'mode\tavg\trandom\tdelta\tn']
  try {
    for (const mode of modes) {
      const report = await runBacktest({
        allDraws: model.draws,
        strategyMode: mode,
        fromDraw: from,
        toDraw: to,
        gamesPerDraw: 5,
        seed: 42,
      })
      lines.push(
        `${mode}\t${report.averageMatches.toFixed(3)}\t${report.randomAverageMatches.toFixed(3)}\t${report.delta >= 0 ? '+' : ''}${report.delta.toFixed(3)}\t${report.drawCount}`,
      )
    }
    lines.push('', 'Random Baseline 없이 성능이 좋다고 표시하지 않습니다.')
    model.backtestText = lines.join('\n')
  } catch (e) {
    model.backtestText = e instanceof Error ? e.message : 'Arena 실패'
  }
  paint()
}

async function onEvolution(): Promise<void> {
  if (!model.latest || model.draws.length < 200) {
    alert('Evolution에 필요한 회차가 부족합니다.')
    return
  }
  const last = model.latest.drawNumber
  model.backtestText = 'Experimental Evolution 계산 중…'
  model.screen = 'backtest'
  paint()
  try {
    const proposal = await proposeWeightEvolution({
      allDraws: model.draws,
      mode: 'MASTER',
      seed: 11,
      trainEnd: last - 150,
      validationFrom: last - 149,
      validationTo: last - 75,
      holdoutFrom: last - 74,
      holdoutTo: last,
    })
    model.backtestText = JSON.stringify(proposal, null, 2)
  } catch (e) {
    model.backtestText = e instanceof Error ? e.message : 'Evolution 실패'
  }
  paint()
}

async function onWalkForward(): Promise<void> {
  if (!model.latest || model.draws.length < 100) {
    model.backtestText = 'Walk-forward에 필요한 회차가 부족합니다.'
    paint()
    return
  }
  const last = model.latest.drawNumber
  model.backtestText = 'Walk-forward 계산 중…'
  paint()
  try {
    const report = await walkForward({
      allDraws: model.draws,
      strategyMode: 'MASTER',
      gamesPerDraw: 3,
      seed: 99,
      folds: [
        { trainEnd: last - 100, validateFrom: last - 99, validateTo: last - 50 },
        { trainEnd: last - 50, validateFrom: last - 49, validateTo: last },
      ],
    })
    model.backtestText = JSON.stringify(report, null, 2)
  } catch (e) {
    model.backtestText = e instanceof Error ? e.message : '실패'
  }
  paint()
}

function onAddTicket(): void {
  const raw = prompt('번호 6개를 쉼표로 입력 (예: 1,2,3,4,5,6)')
  if (!raw) return
  try {
    const nums = validateCombination(
      raw.split(/[\s,]+/).map((x) => Number(x.trim())),
    )
    saveTicket({
      id: `t_${Date.now()}`,
      drawNumber: (model.latest?.drawNumber ?? 0) + 1,
      purchaseDate: new Date().toISOString().slice(0, 10),
      games: [{ label: 'A', numbers: nums }],
      purchaseAmount: 1000,
      winnings: 0,
      createdAt: new Date().toISOString(),
      source: 'manual',
    })
    model.tickets = listTickets()
    paint()
  } catch (e) {
    alert(e instanceof Error ? e.message : '입력 오류')
  }
}
