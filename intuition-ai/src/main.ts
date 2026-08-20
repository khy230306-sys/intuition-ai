import './style.css'
import { pathToString, predictNext, toBpRoad } from './engine'
import { SUCCESS_BOARD_SIZE } from './engine/constants'
import { judgePrediction, successStats } from './judgment'
import { clearStore, loadStore, saveStore, type AppStore } from './storage'
import type { Outcome, PendingPrediction } from './types'

const app = document.querySelector('#app')
if (!app) throw new Error('#app missing')

app.innerHTML = `
  <main class="app-shell">
    <header class="app-header">
      <p class="eyebrow">AUTO PATTERN LEARNING ENGINE</p>
      <h1>Intuition AI</h1>
      <p class="subtitle">패턴을 자동 학습하고 다음 픽을 출력합니다.</p>
    </header>

    <section class="card prediction-card">
      <p class="section-kicker">NEXT AI PICK</p>
      <h2>다음 예상 픽</h2>

      <div id="aiPick" class="ai-pick player-pick">
        PLAYER
      </div>

      <div class="prediction-info">
        <span>AI 신뢰도</span>
        <strong id="confidenceScore">50%</strong>
      </div>

      <p id="predictionReason" class="prediction-reason">
        결과를 입력하면 자동 분석을 시작합니다.
      </p>

      <div class="success-board" aria-label="AI PICK 성공 실패">
        <p class="success-board-title">AI PICK 성공/실패</p>
        <div id="successMarks" class="success-marks"></div>
        <p id="successSummary" class="success-summary">아직 판정 기록이 없습니다.</p>
      </div>
    </section>

    <section class="card">
      <div class="section-title-row">
        <div>
          <p class="section-kicker">RECENT FLOW</p>
          <h2>최근 20판</h2>
        </div>

        <button id="undoBtn" class="small-button" type="button">
          되돌리기
        </button>
      </div>

      <div id="historyBoard" class="history-board"></div>

      <p class="section-kicker">ACTUAL RESULT</p>

      <div class="result-grid">
        <button id="playerBtn" class="result-button player" type="button">
          PLAYER
        </button>

        <button id="bankerBtn" class="result-button banker" type="button">
          BANKER
        </button>

        <button id="tieBtn" class="result-button tie" type="button">
          TIE
        </button>
      </div>
    </section>

    <section class="card">
      <p class="section-kicker">AUTO LEARNING</p>
      <h2>자동 학습 현황</h2>

      <div class="stats-grid">
        <div class="stat-box">
          <strong id="totalPredictions">0</strong>
          <span>AI 판정</span>
        </div>

        <div class="stat-box">
          <strong id="winPredictions">0</strong>
          <span>적중</span>
        </div>

        <div class="stat-box">
          <strong id="aiAccuracy">0%</strong>
          <span>적중률</span>
        </div>
      </div>

      <div id="learningStatus" class="pending-status">
        자동 학습 준비
      </div>
    </section>

    <button id="resetBtn" class="reset-button" type="button">
      전체 기록 초기화
    </button>
  </main>
`

let store: AppStore = loadStore()
let pending: PendingPrediction | null = null

function createPending(): PendingPrediction {
  const prediction = predictNext(store.history, {
    debug: Boolean(import.meta.env.DEV),
    predictionRecords: store.predictionRecords,
  })
  const bp = toBpRoad(store.history)
  pending = {
    pick: prediction.pick,
    confidence: prediction.confidence,
    reason: prediction.reason,
    pattern: bp.slice(-20),
    createdAt: new Date().toISOString(),
    expectedPath: prediction.expectedPath ? pathToString(prediction.expectedPath.path) : null,
    alternativePath: prediction.alternativePath
      ? pathToString(prediction.alternativePath.path)
      : null,
    hiddenPath: prediction.hiddenPath ? pathToString(prediction.hiddenPath.path) : null,
    matchCount: prediction.matchCount,
    nextSideAgreement: prediction.nextSideAgreement,
  }
  return pending
}

function renderHistory(): void {
  const board = document.querySelector('#historyBoard')
  if (!board) return
  const recent = store.history.slice(-20)
  if (recent.length === 0) {
    board.innerHTML = `<span class="empty-text">아직 기록이 없습니다.</span>`
    return
  }
  board.innerHTML = recent
    .map((x) => {
      const cls = x === 'P' ? 'player-dot' : x === 'B' ? 'banker-dot' : 'tie-dot'
      return `<span class="history-dot ${cls}">${x}</span>`
    })
    .join('')
}

