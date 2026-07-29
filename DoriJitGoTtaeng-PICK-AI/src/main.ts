import './style.css'
import {
  analyze,
  getHeaderStats,
  numberWinRates,
  positionWinRates,
  recentRates,
  topCombos,
} from './ai'
import {
  addRecord,
  clearRecords,
  csvToRecords,
  downloadText,
  exportBackupJson,
  importBackupJson,
  loadRecords,
  recordsToCsv,
  restoreFromAutoBackup,
  saveRecords,
} from './storage'
import type { AnalysisResult, CardNumber, GameRecord, Position } from './types'

type View = 'play' | 'stats' | 'data'

const state = {
  cards: [null, null, null] as (CardNumber | null)[],
  analysis: null as AnalysisResult | null,
  view: 'play' as View,
  records: [] as GameRecord[],
  search: '',
}

function pct(n: number | null, digits = 1): string {
  if (n === null || Number.isNaN(n)) return '—'
  return `${(n * 100).toFixed(digits)}%`
}

function showFlash(msg: string): void {
  const el = document.getElementById('flash')
  if (!el) return
  el.textContent = msg
  el.classList.add('show')
  window.setTimeout(() => el.classList.remove('show'), 1600)
}

function refreshRecords(): void {
  state.records = loadRecords()
}

function currentIndex(): number {
  return state.cards.findIndex((c) => c === null)
}

function pushCard(n: CardNumber): void {
  const i = currentIndex()
  if (i < 0) return
  state.cards[i] = n
  if (i === 2) {
    runAnalysis()
  } else {
    state.analysis = null
  }
  render()
}

function undo(): void {
  for (let i = 2; i >= 0; i--) {
    if (state.cards[i] !== null) {
      state.cards[i] = null
      state.analysis = null
      break
    }
  }
  render()
}

function clearInput(): void {
  state.cards = [null, null, null]
  state.analysis = null
  render()
}

function runAnalysis(): void {
  const [a, b, c] = state.cards
  if (a === null || b === null || c === null) return
  state.analysis = analyze(state.records, [a, b, c])
}

function submitWinner(winner: Position): void {
  const [a, b, c] = state.cards
  if (a === null || b === null || c === null) {
    showFlash('숫자를 먼저 입력하세요')
    return
  }
  const recommended = state.analysis?.recommended ?? null
  addRecord([a, b, c], winner, recommended)
  refreshRecords()
  const hit = recommended === winner
  showFlash(hit ? `저장 완료 · 적중 ✓` : `저장 완료 · ${winner}번 승리`)
  state.cards = [null, null, null]
  state.analysis = null
  render()
}

function renderHeader(root: HTMLElement): void {
  const h = getHeaderStats(state.records)
  root.innerHTML = `
    <header class="header">
      <h1 class="brand">DoriJitGoTtaeng<span>PICK AI</span></h1>
      <div class="stats-row">
        <div class="stat-chip"><span class="label">데이터</span><span class="value">${h.total}</span></div>
        <div class="stat-chip"><span class="label">최근 적중</span><span class="value">${pct(h.recentHitRate, 0)}</span></div>
        <div class="stat-chip"><span class="label">전체 적중</span><span class="value">${pct(h.overallHitRate, 1)}</span></div>
        <div class="stat-chip"><span class="label">AI 신뢰도</span><span class="value">${h.confidence.toFixed(0)}%</span></div>
      </div>
    </header>
  `
}

