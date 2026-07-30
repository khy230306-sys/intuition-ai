/** Friend arcade leaderboard — local-first QR / paste share. */

import {
  ARCADE_META,
  loadArcadeBest,
  loadArcadeBestLevel,
  type ArcadeId,
} from './arcadeGames'
import { QR_SAFE_CHARS } from './shareKit'

const BOARD_KEY = 'jarvis.arcade.board.v1'
const NAME_KEY = 'jarvis.arcade.playerName.v1'
const PLAYER_ID_KEY = 'jarvis.arcade.playerId.v1'
const CARD_PREFIX = 'JARVIS-ARCADE'

export type ArcadeRankEntry = {
  /** Stable key: `${playerId}:${game}` */
  id: string
  playerId: string
  name: string
  game: ArcadeId
  score: number
  level: number
  at: number
  source: 'self' | 'import'
}

const GAME_IDS = Object.keys(ARCADE_META) as ArcadeId[]

function isArcadeId(v: string): v is ArcadeId {
  return (GAME_IDS as string[]).includes(v)
}

export function getArcadePlayerId(): string {
  try {
    let id = localStorage.getItem(PLAYER_ID_KEY)
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}`
      localStorage.setItem(PLAYER_ID_KEY, id)
    }
    return id
  } catch {
    return 'local-player'
  }
}

export function getArcadePlayerName(): string {
  try {
    return localStorage.getItem(NAME_KEY)?.trim() || '나'
  } catch {
    return '나'
  }
}

export function setArcadePlayerName(raw: string): string {
  const name = raw.trim().slice(0, 16) || '나'
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    /* ignore */
  }
  return name
}

export function loadArcadeBoard(): ArcadeRankEntry[] {
  try {
    const raw = localStorage.getItem(BOARD_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ArcadeRankEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e) =>
        e &&
        typeof e.playerId === 'string' &&
        typeof e.name === 'string' &&
        isArcadeId(String(e.game)) &&
        typeof e.score === 'number' &&
        Number.isFinite(e.score),
    )
  } catch {
    return []
  }
}

function saveArcadeBoard(board: ArcadeRankEntry[]): void {
  localStorage.setItem(BOARD_KEY, JSON.stringify(board))
}

function entryKey(playerId: string, game: ArcadeId): string {
  return `${playerId}:${game}`
}

function isBetter(a: { score: number; level: number; at: number }, b: { score: number; level: number; at: number }): boolean {
  if (a.score !== b.score) return a.score > b.score
  if (a.level !== b.level) return a.level > b.level
  return a.at < b.at
}

/** Upsert one player's best for a game. Keeps higher score. */
export function upsertArcadeEntry(input: {
  playerId: string
  name: string
  game: ArcadeId
  score: number
  level: number
  at?: number
  source: 'self' | 'import'
}): ArcadeRankEntry {
  const board = loadArcadeBoard()
  const id = entryKey(input.playerId, input.game)
  const next: ArcadeRankEntry = {
    id,
    playerId: input.playerId,
    name: input.name.trim().slice(0, 16) || '친구',
    game: input.game,
    score: Math.max(0, Math.floor(input.score)),
    level: Math.max(1, Math.floor(input.level || 1)),
    at: input.at ?? Date.now(),
    source: input.source,
  }
  const idx = board.findIndex((e) => e.id === id)
  if (idx < 0) {
    board.push(next)
  } else {
    const prev = board[idx]
    if (isBetter(next, prev)) {
      board[idx] = { ...next, source: prev.source === 'self' && input.source === 'import' ? 'self' : next.source }
    } else {
      // refresh name if same player
      board[idx] = { ...prev, name: next.name || prev.name }
      return board[idx]
    }
  }
  saveArcadeBoard(board)
  return next
}

/** Pull device bests into the local board under this player's id. */
export function syncSelfBestsToBoard(game?: ArcadeId): void {
  const games = game ? [game] : GAME_IDS
  const best = loadArcadeBest()
  const levels = loadArcadeBestLevel()
  const playerId = getArcadePlayerId()
  const name = getArcadePlayerName()
  for (const g of games) {
    const score = best[g]
    if (score == null) continue
    upsertArcadeEntry({
      playerId,
      name,
      game: g,
      score,
      level: levels[g] ?? 1,
      at: Date.now(),
      source: 'self',
    })
  }
}

export function rankingForGame(game: ArcadeId, limit = 10): ArcadeRankEntry[] {
  syncSelfBestsToBoard(game)
  return loadArcadeBoard()
    .filter((e) => e.game === game)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.level !== a.level) return b.level - a.level
      return a.at - b.at
    })
    .slice(0, limit)
}

export function rankOfPlayer(game: ArcadeId, playerId: string): number | null {
  const ranks = rankingForGame(game, 50)
  const i = ranks.findIndex((e) => e.playerId === playerId)
  return i < 0 ? null : i + 1
}

export type ScoreCard = {
  v: 1
  game: ArcadeId
  score: number
  level: number
  name: string
  playerId: string
  at: number
}

/** Compact pipe card for QR + paste. */
export function encodeScoreCard(card: ScoreCard): string {
  const safeName = card.name.replace(/\|/g, ' ').trim().slice(0, 16) || '친구'
  const safeId = card.playerId.replace(/\|/g, '').slice(0, 36)
  return [CARD_PREFIX, 'v1', card.game, card.score, card.level, safeName, safeId, card.at].join('|')
}

/** Pull the pipe payload out of a full Kakao / share message. */
export function extractScoreCardPayload(raw: string): string {
  const text = String(raw || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
  if (!text) return ''

  // Prefer an explicit line containing the card
  for (const line of text.split(/\r?\n/)) {
    const idx = line.indexOf(`${CARD_PREFIX}|`)
    if (idx >= 0) {
      // Stop at whitespace after the card (Kakao sometimes appends junk)
      return line.slice(idx).trim().split(/\s+/)[0]
    }
  }

  // Fallback: search anywhere in the blob
  const m = text.match(
    /JARVIS-ARCADE\|v1\|[A-Za-z0-9_-]+\|\d+\|\d+\|[^|\n]{0,32}\|[A-Za-z0-9._-]{2,64}\|\d{10,}/,
  )
  return m ? m[0] : text
}

export function parseScoreCard(raw: string): { ok: true; card: ScoreCard } | { ok: false; message: string } {
  const text = extractScoreCardPayload(raw)
  if (!text) return { ok: false, message: '기록 코드를 붙여넣어 주세요.' }

  // JSON form
  if (text.startsWith('{')) {
    try {
      const j = JSON.parse(text) as Partial<ScoreCard> & { t?: string; g?: string; s?: number; l?: number; n?: string; id?: string }
      const game = (j.game || j.g) as string
      const score = j.score ?? j.s
      const level = j.level ?? j.l ?? 1
      const name = j.name || j.n || '친구'
      const playerId = j.playerId || j.id
      if (!game || !isArcadeId(game) || typeof score !== 'number' || !playerId) {
        return { ok: false, message: '기록 형식이 올바르지 않습니다.' }
      }
      return {
        ok: true,
        card: {
          v: 1,
          game,
          score: Math.floor(score),
          level: Math.max(1, Math.floor(Number(level) || 1)),
          name: String(name).slice(0, 16),
          playerId: String(playerId).slice(0, 36),
          at: typeof j.at === 'number' ? j.at : Date.now(),
        },
      }
    } catch {
      return { ok: false, message: 'JSON 기록을 읽지 못했습니다.' }
    }
  }

  const parts = text.split('|')
  if (parts[0] !== CARD_PREFIX || parts[1] !== 'v1' || parts.length < 8) {
    return { ok: false, message: 'JARVIS 아케이드 기록 코드가 아닙니다. 공유 문구 전체를 붙여넣어도 됩니다.' }
  }
  const game = parts[2]
  const score = Number(parts[3])
  const level = Number(parts[4])
  const name = parts[5]
  const playerId = parts[6]
  const at = Number(parts[7])
  if (!isArcadeId(game) || !Number.isFinite(score) || !playerId) {
    return { ok: false, message: '기록 필드를 확인하지 못했습니다.' }
  }
  return {
    ok: true,
    card: {
      v: 1,
      game,
      score: Math.floor(score),
      level: Math.max(1, Math.floor(Number.isFinite(level) ? level : 1)),
      name: (name || '친구').slice(0, 16),
      playerId: playerId.slice(0, 36),
      at: Number.isFinite(at) ? at : Date.now(),
    },
  }
}

export function buildMyScoreCard(game: ArcadeId): { card: ScoreCard; payload: string; message: string } | null {
  syncSelfBestsToBoard(game)
  const best = loadArcadeBest()[game]
  if (best == null) return null
  const level = loadArcadeBestLevel()[game] ?? 1
  const card: ScoreCard = {
    v: 1,
    game,
    score: best,
    level,
    name: getArcadePlayerName(),
    playerId: getArcadePlayerId(),
    at: Date.now(),
  }
  const payload = encodeScoreCard(card)
  const title = ARCADE_META[game].title
  const message = [
    `JARVIS 아케이드 기록 · ${title}`,
    `${card.name} · Lv.${card.level} · SCORE ${card.score}`,
    '',
    '친구 기기 게임 탭 → 친구 기록 받기 에 붙여넣기',
    payload,
  ].join('\n')
  if (payload.length > QR_SAFE_CHARS) {
    /* still share text; QR uses payload alone which is short */
  }
  return { card, payload, message }
}

export function importScoreCard(raw: string):
  | { ok: true; entry: ArcadeRankEntry; rank: number; message: string }
  | { ok: false; message: string } {
  const parsed = parseScoreCard(raw)
  if (!parsed.ok) return parsed
  const { card } = parsed
  if (card.playerId === getArcadePlayerId()) {
    // allow re-import of own card as self sync
    upsertArcadeEntry({
      playerId: card.playerId,
      name: card.name,
      game: card.game,
      score: card.score,
      level: card.level,
      at: card.at,
      source: 'self',
    })
  } else {
    upsertArcadeEntry({
      playerId: card.playerId,
      name: card.name,
      game: card.game,
      score: card.score,
      level: card.level,
      at: card.at,
      source: 'import',
    })
  }
  const rank = rankOfPlayer(card.game, card.playerId) ?? 1
  const title = ARCADE_META[card.game].title
  return {
    ok: true,
    entry: loadArcadeBoard().find((e) => e.id === entryKey(card.playerId, card.game))!,
    rank,
    message: `${card.name}의 ${title} 기록(Lv.${card.level} · ${card.score})을 반영했습니다. 현재 ${rank}위.`,
  }
}

export function clearImportedRanks(): void {
  const mine = getArcadePlayerId()
  saveArcadeBoard(loadArcadeBoard().filter((e) => e.playerId === mine))
}
