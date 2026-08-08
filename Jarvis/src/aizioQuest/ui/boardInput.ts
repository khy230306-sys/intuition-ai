/**
 * Board pointer input — event delegation on the board element.
 * CRITICAL: never remount the board DOM during an active pointer gesture.
 */

import { BOARD_SIZE, areAdjacent, type Move } from '../match3/board'

export type CellPos = { r: number; c: number }

export type BoardInputHandlers = {
  canInteract: () => boolean
  onSwap: (a: CellPos, b: CellPos) => void
  onSelect: (cell: CellPos | null) => void
  /** Optional: restrict tutorial to one legal move */
  forcedMove?: () => Move | null
}

type Gesture = {
  pointerId: number
  start: CellPos
  x: number
  y: number
  moved: boolean
}

const SWIPE_PX = 22

export function attachBoardInput(boardEl: HTMLElement, handlers: BoardInputHandlers): () => void {
  let gesture: Gesture | null = null
  let selected: CellPos | null = null

  const gemAt = (el: EventTarget | null): HTMLElement | null => {
    if (!(el instanceof Element)) return null
    return el.closest('.aq-gem') as HTMLElement | null
  }

  const posOf = (gem: HTMLElement): CellPos => ({
    r: Number(gem.dataset.r),
    c: Number(gem.dataset.c),
  })

  const paintSelect = (cell: CellPos | null) => {
    selected = cell
    boardEl.querySelectorAll('.aq-gem.selected').forEach((g) => g.classList.remove('selected'))
    if (cell) {
      boardEl
        .querySelector(`.aq-gem[data-r="${cell.r}"][data-c="${cell.c}"]`)
        ?.classList.add('selected')
    }
    handlers.onSelect(cell)
  }

  const tryIssueSwap = (a: CellPos, b: CellPos) => {
    if (!areAdjacent(a, b)) return false
    if (a.r < 0 || a.c < 0 || b.r < 0 || b.c < 0) return false
    if (a.r >= BOARD_SIZE || a.c >= BOARD_SIZE || b.r >= BOARD_SIZE || b.c >= BOARD_SIZE) return false
    const forced = handlers.forcedMove?.()
    if (forced) {
      const ok =
        (forced.a.r === a.r && forced.a.c === a.c && forced.b.r === b.r && forced.b.c === b.c) ||
        (forced.a.r === b.r && forced.a.c === b.c && forced.b.r === a.r && forced.b.c === a.c)
      if (!ok) {
        // Still notify UI so it can toast / shake — pass through as swap attempt
        // but mark as non-forced rejection by not calling onSwap.
        paintSelect(forced.a)
        return false
      }
    }
    paintSelect(null)
    handlers.onSwap(a, b)
    return true
  }

  const onDown = (ev: PointerEvent) => {
    if (!handlers.canInteract()) return
    const gem = gemAt(ev.target)
    if (!gem) return
    ev.preventDefault()
    const pos = posOf(gem)
    gesture = { pointerId: ev.pointerId, start: pos, x: ev.clientX, y: ev.clientY, moved: false }
    try {
      boardEl.setPointerCapture(ev.pointerId)
    } catch {
      /* ignore */
    }

    // Tap-to-select / tap-adjacent-swap (do not remount DOM)
    if (selected && !(selected.r === pos.r && selected.c === pos.c) && areAdjacent(selected, pos)) {
      const from = selected
      gesture = null
      tryIssueSwap(from, pos)
      return
    }
    paintSelect(pos)
  }

  const onMove = (ev: PointerEvent) => {
    if (!gesture || gesture.pointerId !== ev.pointerId) return
    const dx = ev.clientX - gesture.x
    const dy = ev.clientY - gesture.y
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) gesture.moved = true
    ev.preventDefault()
  }

  const onUp = (ev: PointerEvent) => {
    if (!gesture || gesture.pointerId !== ev.pointerId) return
    ev.preventDefault()
    const g = gesture
    gesture = null
    try {
      boardEl.releasePointerCapture(ev.pointerId)
    } catch {
      /* ignore */
    }
    if (!handlers.canInteract()) return

    const dx = ev.clientX - g.x
    const dy = ev.clientY - g.y
    if (Math.abs(dx) >= SWIPE_PX || Math.abs(dy) >= SWIPE_PX) {
      let tr = g.start.r
      let tc = g.start.c
      if (Math.abs(dx) > Math.abs(dy)) tc += dx > 0 ? 1 : -1
      else tr += dy > 0 ? 1 : -1
      tryIssueSwap(g.start, { r: tr, c: tc })
      return
    }

    // Short tap: keep selection (already set on down). Second tap handled on next down.
    if (!g.moved) {
      paintSelect(g.start)
    }
  }

  const onCancel = (ev: PointerEvent) => {
    if (!gesture || gesture.pointerId !== ev.pointerId) return
    gesture = null
    try {
      boardEl.releasePointerCapture(ev.pointerId)
    } catch {
      /* ignore */
    }
  }

  boardEl.addEventListener('pointerdown', onDown)
  boardEl.addEventListener('pointermove', onMove)
  boardEl.addEventListener('pointerup', onUp)
  boardEl.addEventListener('pointercancel', onCancel)

  return () => {
    boardEl.removeEventListener('pointerdown', onDown)
    boardEl.removeEventListener('pointermove', onMove)
    boardEl.removeEventListener('pointerup', onUp)
    boardEl.removeEventListener('pointercancel', onCancel)
  }
}

/** Prefer a rightward horizontal tutorial move when available. */
export function pickTutorialMove(moves: Move[]): Move | null {
  if (!moves.length) return null
  const right = moves.find((m) => m.a.r === m.b.r && m.b.c === m.a.c + 1)
  if (right) return right
  const down = moves.find((m) => m.a.c === m.b.c && m.b.r === m.a.r + 1)
  return down || moves[0]!
}

export function dirLabel(move: Move): string {
  if (move.a.r === move.b.r) return move.b.c > move.a.c ? '오른쪽' : '왼쪽'
  return move.b.r > move.a.r ? '아래' : '위'
}
