import './style.css'
import dataset from './data/draws.json'
import { analyzeFlow } from './lib/flow'
import {
  STRATEGY_META,
  analyzeCombination,
  generatePicks,
} from './lib/recommend'
import {
  RECENT_WINDOW,
  ballColor,
  chiSquareUniform,
  computeNumberStats,
  computePairStats,
  computePatterns,
  parseDraws,
  sumStats,
  topBottom,
} from './lib/stats'
import type { Dataset, PickResult, Strategy } from './lib/types'

const data = dataset as Dataset
const draws = parseDraws(data)
const stats = computeNumberStats(draws)
const pairs = computePairStats(draws, 80)
const patterns = computePatterns(draws)
const sums = sumStats(draws)
const ranks = topBottom(stats, 6)
const chi = chiSquareUniform(stats, draws.length)
const flow = analyzeFlow(draws)
const latest = draws[draws.length - 1]

let strategy: Strategy = 'balanced'
let picks: PickResult[] = generatePicks(draws, stats, pairs, strategy, 5)
let selected = new Set<number>()
let histQuery = ''
let histPage = 0
const HIST_PAGE = 12

const app = document.querySelector<HTMLDivElement>('#app')!

function ballEl(n: number, opts: { bonus?: boolean; size?: 'sm' | 'lg'; delay?: number } = {}) {
  const cls = ['ball', ballColor(n)]
  if (opts.bonus) cls.push('bonus')
  if (opts.size) cls.push(opts.size)
  const delay = opts.delay != null ? `style="animation-delay:${opts.delay}ms"` : ''
  return `<span class="${cls.join(' ')}" ${delay}>${n}</span>`
}

function ballsRow(nums: number[], bonus?: number, size?: 'sm' | 'lg') {
  const main = nums
    .map((n, i) => ballEl(n, { size, delay: i * 50 }))
    .join('')
  if (bonus == null) return `<div class="balls">${main}</div>`
  return `<div class="balls">${main}<span class="plus">+</span>${ballEl(bonus, { bonus: true, size, delay: 320 })}</div>`
}

function maxCount() {
  return Math.max(...stats.map((s) => s.count))
}

function heatColor(count: number): string {
  const t = count / maxCount()
  // mint → gold intensity
  const a = 0.08 + t * 0.55
  return `background: rgba(242, 193, 78, ${a.toFixed(3)});`
}

function pct(n: number, total: number): string {
  return ((n / total) * 100).toFixed(1)
}

function barRows(entries: [string, number][], total: number) {
  const max = Math.max(...entries.map(([, v]) => v), 1)
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(
      ([label, v]) => `
      <div class="stat-row">
        <span>${label}</span>
        <div class="bar"><i style="width:${((v / max) * 100).toFixed(1)}%"></i></div>
        <span class="val">${v}회 (${pct(v, total)}%)</span>
      </div>`,
    )
    .join('')
}

function renderPicks() {
  return picks
    .map(
      (p, i) => `
    <article class="pick" style="animation-delay:${i * 70}ms">
      <div class="pick-top">
        ${ballsRow(p.numbers, undefined, 'lg')}
        <div class="pick-score">적합도 ${p.score.toFixed(0)}</div>
      </div>
      <div class="pick-meta">
        <span>${p.pattern.oddEven}</span>
        <span>${p.pattern.highLow}</span>
        <span>합 ${p.pattern.sum}</span>
        <span>연속 ${p.pattern.consecutive}</span>
        <span>AC ${p.pattern.ac}</span>
      </div>
      <ul class="reasons">${p.reasons.map((r) => `<li>${r}</li>`).join('')}</ul>
    </article>`,
    )
    .join('')
}

