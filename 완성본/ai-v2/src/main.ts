import './style.css'
import { pathToString, predictNext, toBpRoad } from './engine'
import { SUCCESS_BOARD_SIZE } from './engine/constants'
import { importRoadWalkForward } from './importWalkForward'
import { judgePrediction, successStats } from './judgment'
import { parseRoadText } from './roadParse'
import { clearStore, loadStore, saveStore, type AppStore } from './storage'
import type { Outcome, PendingPrediction } from './types'
import { extractPatternFromImage } from './vision'

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

        <div class="header-actions">
          <button id="undoBtn" class="small-button" type="button">
            되돌리기
          </button>
          <button id="resetBtn" class="small-button danger" type="button">
            전체 초기화
          </button>
        </div>
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

      <button id="importRoadBtn" class="import-button" type="button">
        대로표 가져오기
      </button>
      <p class="import-hint">
        방 화면 스크린샷은 「사진첩에서 선택」으로 가져오세요. (Evolution 창 자동 읽기는 불가)
      </p>
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
  </main>

  <div id="importModal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="importTitle">
    <div class="modal-card">
      <p class="section-kicker">ROAD IMPORT</p>
      <h2 id="importTitle">대로표 가져오기</h2>
      <p class="modal-desc">
        iPhone에서 Evolution 방 화면을 캡처한 뒤 사진을 고르거나,<br />
        P B B P … 텍스트를 붙여넣으세요.
      </p>

      <div class="file-row">
        <label class="file-label">
          <input id="roadImageInput" type="file" accept="image/*" />
          사진첩에서 선택
        </label>
        <label class="file-label secondary">
          <input id="roadCameraInput" type="file" accept="image/*" capture="environment" />
          카메라 촬영
        </label>
      </div>

      <textarea
        id="roadTextInput"
        class="road-textarea"
        rows="4"
        placeholder="예: P B B B P B P P 또는 PLAYER BANKER …"
      ></textarea>

      <p id="importPreview" class="import-preview">미리보기 없음</p>

      <div class="modal-actions">
        <button id="importCancelBtn" class="small-button" type="button">취소</button>
        <button id="importApplyBtn" class="small-button primary" type="button">가져오기 적용</button>
      </div>
    </div>
  </div>
`

let store: AppStore = loadStore()
let pending: PendingPrediction | null = null
let importDraft: Outcome[] = []

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
  if (actual === 'P' || actual === 'B') {
    const judged = judgePrediction(pending, actual)
    if (judged) store.predictionRecords.push(judged)
  }
  store.history.push(actual)
  saveStore(store)
  renderAll()
}

function setImportPreview(outcomes: Outcome[], note = ''): void {
  importDraft = outcomes
  const el = document.querySelector('#importPreview')
  if (!el) return
  if (outcomes.length === 0) {
    el.textContent = note || '미리보기 없음'
    return
  }
  const head = outcomes.slice(0, 40).join(' ')
  const more = outcomes.length > 40 ? ` …(+${outcomes.length - 40})` : ''
  el.textContent = `${note ? note + ' · ' : ''}${outcomes.length}판 · ${head}${more}`
}

function openImportModal(): void {
  document.querySelector('#importModal')?.classList.remove('hidden')
  const text = document.querySelector('#roadTextInput') as HTMLTextAreaElement | null
  if (text) text.value = ''
  const file = document.querySelector('#roadImageInput') as HTMLInputElement | null
  if (file) file.value = ''
  const cam = document.querySelector('#roadCameraInput') as HTMLInputElement | null
  if (cam) cam.value = ''
  setImportPreview([])
}

function closeImportModal(): void {
  document.querySelector('#importModal')?.classList.add('hidden')
  importDraft = []
}

function applyImport(): void {
  if (importDraft.length === 0) {
    alert('가져올 대로표가 없습니다. 텍스트를 붙여넣거나 스크린샷을 선택하세요.')
    return
  }
  if (
    !confirm(
      `대로표 ${importDraft.length}판을 가져오고, 과거 기준으로 픽·성공/실패를 다시 계산할까요?\n(현재 기록은 교체됩니다)`,
    )
  ) {
    return
  }

  const result = importRoadWalkForward(importDraft)
  store = {
    history: result.history,
    predictionRecords: result.predictionRecords,
    patternMemory: store.patternMemory,
  }
  pending = result.pending
  saveStore(store)
  closeImportModal()
  renderAll()
  alert(
    `가져오기 완료\n판수 ${result.history.length}\n판정 ${result.judgedCount} · 적중 ${result.wins}`,
  )
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

document.querySelector('#importRoadBtn')?.addEventListener('click', () => openImportModal())
document.querySelector('#importCancelBtn')?.addEventListener('click', () => closeImportModal())
document.querySelector('#importApplyBtn')?.addEventListener('click', () => applyImport())

document.querySelector('#roadTextInput')?.addEventListener('input', (e) => {
  const value = (e.target as HTMLTextAreaElement).value
  setImportPreview(parseRoadText(value), '텍스트')
})

async function handleRoadImageFile(file: File, label: string): Promise<void> {
  const preview = document.querySelector('#importPreview')
  if (preview) preview.textContent = '이미지 분석 중…'
  try {
    const outcomes = await extractPatternFromImage(file)
    const textBox = document.querySelector('#roadTextInput') as HTMLTextAreaElement | null
    if (textBox) textBox.value = outcomes.join(' ')
    setImportPreview(outcomes, label)
    if (outcomes.length === 0) {
      alert('대로표를 인식하지 못했습니다. 더 크게 찍거나 텍스트로 붙여넣어 주세요.')
    }
  } catch (err) {
    console.error(err)
    setImportPreview([])
    alert('이미지 분석에 실패했습니다.')
  }
}

document.querySelector('#roadImageInput')?.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) await handleRoadImageFile(file, '사진첩')
})

document.querySelector('#roadCameraInput')?.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) await handleRoadImageFile(file, '카메라')
})

document.querySelector('#importModal')?.addEventListener('click', (e) => {
  if (e.target === document.querySelector('#importModal')) closeImportModal()
})

if (import.meta.env.DEV) {
  ;(window as unknown as { __intuitionDebug?: () => unknown }).__intuitionDebug = () =>
    predictNext(store.history, {
      debug: true,
      predictionRecords: store.predictionRecords,
    }).debug
}

// Prevent double-tap / double-click zoom on mobile browsers
document.addEventListener(
  'dblclick',
  (e) => {
    e.preventDefault()
  },
  { passive: false },
)

let lastTouchEnd = 0
document.addEventListener(
  'touchend',
  (e) => {
    const now = Date.now()
    if (now - lastTouchEnd <= 300) e.preventDefault()
    lastTouchEnd = now
  },
  { passive: false },
)

renderAll()