function renderPrediction(): void {
  const current = createPending()
  const pickEl = document.querySelector('#aiPick')
  const confEl = document.querySelector('#confidenceScore')
  const reasonEl = document.querySelector('#predictionReason')
  if (!pickEl || !confEl || !reasonEl) return

  confEl.textContent = `${current.confidence}%`
  reasonEl.textContent = current.reason
  if (current.pick === 'P') {
    pickEl.textContent = 'PLAYER'
    pickEl.className = 'ai-pick player-pick'
  } else {
    pickEl.textContent = 'BANKER'
    pickEl.className = 'ai-pick banker-pick'
  }
}

function renderSuccessBoard(): void {
  const marksEl = document.querySelector('#successMarks')
  const summaryEl = document.querySelector('#successSummary')
  if (!marksEl || !summaryEl) return

  const { marks, wins, losses, rate } = successStats(
    store.predictionRecords,
    SUCCESS_BOARD_SIZE,
  )

  const cells: string[] = []
  for (let i = 0; i < SUCCESS_BOARD_SIZE; i += 1) {
    const mark = marks[i]
    if (!mark) {
      cells.push(`<span class="success-mark empty">·</span>`)
    } else if (mark === 'O') {
      cells.push(`<span class="success-mark win">O</span>`)
    } else {
      cells.push(`<span class="success-mark lose">X</span>`)
    }
  }
  marksEl.innerHTML = cells.join('')

  if (marks.length === 0) {
    summaryEl.textContent = '아직 판정 기록이 없습니다.'
  } else {
    summaryEl.innerHTML = `최근 ${marks.length}회<br><strong>${wins}승 ${losses}패 · ${rate.toFixed(1)}%</strong>`
  }
}

function renderLearning(): void {
  const judged = store.predictionRecords.filter((r) => r.result === 'WIN' || r.result === 'LOSE')
  const wins = judged.filter((r) => r.result === 'WIN').length
  const accuracy = judged.length === 0 ? 0 : Math.round((wins / judged.length) * 100)

  const totalEl = document.querySelector('#totalPredictions')
  const winEl = document.querySelector('#winPredictions')
  const accEl = document.querySelector('#aiAccuracy')
  const statusEl = document.querySelector('#learningStatus')
  if (!totalEl || !winEl || !accEl || !statusEl) return

  totalEl.textContent = String(judged.length)
  winEl.textContent = String(wins)
  accEl.textContent = `${accuracy}%`

  const bpLen = toBpRoad(store.history).length
  statusEl.textContent =
    bpLen === 0
      ? '새 패턴 자동 수집 중'
      : `Future Road · BP ${bpLen}판 · 판정 ${judged.length}건`
}

function renderAll(): void {
  renderHistory()
  renderPrediction()
  renderSuccessBoard()
  renderLearning()
}

function recordActual(actual: Outcome): void {
  // Judge previous prediction before appending (TIE skips judgment, keeps pending)
  if (actual === 'P' || actual === 'B') {
    const judged = judgePrediction(pending, actual)
    if (judged) {
      store.predictionRecords.push(judged)
    }
  }

  store.history.push(actual)
  saveStore(store)
  renderAll()
}

document.querySelector('#playerBtn')?.addEventListener('click', () => recordActual('P'))
document.querySelector('#bankerBtn')?.addEventListener('click', () => recordActual('B'))
document.querySelector('#tieBtn')?.addEventListener('click', () => recordActual('T'))

document.querySelector('#undoBtn')?.addEventListener('click', () => {
  if (store.history.length === 0) return
  store.history.pop()
  saveStore(store)
  renderAll()
})

document.querySelector('#resetBtn')?.addEventListener('click', () => {
  if (!confirm('전체 기록과 자동 학습 데이터를 초기화할까요?')) return
  store = clearStore()
  pending = null
  renderAll()
})

// Expose debug helper in development
if (import.meta.env.DEV) {
  ;(window as unknown as { __intuitionDebug?: () => unknown }).__intuitionDebug = () =>
    predictNext(store.history, {
      debug: true,
      predictionRecords: store.predictionRecords,
    }).debug
}

renderAll()