function renderChecker() {
  const analysis = analyzeCombination([...selected], draws, stats)
  const pad = Array.from({ length: 45 }, (_, i) => i + 1)
    .map((n) => {
      const on = selected.has(n)
      const disabled = !on && selected.size >= 6
      const cls = ['pad-btn', ballColor(n)]
      if (on) cls.push('on')
      return `<button type="button" class="${cls.join(' ')}" data-num="${n}" ${disabled ? 'disabled' : ''} aria-pressed="${on}">${n}</button>`
    })
    .join('')

  let result = `<p class="strategy-blurb">번호를 6개 고르면 역대 패턴 적합도를 바로 보여줍니다.</p>`
  if (analysis.valid) {
    result = `
      <div class="pick-top">
        ${ballsRow(analysis.numberInsights.map((x) => x.n), undefined, 'lg')}
        <div class="pick-score">적합도 ${analysis.score.toFixed(0)}</div>
      </div>
      <div class="pick-meta">
        <span>${analysis.pattern.oddEven}</span>
        <span>${analysis.pattern.highLow}</span>
        <span>합 ${analysis.pattern.sum}</span>
        <span>연속 ${analysis.pattern.consecutive}</span>
        <span>AC ${analysis.pattern.ac}</span>
      </div>
      <ul class="reasons">${analysis.reasons.map((r) => `<li>${r}</li>`).join('')}</ul>
      <ul class="reasons" style="margin-top:0.85rem">
        ${analysis.numberInsights
          .map(
            (x) =>
              `<li>${x.n} · ${x.gap}회 공백 · 회귀 ${x.overdue.toFixed(1)}× · 빈도 ${x.rank}위</li>`,
          )
          .join('')}
      </ul>`
  } else if (selected.size) {
    result = `<p class="strategy-blurb">${selected.size}/6 선택됨</p>${ballsRow([...selected].sort((a, b) => a - b))}`
  }

  return `
    <div class="num-pad">${pad}</div>
    <div class="cta-row" style="margin-top:1rem">
      <button type="button" class="btn btn-ghost" id="clear-sel">선택 초기화</button>
    </div>
    <div class="result-box">${result}</div>
  `
}

function filteredHistory() {
  const q = histQuery.trim()
  let list = [...draws].reverse()
  if (q) {
    const nums = q
      .split(/[\s,./]+/)
      .map((x) => Number(x))
      .filter((n) => n >= 1 && n <= 45)
    if (nums.length) {
      list = list.filter((d) => nums.every((n) => d.numbers.includes(n) || d.bonus === n))
    } else if (/^\d+$/.test(q)) {
      const round = Number(q)
      list = list.filter((d) => d.round === round)
    }
  }
  return list
}

function renderHistory() {
  const list = filteredHistory()
  const pages = Math.max(1, Math.ceil(list.length / HIST_PAGE))
  histPage = Math.min(histPage, pages - 1)
  const slice = list.slice(histPage * HIST_PAGE, histPage * HIST_PAGE + HIST_PAGE)

  return `
    <div class="hist-controls">
      <label class="sr-only" for="hist-q">회차 또는 번호 검색</label>
      <input id="hist-q" type="search" placeholder="회차(예: 1235) 또는 번호(예: 7 15 39)" value="${histQuery.replace(/"/g, '&quot;')}" />
    </div>
    <table class="hist-table">
      <thead>
        <tr><th>회차</th><th>추첨일</th><th>당첨번호</th></tr>
      </thead>
      <tbody>
        ${slice
          .map(
            (d) => `
          <tr>
            <td class="round">${d.round}</td>
            <td class="date">${d.date}</td>
            <td>${ballsRow(d.numbers, d.bonus, 'sm')}</td>
          </tr>`,
          )
          .join('')}
      </tbody>
    </table>
    <div class="cta-row" style="margin-top:1rem">
      <button type="button" class="btn btn-ghost" id="hist-prev" ${histPage <= 0 ? 'disabled' : ''}>이전</button>
      <span class="nav-meta">${histPage + 1} / ${pages} · ${list.length}건</span>
      <button type="button" class="btn btn-ghost" id="hist-next" ${histPage >= pages - 1 ? 'disabled' : ''}>다음</button>
    </div>
  `
}

function oeEntries() {
  return Object.entries(patterns.oddEven).map(([k, v]) => {
    const [o, e] = k.split(':')
    return [`${o}홀${e}짝`, v] as [string, number]
  })
}