function renderPlay(root: HTMLElement): void {
  const idx = currentIndex()
  const filled = state.cards.every((c) => c !== null)
  const a = state.analysis

  const slots = [0, 1, 2]
    .map((i) => {
      const v = state.cards[i]
      const cls = [
        'slot',
        v !== null ? 'filled' : '',
        idx === i ? 'active' : '',
      ]
        .filter(Boolean)
        .join(' ')
      return `<div class="${cls}"><span class="pos">${i + 1}번</span><span class="num">${v ?? '·'}</span></div>`
    })
    .join('')

  const pad = Array.from({ length: 10 }, (_, i) => i + 1)
    .map(
      (n) =>
        `<button type="button" data-num="${n}" ${filled ? 'disabled' : ''}>${n}</button>`,
    )
    .join('')

  let analysisHtml = ''
  if (a) {
    const probs = a.probs
      .map((p, i) => {
        const best = a.recommended === i + 1 ? 'best' : ''
        return `<div class="prob-card ${best}"><div class="pos-label">${i + 1}번</div><div class="pct">${(p * 100).toFixed(1)}%</div></div>`
      })
      .join('')

    const engines =
      a.engines.length > 0
        ? `<div class="engine-list">${a.engines
            .map(
              (e) =>
                `<div class="engine-row"><strong>${e.name}</strong><span>${(e.probs[0] * 100).toFixed(0)}%</span><span>${(e.probs[1] * 100).toFixed(0)}%</span><span>${(e.probs[2] * 100).toFixed(0)}%</span></div>`,
            )
            .join('')}</div>`
        : ''

    analysisHtml = `
      <section class="panel" style="animation-delay:0.05s">
        <h2>AI 분석 결과</h2>
        <div class="recommend-banner">추천 ${a.recommended}번</div>
        <div class="result-grid">${probs}</div>
        <div class="meta-grid">
          <div class="meta-item"><span class="k">신뢰도</span><span class="v">${a.confidence}%</span></div>
          <div class="meta-item"><span class="k">표본</span><span class="v">${a.sample}</span></div>
          <div class="meta-item"><span class="k">최근50판</span><span class="v">${pct(a.recent50Rate, 0)}</span></div>
          <div class="meta-item"><span class="k">전체</span><span class="v">${pct(a.overallRate, 1)}</span></div>
        </div>
        <div class="reason">${a.reason}</div>
        ${engines}
      </section>
    `
  }

  root.innerHTML = `
    <section class="panel">
      <h2>바닥 카드 입력</h2>
      <div class="slots">${slots}</div>
      <div class="pad">${pad}</div>
      <div class="actions">
        <button type="button" class="btn btn-ghost" id="btn-undo">UNDO</button>
        <button type="button" class="btn btn-danger" id="btn-clear">CLEAR</button>
      </div>
      <p class="hint">숫자 3번만 누르면 즉시 분석합니다.</p>
    </section>
    ${analysisHtml}
    <section class="panel">
      <h2>결과 입력</h2>
      <div class="winner-pad">
        <button type="button" data-win="1" ${filled ? '' : 'disabled'}>①</button>
        <button type="button" data-win="2" ${filled ? '' : 'disabled'}>②</button>
        <button type="button" data-win="3" ${filled ? '' : 'disabled'}>③</button>
      </div>
      <p class="hint">승리한 위치를 누르면 저장되며 AI가 즉시 재학습합니다.</p>
    </section>
  `

  root.querySelectorAll<HTMLButtonElement>('[data-num]').forEach((btn) => {
    btn.addEventListener('click', () => pushCard(Number(btn.dataset.num) as CardNumber))
  })
  root.querySelector('#btn-undo')?.addEventListener('click', undo)
  root.querySelector('#btn-clear')?.addEventListener('click', clearInput)
  root.querySelectorAll<HTMLButtonElement>('[data-win]').forEach((btn) => {
    btn.addEventListener('click', () => submitWinner(Number(btn.dataset.win) as Position))
  })
}

