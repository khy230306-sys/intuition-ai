/** Offline mini-games — no network required. */

export type GameId = 'updown' | 'memory' | 'reaction'

export const GAME_META: Record<GameId, { title: string; blurb: string }> = {
  updown: { title: '업다운', blurb: '1~100 숫자를 맞춰 보세요' },
  memory: { title: '기억력', blurb: '빛나는 순서를 따라 누르세요' },
  reaction: { title: '순발력', blurb: '초록이 되면 즉시 탭!' },
}

const BEST_KEY = 'jarvis.games.best.v1'

export type BestScores = {
  updown: number | null // fewest attempts
  memory: number | null // highest level
  reaction: number | null // best ms (lower better)
}

export function loadBest(): BestScores {
  try {
    const raw = localStorage.getItem(BEST_KEY)
    if (!raw) return { updown: null, memory: null, reaction: null }
    return { updown: null, memory: null, reaction: null, ...JSON.parse(raw) }
  } catch {
    return { updown: null, memory: null, reaction: null }
  }
}

export function saveBest(best: BestScores): void {
  localStorage.setItem(BEST_KEY, JSON.stringify(best))
}

function updateBest(patch: Partial<BestScores>): BestScores {
  const next = { ...loadBest(), ...patch }
  saveBest(next)
  return next
}

// —— Up/Down ——
export type UpdownState = {
  secret: number
  attempts: number
  status: 'playing' | 'won'
  lastHint: string
}

export function newUpdown(rng = Math.random): UpdownState {
  return {
    secret: 1 + Math.floor(rng() * 100),
    attempts: 0,
    status: 'playing',
    lastHint: '1~100 사이 숫자를 입력하세요',
  }
}

export function guessUpdown(state: UpdownState, n: number): UpdownState {
  if (state.status === 'won') return state
  if (!Number.isFinite(n) || n < 1 || n > 100) {
    return { ...state, lastHint: '1~100 사이 정수만 입력해 주세요' }
  }
  const attempts = state.attempts + 1
  if (n === state.secret) {
    const best = loadBest()
    if (best.updown == null || attempts < best.updown) updateBest({ updown: attempts })
    return {
      ...state,
      attempts,
      status: 'won',
      lastHint: `정답! ${attempts}번 만에 맞혔습니다`,
    }
  }
  return {
    ...state,
    attempts,
    lastHint: n < state.secret ? `${n} → 업!` : `${n} → 다운!`,
  }
}

// —— Memory (Simon) ——
export type MemoryState = {
  sequence: number[]
  inputIndex: number
  phase: 'idle' | 'demo' | 'input' | 'fail' | 'clear'
  level: number
  flash: number | null
}

export function newMemory(): MemoryState {
  return {
    sequence: [],
    inputIndex: 0,
    phase: 'idle',
    level: 0,
    flash: null,
  }
}

export function memoryStartRound(state: MemoryState, rng = Math.random): MemoryState {
  const nextPad = Math.floor(rng() * 4)
  const sequence = [...state.sequence, nextPad]
  return {
    sequence,
    inputIndex: 0,
    phase: 'demo',
    level: sequence.length,
    flash: null,
  }
}

export function memoryTap(state: MemoryState, pad: number): MemoryState {
  if (state.phase !== 'input') return state
  const expect = state.sequence[state.inputIndex]
  if (pad !== expect) {
    return { ...state, phase: 'fail', flash: null }
  }
  const inputIndex = state.inputIndex + 1
  if (inputIndex >= state.sequence.length) {
    const best = loadBest()
    if (best.memory == null || state.level > best.memory) updateBest({ memory: state.level })
    return { ...state, inputIndex, phase: 'clear', flash: pad }
  }
  return { ...state, inputIndex, flash: pad }
}

export function memoryBeginInput(state: MemoryState): MemoryState {
  return { ...state, phase: 'input', flash: null, inputIndex: 0 }
}

export async function runMemoryDemo(
  state: MemoryState,
  onFlash: (pad: number | null, next: MemoryState) => void,
  stepMs = 520,
): Promise<MemoryState> {
  let cur: MemoryState = { ...state, phase: 'demo', flash: null }
  onFlash(null, cur)
  await wait(350)
  for (const pad of cur.sequence) {
    cur = { ...cur, flash: pad }
    onFlash(pad, cur)
    await wait(stepMs)
    cur = { ...cur, flash: null }
    onFlash(null, cur)
    await wait(160)
  }
  cur = memoryBeginInput(cur)
  onFlash(null, cur)
  return cur
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// —— Reaction ——
export type ReactionPhase = 'idle' | 'wait' | 'go' | 'early' | 'result'

export type ReactionState = {
  phase: ReactionPhase
  startedAt: number | null
  resultMs: number | null
  waitTimer: number | null
}

export function newReaction(): ReactionState {
  return { phase: 'idle', startedAt: null, resultMs: null, waitTimer: null }
}

export function reactionArm(state: ReactionState, delayMs: number, now = Date.now()): {
  state: ReactionState
  delayMs: number
} {
  return {
    delayMs,
    state: {
      ...state,
      phase: 'wait',
      startedAt: null,
      resultMs: null,
      waitTimer: now + delayMs,
    },
  }
}

export function reactionGo(state: ReactionState, now = Date.now()): ReactionState {
  if (state.phase !== 'wait') return state
  return { ...state, phase: 'go', startedAt: now, waitTimer: null }
}

export function reactionTap(state: ReactionState, now = Date.now()): ReactionState {
  if (state.phase === 'wait') {
    return { ...state, phase: 'early', startedAt: null, resultMs: null, waitTimer: null }
  }
  if (state.phase === 'go' && state.startedAt != null) {
    const resultMs = Math.max(0, now - state.startedAt)
    const best = loadBest()
    if (best.reaction == null || resultMs < best.reaction) updateBest({ reaction: resultMs })
    return { ...state, phase: 'result', resultMs, waitTimer: null }
  }
  return state
}

export function randomReactionDelay(rng = Math.random): number {
  return 1200 + Math.floor(rng() * 2800)
}