function hlEntries() {
  return Object.entries(patterns.highLow).map(([k, v]) => {
    const [l, h] = k.split(':')
    return [`저${l}:고${h}`, v] as [string, number]
  })
}

function render() {
  const heat = stats
    .map(
      (s) => `
    <div class="heat-cell" style="${heatColor(s.count)}" title="${s.n}번 · ${s.count}회 · 공백 ${s.gap}회 · 회귀 ${s.overdue.toFixed(2)}×">
      <span class="n">${s.n}</span>
      <span class="c">${s.count}</span>
    </div>`,
    )
    .join('')

  app.innerHTML = `
    <header class="hero">
      <div class="hero-bg" aria-hidden="true"></div>
      <div class="hero-orbit" aria-hidden="true">
        <div class="float-ball y fb1">7</div>
        <div class="float-ball b fb2">15</div>
        <div class="float-ball r fb3">27</div>
        <div class="float-ball g fb4">34</div>
        <div class="float-ball gn fb5">43</div>
      </div>
      <div class="wrap" style="display:flex;flex-direction:column;min-height:100svh;position:relative;z-index:2;">
        <nav class="nav">
          <div class="brand-mark">
            <span class="aizio">AIZIO</span>
            <span class="product">로또렌즈</span>
          </div>
          <div class="nav-meta">${data.count}회차 · ${data.updated} 기준</div>
        </nav>
        <div class="hero-copy">
          <p class="aizio-logo" aria-label="AIZIO">AIZIO</p>
          <p class="brand-hero">로또렌즈</p>
          <h1>실제 당첨 데이터로 읽는<br />번호의 결</h1>
          <p>1회부터 ${latest.round}회까지 ${data.count}번의 추첨을 빈도·공백·페어·회차 흐름으로 분해합니다.</p>
          <div class="cta-row">
            <a class="btn btn-primary" href="#flow">순서·흐름 보기</a>
            <a class="btn btn-ghost" href="#generate">스마트 번호 받기</a>
          </div>
        </div>
      </div>
    </header>

    <main>
      <section>
        <div class="wrap">
          <div class="section-head">
            <h2>최신 회차</h2>
            <p>동행복권 공식 추첨 결과입니다.</p>
          </div>
          <div class="latest">
            <div class="latest-meta">
              <span><strong>${latest.round}</strong>회</span>
              <span>${latest.date}</span>
              <span>합계 <strong>${latest.numbers.reduce((a, b) => a + b, 0)}</strong></span>
            </div>
            ${ballsRow(latest.numbers, latest.bonus, 'lg')}
          </div>
        </div>
      </section>

      <section id="stats">
        <div class="wrap">
          <div class="section-head">
            <h2>출현 히트맵</h2>
            <p>밝을수록 누적 출현이 많습니다. 기대 출현 ≈ ${chi.expected.toFixed(1)}회 · χ²=${chi.chi2.toFixed(1)}</p>
          </div>
          <div class="heat">${heat}</div>

          <div class="insight-grid" style="margin-top:2rem">
            <div class="insight">
              <div class="label">번호 합 평균</div>
              <div class="value">${sums.mean.toFixed(1)}</div>
              <div class="hint">σ ${sums.std.toFixed(1)} · 중앙 ${sums.p50.toFixed(0)}</div>
            </div>
            <div class="insight">
              <div class="label">합 10–90% 구간</div>
              <div class="value">${sums.p10.toFixed(0)}–${sums.p90.toFixed(0)}</div>
              <div class="hint">극단 합은 드묾</div>
            </div>
            <div class="insight">
              <div class="label">최근 창</div>
              <div class="value">${RECENT_WINDOW}회</div>
              <div class="hint">핫/콜드 판정 기준</div>
            </div>
            <div class="insight">
              <div class="label">최다 출현</div>
              <div class="value">${ranks.hottest[0].n}</div>
              <div class="hint">${ranks.hottest[0].count}회</div>
            </div>
          </div>

          <div class="panel-row" style="margin-top:1.5rem">
            <div class="panel">
              <h3>핫 넘버 (누적)</h3>
              <div class="chip-list">${ranks.hottest.map((s) => ballEl(s.n)).join('')}</div>
            </div>
            <div class="panel">
              <h3>콜드 넘버 (누적)</h3>
              <div class="chip-list">${ranks.coldest.map((s) => ballEl(s.n)).join('')}</div>
            </div>
            <div class="panel">
              <h3>최근 ${RECENT_WINDOW}회 핫</h3>
              <div class="chip-list">${ranks.recentHot.map((s) => ballEl(s.n)).join('')}</div>
            </div>
            <div class="panel">
              <h3>회귀 대기 (공백/평균간격)</h3>
              <div class="chip-list">${ranks.overdue.map((s) => ballEl(s.n)).join('')}</div>
            </div>
          </div>
        </div>
      </section>

      <section id="flow">
        <div class="wrap">
          <div class="section-head">
            <h2>순서와 흐름</h2>
            <p>회차와 회차 사이에서 실제로 관측된 전이·평균회귀·위치 골격을 읽습니다.</p>
          </div>
          <ul class="narrative">
            ${flow.narrative.map((n) => `<li>${n}</li>`).join('')}
          </ul>

          <div class="insight-grid">
            <div class="insight">
              <div class="label">평균 이월(직전∩다음)</div>
              <div class="value">${flow.overlap.avg.toFixed(2)}</div>
              <div class="hint">대부분 0~1개만 겹침</div>
            </div>
            <div class="insight">
              <div class="label">합 상승|직전↑</div>
              <div class="value">${(flow.sumFlow.pUpAfterUp * 100).toFixed(0)}%</div>
              <div class="hint">올라도 이어지기 어려움</div>
            </div>
            <div class="insight">
              <div class="label">합 상승|직전↓</div>
              <div class="value">${(flow.sumFlow.pUpAfterDown * 100).toFixed(0)}%</div>
              <div class="hint">내리면 반등 편향</div>
            </div>
            <div class="insight">
              <div class="label">재등장 중앙값</div>
              <div class="value">${flow.reappear.median.toFixed(0)}회</div>
              <div class="hint">평균 ${flow.reappear.mean.toFixed(1)} · P75 ${flow.reappear.p75.toFixed(0)}</div>
            </div>
          </div>

          <div class="panel" style="margin-top:1.25rem">
            <h3>최근 12회 합계 흐름</h3>
            <p class="strategy-blurb">현재 합 ${flow.sumFlow.lastSum} · Δ${flow.sumFlow.lastDelta >= 0 ? '+' : ''}${flow.sumFlow.lastDelta}
              · 다음 편향 <strong style="color:var(--gold)">${
                flow.sumFlow.nextBias === 'up'
                  ? '상승'
                  : flow.sumFlow.nextBias === 'down'
                    ? '하락'
                    : '중립'
              }</strong>
              (${(flow.sumFlow.nextBiasStrength * 100).toFixed(0)}%)</p>
            <div class="spark" aria-hidden="true">
              ${(() => {
                const vals = flow.sumFlow.recentSums.map((x) => x.sum)
                const min = Math.min(...vals)
                const max = Math.max(...vals)
                const span = Math.max(1, max - min)
                return flow.sumFlow.recentSums
                  .map((x) => {
                    const h = 18 + ((x.sum - min) / span) * 90
                    const down = x.delta < 0
                    return `<div class="spark-col" title="${x.round}회 합 ${x.sum}">
                      <div class="spark-bar ${down ? 'down' : ''}" style="height:${h.toFixed(0)}px"></div>
                      <span class="spark-lab">${String(x.round).slice(-2)}</span>
                    </div>`
                  })
                  .join('')
              })()}
            </div>
          </div>

          <div class="panel-row" style="margin-top:0.5rem">
            <div class="panel">
              <h3>정렬 순서 골격 (작은수→큰수)</h3>
              <p class="strategy-blurb">당첨번호는 항상 정렬되어 공표됩니다. 각 자리의 역사적 구간입니다.</p>
              <div class="corridor">
                ${flow.positions
                  .map((p) => {
                    const left = ((p.p20 - 1) / 44) * 100
                    const width = ((p.p80 - p.p20) / 44) * 100
                    const meanX = ((p.mean - 1) / 44) * 100
                    return `<div class="corridor-row">
                      <span>${p.label}</span>
                      <div class="corridor-track">
                        <i style="left:${left.toFixed(1)}%;width:${Math.max(width, 2).toFixed(1)}%"></i>
                        <b style="left:${meanX.toFixed(1)}%"></b>
                      </div>
                      <span class="val" style="font-family:var(--font-num);color:var(--ink-soft);font-size:0.85rem">${p.p20.toFixed(0)}–${p.p80.toFixed(0)} · μ${p.mean.toFixed(1)}</span>
                    </div>`
                  })
                  .join('')}
              </div>
            </div>
            <div class="panel">
              <h3>직전→다음 이월 분포</h3>
              <div class="stat-list">${barRows(
                flow.overlap.dist.map((d) => [`${d.k}개 겹침`, d.count]),
                draws.length - 1,
              )}</div>
            </div>
          </div>

          <div class="panel-row">
            <div class="panel">
              <h3>${latest.round}회 기준 다음 후보 (전이 lift)</h3>
              <p class="strategy-blurb">직전 번호가 나온 뒤, 다음 회에 조건부 출현이 기댓값보다 높은 번호입니다.</p>
              <div class="flow-links">
                ${flow.nextFromLatest
                  .slice(0, 10)
                  .map(
                    (t) =>
                      `<span class="flow-link">${ballEl(t.to, { size: 'sm' })} <span class="lift">×${t.lift.toFixed(2)}</span></span>`,
                  )
                  .join('')}
              </div>
            </div>
            <div class="panel">
              <h3>강한 전역 전이 TOP</h3>
              <p class="strategy-blurb">A가 나온 다음 회에 B가 따라붙는 비율이 평소보다 높은 쌍입니다.</p>
              <div class="flow-links">
                ${flow.topTransitions
                  .slice(0, 8)
                  .map(
                    (t) =>
                      `<span class="flow-link">${ballEl(t.from, { size: 'sm' })}<span class="flow-arrow">→</span>${ballEl(t.to, { size: 'sm' })} <span class="lift">×${t.lift.toFixed(2)}</span></span>`,
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div class="wrap">
          <div class="section-head">
            <h2>패턴 통계</h2>
            <p>당첨 조합이 실제로 어떤 형태를 선호했는지 봅니다.</p>
          </div>
          <div class="panel-row">
            <div class="panel">
              <h3>홀짝 분포</h3>
              <div class="stat-list">${barRows(oeEntries(), draws.length)}</div>
            </div>
            <div class="panel">
              <h3>저고 분포 (1–22 / 23–45)</h3>
              <div class="stat-list">${barRows(hlEntries(), draws.length)}</div>
            </div>
            <div class="panel">
              <h3>합계 구간</h3>
              <div class="stat-list">${barRows(
                patterns.sumBuckets.map((b) => [`${b.label} ${b.min}–${b.max}`, b.count]),
                draws.length,
              )}</div>
            </div>
            <div class="panel">
              <h3>연속수 쌍</h3>
              <div class="stat-list">${barRows(
                Object.entries(patterns.consecutive).map(([k, v]) => [`${k}쌍`, v]),
                draws.length,
              )}</div>
            </div>
          </div>
          <div class="panel" style="margin-top:0.5rem">
            <h3>최다 동반 페어 TOP 10</h3>
            <div class="stat-list">
              ${(() => {
                const top = pairs.slice(0, 10)
                const max = top[0]?.count ?? 1
                return top
                  .map(
                    (p) => `<div class="stat-row">
                    <span>${p.a}–${p.b}</span>
                    <div class="bar"><i style="width:${((p.count / max) * 100).toFixed(1)}%"></i></div>
                    <span class="val">${p.count}회</span>
                  </div>`,
                  )
                  .join('')
              })()}
            </div>
          </div>
        </div>
      </section>

      <section id="generate">
        <div class="wrap">
          <div class="section-head">
            <h2>스마트 추천</h2>
            <p>가중 빈도·공백 회귀·페어 친화·역사적 패턴 적합도를 결합합니다.</p>
          </div>
          <div class="strategies">
            ${(Object.keys(STRATEGY_META) as Strategy[])
              .map(
                (k) =>
                  `<button type="button" class="strategy ${k === strategy ? 'active' : ''}" data-strategy="${k}">${STRATEGY_META[k].label}</button>`,
              )
              .join('')}
          </div>
          <p class="strategy-blurb">${STRATEGY_META[strategy].blurb}</p>
          <div class="cta-row" style="margin-bottom:1rem">
            <button type="button" class="btn btn-primary" id="regen">다시 생성</button>
          </div>
          <div class="pick-list" id="pick-list">${renderPicks()}</div>
        </div>
      </section>

      <section id="check">
        <div class="wrap">
          <div class="section-head">
            <h2>내 번호 점검</h2>
            <p>선택한 조합이 역대 통계와 얼마나 맞는 형태인지 확인합니다.</p>
          </div>
          <div class="checker" id="checker">${renderChecker()}</div>
        </div>
      </section>

      <section id="history">
        <div class="wrap">
          <div class="section-head">
            <h2>회차 아카이브</h2>
            <p>출처: ${data.source} · 전체 ${data.count}회</p>
          </div>
          <div id="history-box">${renderHistory()}</div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <div class="wrap">
        <p class="disclaimer">로또는 독립적 무작위 추첨입니다. 본 분석은 오락·학습 목적이며 당첨을 보장하지 않습니다.</p>
        <p>AIZIO 로또렌즈 · 동행복권 실제 데이터 ${data.count}회차 (${draws[0].date} – ${latest.date})</p>
      </div>
    </footer>
  `

  bind()
}