function renderStats(root: HTMLElement): void {
  const records = state.records
  const nums = numberWinRates(records)
  const pos = positionWinRates(records)
  const combos = topCombos(records, 25)
  const recent = recentRates(records)
  const header = getHeaderStats(records)
  const q = state.search.trim().toLowerCase()

  const filtered = records
    .slice()
    .reverse()
    .filter((r) => {
      if (!q) return true
      const hay = `${r.cards.join(' ')} ${r.winner} ${r.recommended ?? ''} ${r.id}`.toLowerCase()
      return hay.includes(q)
    })
    .slice(0, 200)

  root.innerHTML = `
    <section class="panel">
      <h2>요약</h2>
      <div class="meta-grid">
        <div class="meta-item"><span class="k">표본</span><span class="v">${records.length}</span></div>
        <div class="meta-item"><span class="k">AI 적중</span><span class="v">${pct(header.overallHitRate)}</span></div>
        <div class="meta-item"><span class="k">최근 적중</span><span class="v">${pct(header.recentHitRate)}</span></div>
        <div class="meta-item"><span class="k">신뢰도</span><span class="v">${header.confidence.toFixed(0)}%</span></div>
      </div>
    </section>

    <section class="panel">
      <h2>위치별 승률</h2>
      ${pos
        .map(
          (p) => `
        <div style="margin-bottom:10px">
          <div class="meta-item"><span class="k">${p.pos}번</span><span class="v">${pct(p.rate)} (${p.total})</span></div>
          <div class="bar"><i style="width:${(p.rate * 100).toFixed(1)}%"></i></div>
        </div>`,
        )
        .join('')}
    </section>

    <section class="panel">
      <h2>숫자별 승률</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>숫자</th><th>승률</th><th>표본</th></tr></thead>
          <tbody>
            ${nums
              .map(
                (n) =>
                  `<tr><td>${n.n}</td><td>${pct(n.rate)}</td><td>${n.total}</td></tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h2>최근 승률 (AI 적중)</h2>
      ${recent
        .map(
          (r) =>
            `<div class="meta-item" style="margin-bottom:6px"><span class="k">${r.label}</span><span class="v">${pct(r.rate)} · ${r.n}판</span></div>`,
        )
        .join('')}
      <div class="meta-item"><span class="k">전체</span><span class="v">${pct(header.overallHitRate)}</span></div>
    </section>

    <section class="panel">
      <h2>조합별 승률 (상위)</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>조합</th><th>표본</th><th>유리</th><th>1/2/3</th></tr></thead>
          <tbody>
            ${
              combos.length
                ? combos
                    .map((c) => {
                      const rates = c.wins.map((w) =>
                        c.total ? ((w / c.total) * 100).toFixed(0) : '0',
                      )
                      return `<tr><td>${c.key}</td><td>${c.total}</td><td>${c.best}번</td><td>${rates.join('/')}</td></tr>`
                    })
                    .join('')
                : '<tr><td colspan="4">데이터 없음</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h2>데이터 검색</h2>
      <input class="search" id="stats-search" type="search" placeholder="숫자·위치·ID 검색" value="${escapeAttr(state.search)}" />
      <div class="table-wrap">
        <table>
          <thead><tr><th>카드</th><th>승</th><th>추천</th><th>적중</th><th>시간</th></tr></thead>
          <tbody>
            ${
              filtered.length
                ? filtered
                    .map((r) => {
                      const hit =
                        r.hit === null ? '—' : r.hit ? '✓' : '✗'
                      const t = new Date(r.createdAt).toLocaleString('ko-KR', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      return `<tr><td>${r.cards.join('-')}</td><td>${r.winner}</td><td>${r.recommended ?? '—'}</td><td>${hit}</td><td>${t}</td></tr>`
                    })
                    .join('')
                : '<tr><td colspan="5">결과 없음</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </section>
  `

  const search = root.querySelector<HTMLInputElement>('#stats-search')
  search?.addEventListener('input', () => {
    state.search = search.value
    renderStats(root)
    // keep focus
    const again = root.querySelector<HTMLInputElement>('#stats-search')
    again?.focus()
    if (again) {
      const len = again.value.length
      again.setSelectionRange(len, len)
    }
  })
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function renderData(root: HTMLElement): void {
  root.innerHTML = `
    <section class="panel">
      <h2>데이터 관리</h2>
      <p class="hint" style="margin-top:0;margin-bottom:12px">
        모든 데이터는 이 기기 브라우저에만 저장됩니다. 자동 저장 · 자동 백업됩니다.
      </p>
      <div class="data-actions">
        <button type="button" class="btn btn-gold" id="export-csv">CSV 내보내기</button>
        <button type="button" class="btn btn-ghost" id="import-csv">CSV 가져오기</button>
        <button type="button" class="btn btn-gold" id="export-bak">백업 (JSON)</button>
        <button type="button" class="btn btn-ghost" id="import-bak">복원 (JSON)</button>
        <button type="button" class="btn btn-ghost" id="restore-auto">자동백업 복원</button>
        <button type="button" class="btn btn-danger" id="reset-all">초기화</button>
      </div>
      <input type="file" id="file-csv" accept=".csv,text/csv" class="hidden" />
      <input type="file" id="file-bak" accept=".json,application/json" class="hidden" />
      <p class="hint">현재 저장: ${state.records.length}건</p>
    </section>

    <section class="panel">
      <h2>홈 화면 설치 (iPhone)</h2>
      <ol class="hint" style="padding-left:18px;margin:0">
        <li>Safari로 이 페이지를 엽니다.</li>
        <li>공유 버튼(□↑)을 탭합니다.</li>
        <li>「홈 화면에 추가」를 선택합니다.</li>
        <li>추가 후 아이콘으로 앱처럼 실행합니다.</li>
      </ol>
    </section>
  `

  const fileCsv = root.querySelector<HTMLInputElement>('#file-csv')!
  const fileBak = root.querySelector<HTMLInputElement>('#file-bak')!

  root.querySelector('#export-csv')?.addEventListener('click', () => {
    downloadText(
      `pick-ai-${Date.now()}.csv`,
      recordsToCsv(state.records),
      'text/csv;charset=utf-8',
    )
    showFlash('CSV 내보내기 완료')
  })

  root.querySelector('#import-csv')?.addEventListener('click', () => fileCsv.click())
  fileCsv.addEventListener('change', async () => {
    const file = fileCsv.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const incoming = csvToRecords(text)
      if (!incoming.length) throw new Error('가져올 행이 없습니다.')
      const existing = loadRecords()
      const seen = new Set(existing.map((r) => r.id))
      let added = 0
      for (const r of incoming) {
        if (seen.has(r.id)) continue
        existing.push(r)
        seen.add(r.id)
        added++
      }
      existing.sort((a, b) => a.createdAt - b.createdAt)
      saveRecords(existing)
      refreshRecords()
      showFlash(`${added}건 가져오기 완료`)
      render()
    } catch (e) {
      showFlash(e instanceof Error ? e.message : '가져오기 실패')
    } finally {
      fileCsv.value = ''
    }
  })

  root.querySelector('#export-bak')?.addEventListener('click', () => {
    downloadText(
      `pick-ai-backup-${Date.now()}.json`,
      exportBackupJson(),
      'application/json',
    )
    showFlash('백업 완료')
  })

  root.querySelector('#import-bak')?.addEventListener('click', () => fileBak.click())
  fileBak.addEventListener('change', async () => {
    const file = fileBak.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const added = importBackupJson(text)
      refreshRecords()
      showFlash(`${added}건 복원`)
      render()
    } catch (e) {
      showFlash(e instanceof Error ? e.message : '복원 실패')
    } finally {
      fileBak.value = ''
    }
  })

  root.querySelector('#restore-auto')?.addEventListener('click', () => {
    const n = restoreFromAutoBackup()
    refreshRecords()
    showFlash(n ? `${n}건 자동백업 복원` : '자동백업 없음')
    render()
  })

  root.querySelector('#reset-all')?.addEventListener('click', () => {
    if (!confirm('모든 학습 데이터를 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return
    clearRecords()
    refreshRecords()
    clearInput()
    showFlash('초기화 완료')
    render()
  })
}

function renderNav(root: HTMLElement): void {
  root.innerHTML = `
    <nav class="nav">
      <button type="button" data-view="play" class="${state.view === 'play' ? 'active' : ''}">분석</button>
      <button type="button" data-view="stats" class="${state.view === 'stats' ? 'active' : ''}">통계</button>
      <button type="button" data-view="data" class="${state.view === 'data' ? 'active' : ''}">데이터</button>
    </nav>
  `
  root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view as View
      render()
    })
  })
}

function render(): void {
  const app = document.getElementById('app')
  if (!app) return

  app.innerHTML = `
    <div id="header-root"></div>
    <div id="view-root"></div>
    <div id="nav-root"></div>
  `

  renderHeader(app.querySelector('#header-root')!)
  const view = app.querySelector<HTMLElement>('#view-root')!
  if (state.view === 'play') renderPlay(view)
  else if (state.view === 'stats') renderStats(view)
  else renderData(view)
  renderNav(app.querySelector('#nav-root')!)
}

function boot(): void {
  refreshRecords()
  // 자동 복원: 메인 키가 비어 있고 백업이 있으면 복원
  if (state.records.length === 0) {
    const n = restoreFromAutoBackup()
    if (n) refreshRecords()
  }
  render()
}

boot()

if ('serviceWorker' in navigator) {
  // vite-plugin-pwa virtual module
  void import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({ immediate: true })
    })
    .catch(() => {
      /* ignore in non-PWA contexts */
    })
}