function bind() {
  document.querySelectorAll<HTMLButtonElement>('[data-strategy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      strategy = btn.dataset.strategy as Strategy
      picks = generatePicks(draws, stats, pairs, strategy, 5)
      render()
      document.querySelector('#generate')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  })

  document.querySelector('#regen')?.addEventListener('click', () => {
    picks = generatePicks(draws, stats, pairs, strategy, 5, Date.now() ^ (Math.random() * 1e9))
    const list = document.querySelector('#pick-list')
    if (list) list.innerHTML = renderPicks()
  })

  bindChecker()
  bindHistory()
}

function bindChecker() {
  document.querySelector('#clear-sel')?.addEventListener('click', () => {
    selected.clear()
    const box = document.querySelector('#checker')
    if (box) {
      box.innerHTML = renderChecker()
      bindChecker()
    }
  })
  document.querySelectorAll<HTMLButtonElement>('#checker [data-num]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const n = Number(btn.dataset.num)
      if (selected.has(n)) selected.delete(n)
      else if (selected.size < 6) selected.add(n)
      const box = document.querySelector('#checker')
      if (box) {
        box.innerHTML = renderChecker()
        bindChecker()
      }
    })
  })
}

function bindHistory() {
  const input = document.querySelector<HTMLInputElement>('#hist-q')
  input?.addEventListener('input', () => {
    histQuery = input.value
    histPage = 0
    const box = document.querySelector('#history-box')
    if (box) {
      box.innerHTML = renderHistory()
      bindHistory()
    }
  })
  document.querySelector('#hist-prev')?.addEventListener('click', () => {
    histPage = Math.max(0, histPage - 1)
    const box = document.querySelector('#history-box')
    if (box) {
      box.innerHTML = renderHistory()
      bindHistory()
    }
  })
  document.querySelector('#hist-next')?.addEventListener('click', () => {
    histPage += 1
    const box = document.querySelector('#history-box')
    if (box) {
      box.innerHTML = renderHistory()
      bindHistory()
    }
  })
}

render()
