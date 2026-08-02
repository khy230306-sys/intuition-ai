/** Offline arcade games — canvas, no network. Level-up progression. */

export type ArcadeId = 'breakout' | 'shooter' | 'flappy' | 'dodge' | 'pong' | 'slide' | 'gyeokpa'

export const ARCADE_META: Record<ArcadeId, { title: string; blurb: string }> = {
  shooter: { title: '스페이스', blurb: '격추 12기마다 레벨업 · 미사일 진화 · Lv20+ 와이드 · Lv21부터 속도 완화' },
  flappy: { title: '플래피', blurb: '기둥 12개마다 레벨업 · 간격 축소' },
  dodge: { title: '닷지', blurb: '18개 회피마다 레벨업 · 낙하 가속' },
  pong: { title: '퐁', blurb: '12회 받아칠 때마다 레벨업 · 공 가속' },
  breakout: { title: '벽돌깨기', blurb: '스테이지 2회 클리어마다 레벨업 · 벽돌·속도 증가' },
  slide: { title: '스윽', blurb: '퍼즐 2회 클리어마다 레벨업 · 시간 안에 숫자 맞추기' },
  gyeokpa: {
    title: '스페이스2',
    blurb: '세로 슈팅 · 25스테이지(스테이지당 웨이브 강화) · 보스 · 무기 강화 · 라이프·실드·폭탄',
  },
}

const BEST_KEY = 'jarvis.arcade.best.v1'
const LEVEL_KEY = 'jarvis.arcade.bestLevel.v1'

export type ArcadeBest = {
  breakout: number | null
  shooter: number | null
  flappy: number | null
  dodge: number | null
  pong: number | null
  slide: number | null
  gyeokpa: number | null
}

export type ArcadeBestLevel = ArcadeBest

const EMPTY_BEST: ArcadeBest = {
  breakout: null,
  shooter: null,
  flappy: null,
  dodge: null,
  pong: null,
  slide: null,
  gyeokpa: null,
}

export function loadArcadeBest(): ArcadeBest {
  try {
    const raw = localStorage.getItem(BEST_KEY)
    if (!raw) return { ...EMPTY_BEST }
    const parsed = JSON.parse(raw) as Partial<ArcadeBest>
    return { ...EMPTY_BEST, ...parsed }
  } catch {
    return { ...EMPTY_BEST }
  }
}

export function loadArcadeBestLevel(): ArcadeBestLevel {
  try {
    const raw = localStorage.getItem(LEVEL_KEY)
    if (!raw) return { ...EMPTY_BEST }
    const parsed = JSON.parse(raw) as Partial<ArcadeBestLevel>
    return { ...EMPTY_BEST, ...parsed }
  } catch {
    return { ...EMPTY_BEST }
  }
}

function saveBest(best: ArcadeBest): void {
  localStorage.setItem(BEST_KEY, JSON.stringify(best))
}

function saveBestLevel(levels: ArcadeBestLevel): void {
  localStorage.setItem(LEVEL_KEY, JSON.stringify(levels))
}

function bumpBest(game: ArcadeId, score: number): void {
  const best = loadArcadeBest()
  const cur = best[game]
  if (cur == null || score > cur) {
    best[game] = score
    saveBest(best)
  }
}

function bumpBestLevel(game: ArcadeId, level: number): void {
  const best = loadArcadeBestLevel()
  const cur = best[game]
  if (cur == null || level > cur) {
    best[game] = level
    saveBestLevel(best)
  }
}

/**
 * How many progress units needed to advance one level.
 * Tuned slower so each level lasts longer (more thrill, less rush).
 */
export function unitsPerLevel(id: ArcadeId): number {
  switch (id) {
    case 'breakout':
      return 2 // stage clears
    case 'shooter':
      return 12 // kills
    case 'flappy':
      return 12 // pipes
    case 'dodge':
      return 18 // dodges
    case 'pong':
      return 12 // paddle hits
    case 'slide':
      return 2 // puzzle clears
    case 'gyeokpa':
      return 1 // stage/wave (lengthened separately)
  }
}

/** Level from progress units (1-based). */
export function levelFromUnits(id: ArcadeId, units: number): number {
  return Math.max(1, Math.floor(Math.max(0, units) / unitsPerLevel(id)) + 1)
}

export type ScoreCb = (score: number, level: number) => void

export type ArcadeHandle = {
  stop: () => void
  setDir?: (dx: number, dy: number) => void
  pointer: (x: number, y: number, type: 'down' | 'move' | 'up') => void
  restart: () => void
  getScore: () => number
  getLevel: () => number
  isOver: () => boolean
}

type Loop = {
  running: boolean
  raf: number
  last: number
}

function sizeCanvas(canvas: HTMLCanvasElement): { w: number; h: number; dpr: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  const w = Math.max(280, Math.floor(rect.width) || 320)
  const h = Math.max(320, Math.floor(rect.height) || 400)
  const needW = Math.floor(w * dpr)
  const needH = Math.floor(h * dpr)
  if (canvas.width !== needW || canvas.height !== needH) {
    canvas.width = needW
    canvas.height = needH
  }
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { w, h, dpr }
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  score: number,
  level: number,
  over: boolean,
  title: string,
  opts?: { cleared?: boolean; levelUpUntil?: number },
): void {
  ctx.fillStyle = 'rgba(8,14,22,0.55)'
  ctx.fillRect(0, 0, w, 28)
  ctx.fillStyle = '#5affe8'
  ctx.font = '600 12px IBM Plex Sans KR, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`${title}  Lv.${level}  SCORE ${score}`, 10, 18)
  const now = performance.now()
  if (opts?.levelUpUntil && now < opts.levelUpUntil && !over && !opts.cleared) {
    ctx.fillStyle = 'rgba(0, 210, 190, 0.18)'
    ctx.fillRect(0, h * 0.38, w, 44)
    ctx.fillStyle = '#5affe8'
    ctx.font = '700 20px Orbitron, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`LEVEL ${level}`, w / 2, h * 0.38 + 30)
  }
  if (over || opts?.cleared) {
    ctx.fillStyle = 'rgba(0,0,0,0.62)'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#fff'
    ctx.font = '700 22px Orbitron, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(opts?.cleared ? 'CLEAR!' : 'GAME OVER', w / 2, h * 0.32)
    ctx.fillStyle = '#5affe8'
    ctx.font = '600 14px IBM Plex Sans KR, sans-serif'
    ctx.fillText(`도달 레벨 ${level} · 점수 ${score}`, w / 2, h * 0.32 + 28)
    const bw = 168
    const bh = 48
    const bx = w / 2 - bw / 2
    const by = h * 0.32 + 48
    ctx.fillStyle = '#00d2be'
    ctx.fillRect(bx, by, bw, bh)
    ctx.fillStyle = '#041018'
    ctx.font = '700 16px IBM Plex Sans KR, sans-serif'
    ctx.fillText('다시 시작', w / 2, by + 31)
    ctx.fillStyle = '#9adfd6'
    ctx.font = '500 12px IBM Plex Sans KR, sans-serif'
    ctx.fillText('화면 아무 곳이나 탭', w / 2, by + bh + 22)
  }
}

function noteLevel(
  game: ArcadeId,
  prevLevel: number,
  nextLevel: number,
  score: number,
  onScore?: ScoreCb,
): { level: number; levelUpUntil: number } {
  if (nextLevel > prevLevel) {
    bumpBestLevel(game, nextLevel)
    onScore?.(score, nextLevel)
    return { level: nextLevel, levelUpUntil: performance.now() + 1200 }
  }
  onScore?.(score, nextLevel)
  return { level: nextLevel, levelUpUntil: 0 }
}

/** —— BREAKOUT —— */
export function mountBreakout(canvas: HTMLCanvasElement, onScore?: ScoreCb): ArcadeHandle {
  let score = 0
  let level = 1
  let stagesCleared = 0
  let levelUpUntil = 0
  let over = false
  let paddleX = 0
  let ball = { x: 0, y: 0, vx: 140, vy: -220 }
  let bricks: Array<{ x: number; y: number; w: number; h: number; alive: boolean; color: string }> = []
  let w = 320
  let h = 400
  const paddleW = 70
  const paddleH = 12
  const ballR = 6
  const loop: Loop = { running: true, raf: 0, last: 0 }
  let pointerDown = false

  const colors = ['#2dd4bf', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa']

  function buildBricks(): void {
    bricks = []
    const cols = 8
    // More rows per stage so each clear takes longer; difficulty follows clears not display level.
    const rows = Math.min(10, 5 + Math.floor(stagesCleared * 0.7))
    const gap = 4
    const bw = (w - gap * (cols + 1)) / cols
    const bh = 14
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: gap + c * (bw + gap),
          y: 40 + r * (bh + gap),
          w: bw,
          h: bh,
          alive: true,
          color: colors[r % colors.length],
        })
      }
    }
  }

  function ballSpeed(): number {
    return 190 + stagesCleared * 18 + level * 8
  }

  function resetBall(): void {
    const spd = ballSpeed()
    ball = {
      x: w / 2,
      y: h - 60,
      vx: spd * 0.55 * (Math.random() > 0.5 ? 1 : -1),
      vy: -spd,
    }
  }

  function reset(): void {
    const sized = sizeCanvas(canvas)
    w = sized.w
    h = sized.h
    score = 0
    level = 1
    stagesCleared = 0
    levelUpUntil = 0
    over = false
    paddleX = w / 2 - paddleW / 2
    buildBricks()
    resetBall()
    onScore?.(score, level)
  }

  function nextStage(): void {
    score += 100
    stagesCleared += 1
    const next = levelFromUnits('breakout', stagesCleared)
    const noted = noteLevel('breakout', level, next, score, onScore)
    level = noted.level
    if (noted.levelUpUntil) levelUpUntil = noted.levelUpUntil
    bumpBest('breakout', score)
    buildBricks()
    resetBall()
  }

  function step(dt: number): void {
    if (over) return
    ball.x += ball.vx * dt
    ball.y += ball.vy * dt
    if (ball.x < ballR || ball.x > w - ballR) ball.vx *= -1
    if (ball.y < 28 + ballR) ball.vy = Math.abs(ball.vy)
    const py = h - 28
    if (ball.y + ballR >= py && ball.y + ballR <= py + paddleH + 8 && ball.x >= paddleX && ball.x <= paddleX + paddleW && ball.vy > 0) {
      ball.vy = -Math.abs(ball.vy)
      const hit = (ball.x - (paddleX + paddleW / 2)) / (paddleW / 2)
      ball.vx = hit * (180 + level * 20)
      ball.y = py - ballR
    }
    if (ball.y > h) {
      over = true
      bumpBest('breakout', score)
      bumpBestLevel('breakout', level)
      onScore?.(score, level)
      return
    }
    for (const b of bricks) {
      if (!b.alive) continue
      if (ball.x > b.x && ball.x < b.x + b.w && ball.y > b.y && ball.y < b.y + b.h) {
        b.alive = false
        ball.vy *= -1
        score += 10
        onScore?.(score, level)
        break
      }
    }
    if (bricks.length && bricks.every((b) => !b.alive)) nextStage()
  }

  function draw(): void {
    const sized = sizeCanvas(canvas)
    w = sized.w
    h = sized.h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#070b12'
    ctx.fillRect(0, 0, w, h)
    for (const b of bricks) {
      if (!b.alive) continue
      ctx.fillStyle = b.color
      ctx.fillRect(b.x, b.y, b.w, b.h)
    }
    ctx.fillStyle = '#5affe8'
    ctx.fillRect(paddleX, h - 28, paddleW, paddleH)
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ballR, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    drawHud(ctx, w, h, score, level, over, 'BREAKOUT', { levelUpUntil })
  }

  function frame(t: number): void {
    if (!loop.running) return
    if (!loop.last) loop.last = t
    const dt = Math.min(0.033, (t - loop.last) / 1000)
    loop.last = t
    step(dt)
    draw()
    loop.raf = requestAnimationFrame(frame)
  }

  reset()
  loop.raf = requestAnimationFrame(frame)

  return {
    stop: () => {
      loop.running = false
      cancelAnimationFrame(loop.raf)
    },
    pointer: (x, _y, type) => {
      if (over && type === 'down') {
        reset()
        return
      }
      if (type === 'down') pointerDown = true
      if (type === 'up') pointerDown = false
      if (type === 'down' || type === 'move' || pointerDown) {
        paddleX = Math.max(0, Math.min(w - paddleW, x - paddleW / 2))
      }
    },
    restart: () => reset(),
    getScore: () => score,
    getLevel: () => level,
    isOver: () => over,
  }
}

/** —— SPACE SHOOTER (missile evolution via item pickups) —— */
export type ShooterWeaponTier = 1 | 2 | 3 | 4 | 5
/** Extra lateral spread from Lv20+ «와이드» items (0–3). */
export type ShooterSpreadBoost = 0 | 1 | 2 | 3

export const SHOOTER_WIDE_UNLOCK_LEVEL = 20
export const MAX_SHOOTER_SPREAD = 3

/**
 * Soft-cap Space difficulty so Lv21+ stays playable.
 * Early levels keep the old ramp; late levels barely get faster.
 */
export function shooterDifficultyLevel(level: number): number {
  const L = Math.max(1, Math.floor(level))
  if (L <= 12) return L
  if (L <= 20) return 12 + (L - 12) * 0.45 // Lv20 ≈ 15.6
  // Lv21+: almost flat — each level adds only a tiny bit
  return 15.6 + (L - 20) * 0.2
}

/** Enemy downward speed (px/s). Soft-capped after mid/late levels. */
export function shooterEnemyFallSpeed(level: number): number {
  const L = shooterDifficultyLevel(level)
  return 50 + L * 12
}

/** Seconds between enemy spawns (higher = slower). Floors gently after Lv20. */
export function shooterSpawnInterval(level: number): number {
  const L = shooterDifficultyLevel(level)
  // Old formula hit 0.28 by ~Lv11; keep a calmer floor and slow Lv21+ further
  const base = Math.max(0.45, 1.2 - L * 0.05)
  if (level >= 21) return Math.max(0.55, base + 0.12)
  return base
}

/** Horizontal wander amplitude for enemies. */
export function shooterEnemySideSpeed(level: number): number {
  const L = Math.min(shooterDifficultyLevel(level), 16)
  return 70 + L * 8
}

export function nextWeaponTier(tier: number): ShooterWeaponTier {
  return Math.min(5, Math.max(1, Math.floor(tier) + 1)) as ShooterWeaponTier
}

export function nextSpreadBoost(spread: number): ShooterSpreadBoost {
  return Math.min(MAX_SHOOTER_SPREAD, Math.max(0, Math.floor(spread) + 1)) as ShooterSpreadBoost
}

export type ShooterBulletSpec = {
  x: number
  y: number
  vx: number
  vy: number
  dmg: number
  pierce: number
  color: string
  w: number
  h: number
}

/** Widen shot angles / offsets; add wing missiles at higher spread. */
export function applyShooterSpread(
  shots: ShooterBulletSpec[],
  shipX: number,
  shipY: number,
  spread: number,
): ShooterBulletSpec[] {
  if (spread <= 0) return shots
  const mul = 1 + spread * 0.65
  const widened = shots.map((b) => ({
    ...b,
    x: shipX + (b.x - shipX) * (1 + spread * 0.4),
    vx: b.vx * mul,
  }))
  // Fan wings — more width as spread grows
  for (let i = 1; i <= spread; i++) {
    const side = 22 + i * 10
    const ang = 0.55 + i * 0.22
    widened.push(
      {
        x: shipX - side,
        y: shipY + 2,
        vx: -ang,
        vy: -1,
        dmg: 1 + Math.floor(i / 2),
        pierce: i >= 2 ? 1 : 0,
        color: i >= 3 ? '#fde68a' : '#fbbf24',
        w: 3 + i,
        h: 9 + i,
      },
      {
        x: shipX + side,
        y: shipY + 2,
        vx: ang,
        vy: -1,
        dmg: 1 + Math.floor(i / 2),
        pierce: i >= 2 ? 1 : 0,
        color: i >= 3 ? '#fde68a' : '#fbbf24',
        w: 3 + i,
        h: 9 + i,
      },
    )
  }
  return widened
}

export function shooterFirePattern(
  tier: ShooterWeaponTier,
  shipX: number,
  shipY: number,
  spread: number = 0,
): ShooterBulletSpec[] {
  const up = -1
  let base: ShooterBulletSpec[]
  if (tier === 1) {
    base = [{ x: shipX, y: shipY, vx: 0, vy: up, dmg: 1, pierce: 0, color: '#fbbf24', w: 4, h: 10 }]
  } else if (tier === 2) {
    base = [
      { x: shipX - 8, y: shipY, vx: 0, vy: up, dmg: 1, pierce: 0, color: '#fbbf24', w: 4, h: 10 },
      { x: shipX + 8, y: shipY, vx: 0, vy: up, dmg: 1, pierce: 0, color: '#fbbf24', w: 4, h: 10 },
    ]
  } else if (tier === 3) {
    base = [
      { x: shipX, y: shipY - 2, vx: 0, vy: up, dmg: 1, pierce: 0, color: '#5affe8', w: 5, h: 12 },
      { x: shipX - 12, y: shipY, vx: -0.15, vy: up, dmg: 1, pierce: 0, color: '#fbbf24', w: 4, h: 10 },
      { x: shipX + 12, y: shipY, vx: 0.15, vy: up, dmg: 1, pierce: 0, color: '#fbbf24', w: 4, h: 10 },
    ]
  } else if (tier === 4) {
    base = [
      { x: shipX, y: shipY - 2, vx: 0, vy: up, dmg: 2, pierce: 0, color: '#a78bfa', w: 5, h: 12 },
      { x: shipX - 10, y: shipY, vx: -0.28, vy: up, dmg: 1, pierce: 0, color: '#60a5fa', w: 4, h: 10 },
      { x: shipX + 10, y: shipY, vx: 0.28, vy: up, dmg: 1, pierce: 0, color: '#60a5fa', w: 4, h: 10 },
      { x: shipX - 18, y: shipY + 2, vx: -0.5, vy: up, dmg: 1, pierce: 0, color: '#f472b6', w: 3, h: 9 },
      { x: shipX + 18, y: shipY + 2, vx: 0.5, vy: up, dmg: 1, pierce: 0, color: '#f472b6', w: 3, h: 9 },
    ]
  } else {
    // Mk.5 — heavy pierce lasers
    base = [
      { x: shipX, y: shipY - 4, vx: 0, vy: up, dmg: 3, pierce: 3, color: '#5affe8', w: 6, h: 18 },
      { x: shipX - 14, y: shipY, vx: -0.12, vy: up, dmg: 2, pierce: 2, color: '#00d2be', w: 5, h: 14 },
      { x: shipX + 14, y: shipY, vx: 0.12, vy: up, dmg: 2, pierce: 2, color: '#00d2be', w: 5, h: 14 },
    ]
  }
  return applyShooterSpread(base, shipX, shipY, spread)
}

export function mountShooter(canvas: HTMLCanvasElement, onScore?: ScoreCb): ArcadeHandle {
  type Bullet = {
    x: number
    y: number
    vx: number
    vy: number
    dmg: number
    pierce: number
    color: string
    w: number
    h: number
  }
  type Enemy = { x: number; y: number; vx: number; hp: number }
  type Item = { x: number; y: number; kind: 'missile' | 'wide' }

  let w = 320
  let h = 420
  let score = 0
  let kills = 0
  let level = 1
  let levelUpUntil = 0
  let weapon: ShooterWeaponTier = 1
  let spreadBoost: ShooterSpreadBoost = 0
  let weaponFlashUntil = 0
  let flashLabel = ''
  let over = false
  let shipX = 160
  let bullets: Bullet[] = []
  let enemies: Enemy[] = []
  let items: Item[] = []
  let spawnAcc = 0
  let fireAcc = 0
  const loop: Loop = { running: true, raf: 0, last: 0 }
  const MAX_WEAPON = 5

  function fireInterval(): number {
    // Higher weapon = slightly faster fire; level also helps
    return Math.max(0.12, 0.32 - level * 0.012 - (weapon - 1) * 0.018 - spreadBoost * 0.01)
  }

  function bulletSpeed(): number {
    return 340 + level * 18 + weapon * 12 + spreadBoost * 8
  }

  function reset(): void {
    const sized = sizeCanvas(canvas)
    w = sized.w
    h = sized.h
    score = 0
    kills = 0
    level = 1
    levelUpUntil = 0
    weapon = 1
    spreadBoost = 0
    weaponFlashUntil = 0
    flashLabel = ''
    over = false
    shipX = w / 2
    bullets = []
    enemies = []
    items = []
    spawnAcc = 0
    fireAcc = 0
    onScore?.(score, level)
  }

  function dropPickup(x: number, y: number, prevLevel: number): void {
    // After Lv20: spawn wide-spread missile items
    if (level >= SHOOTER_WIDE_UNLOCK_LEVEL && spreadBoost < MAX_SHOOTER_SPREAD) {
      const justUnlocked = prevLevel < SHOOTER_WIDE_UNLOCK_LEVEL && level >= SHOOTER_WIDE_UNLOCK_LEVEL
      if (justUnlocked || kills % 4 === 0 || Math.random() < 0.5) {
        items.push({ x, y, kind: 'wide' })
        return
      }
    }
    if (weapon >= MAX_WEAPON) return
    // Guaranteed every 3rd kill, else 40% chance
    if (kills % 3 === 0 || Math.random() < 0.4) {
      items.push({ x, y, kind: 'missile' })
    }
  }

  function step(dt: number): void {
    if (over) return
    const shipY = h - 50
    fireAcc += dt
    if (fireAcc > fireInterval()) {
      fireAcc = 0
      const spd = bulletSpeed()
      for (const b of shooterFirePattern(weapon, shipX, shipY, spreadBoost)) {
        bullets.push({
          ...b,
          vx: b.vx * spd,
          vy: b.vy * spd,
        })
      }
    }
    spawnAcc += dt
    if (spawnAcc > shooterSpawnInterval(level)) {
      spawnAcc = 0
      const side = shooterEnemySideSpeed(level)
      enemies.push({
        x: 20 + Math.random() * (w - 40),
        y: 36,
        vx: (Math.random() - 0.5) * side,
        // Soft HP: don't keep stacking forever past mid-game
        hp:
          1 +
          (level >= 3 ? 1 : 0) +
          (level >= 6 ? 1 : 0) +
          (level >= 9 && level < 21 ? 1 : 0) +
          (level >= 25 ? 1 : 0),
      })
    }
    bullets.forEach((b) => {
      b.x += b.vx * dt
      b.y += b.vy * dt
    })
    bullets = bullets.filter((b) => b.y > 16 && b.y < h + 20 && b.x > -20 && b.x < w + 20)
    const fall = shooterEnemyFallSpeed(level)
    enemies.forEach((e) => {
      e.y += fall * dt
      e.x += e.vx * dt
      if (e.x < 12 || e.x > w - 12) e.vx *= -1
    })
    for (const e of enemies) {
      for (const b of bullets) {
        if (b.y < -50) continue
        if (Math.hypot(e.x - b.x, e.y - b.y) < 16) {
          e.hp -= b.dmg
          if (b.pierce > 0) {
            b.pierce -= 1
          } else {
            b.y = -999
          }
          if (e.hp <= 0) {
            const ex = e.x
            const ey = e.y
            e.y = 9999
            score += 15 + (weapon - 1) * 2 + spreadBoost
            kills += 1
            const prevLevel = level
            const next = levelFromUnits('shooter', kills)
            const noted = noteLevel('shooter', level, next, score, onScore)
            level = noted.level
            if (noted.levelUpUntil) levelUpUntil = noted.levelUpUntil
            dropPickup(ex, ey, prevLevel)
          }
        }
      }
    }
    bullets = bullets.filter((b) => b.y > 16)
    enemies = enemies.filter((e) => e.y < h + 20)

    items.forEach((it) => {
      it.y += 70 * dt
    })
    const kept: Item[] = []
    for (const it of items) {
      if (it.y > h + 10) continue
      if (Math.hypot(it.x - shipX, it.y - (h - 36)) < 26) {
        if (it.kind === 'wide' && spreadBoost < MAX_SHOOTER_SPREAD) {
          spreadBoost = nextSpreadBoost(spreadBoost)
          weaponFlashUntil = performance.now() + 1600
          flashLabel = `WIDE ×${spreadBoost}`
          score += 35
          onScore?.(score, level)
        } else if (it.kind === 'missile' && weapon < MAX_WEAPON) {
          weapon = nextWeaponTier(weapon)
          weaponFlashUntil = performance.now() + 1400
          flashLabel = `MISSILE Mk.${weapon}`
          score += 20
          onScore?.(score, level)
        }
        continue
      }
      kept.push(it)
    }
    items = kept

    for (const e of enemies) {
      if (Math.hypot(e.x - shipX, e.y - (h - 36)) < 22 || e.y > h - 10) {
        over = true
        bumpBest('shooter', score)
        bumpBestLevel('shooter', level)
        onScore?.(score, level)
        break
      }
    }
  }

  function draw(): void {
    const sized = sizeCanvas(canvas)
    w = sized.w
    h = sized.h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#05080e'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    for (let i = 0; i < 30; i++) {
      ctx.fillRect((i * 47) % w, (i * 89 + score) % h, 2, 2)
    }
    // upgrade orbs — M = missile tier, W = wide spread (Lv20+)
    for (const it of items) {
      const wide = it.kind === 'wide'
      ctx.fillStyle = wide ? 'rgba(251,191,36,0.22)' : 'rgba(90,255,232,0.2)'
      ctx.beginPath()
      ctx.arc(it.x, it.y, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = wide ? '#fbbf24' : '#5affe8'
      ctx.beginPath()
      ctx.arc(it.x, it.y, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#041018'
      ctx.font = '700 9px Orbitron, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(wide ? 'W' : 'M', it.x, it.y + 3)
    }
    ctx.fillStyle = '#5affe8'
    ctx.beginPath()
    ctx.moveTo(shipX, h - 48)
    ctx.lineTo(shipX - 16, h - 22)
    ctx.lineTo(shipX + 16, h - 22)
    ctx.closePath()
    ctx.fill()
    for (const b of bullets) {
      ctx.fillStyle = b.color
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h)
    }
    for (const e of enemies) {
      ctx.fillStyle = e.hp > 2 ? '#c084fc' : e.hp > 1 ? '#f472b6' : '#ff6b6b'
      ctx.fillRect(e.x - 12, e.y - 10, 24, 20)
    }
    const hudTitle =
      spreadBoost > 0 ? `SPACE Mk.${weapon} W${spreadBoost}` : `SPACE Mk.${weapon}`
    drawHud(ctx, w, h, score, level, over, hudTitle, { levelUpUntil })
    if (!over && performance.now() < weaponFlashUntil) {
      const wideFlash = flashLabel.startsWith('WIDE')
      ctx.fillStyle = wideFlash ? 'rgba(251,191,36,0.18)' : 'rgba(90,255,232,0.16)'
      ctx.fillRect(0, h * 0.48, w, 40)
      ctx.fillStyle = wideFlash ? '#fbbf24' : '#5affe8'
      ctx.font = '700 16px Orbitron, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(flashLabel || `MISSILE Mk.${weapon}`, w / 2, h * 0.48 + 26)
    }
  }

  function frame(t: number): void {
    if (!loop.running) return
    if (!loop.last) loop.last = t
    const dt = Math.min(0.033, (t - loop.last) / 1000)
    loop.last = t
    step(dt)
    draw()
    loop.raf = requestAnimationFrame(frame)
  }

  reset()
  loop.raf = requestAnimationFrame(frame)

  return {
    stop: () => {
      loop.running = false
      cancelAnimationFrame(loop.raf)
    },
    pointer: (x, _y, type) => {
      if (over && type === 'down') {
        reset()
        return
      }
      if (over) return
      shipX = Math.max(16, Math.min(w - 16, x))
    },
    restart: () => reset(),
    getScore: () => score,
    getLevel: () => level,
    isOver: () => over,
  }
}

/** —— FLAPPY —— */
export function mountFlappy(canvas: HTMLCanvasElement, onScore?: ScoreCb): ArcadeHandle {
  let w = 320
  let h = 400
  let birdY = 180
  let birdV = 0
  let pipes: Array<{ x: number; gapY: number; scored: boolean }> = []
  let score = 0
  let level = 1
  let levelUpUntil = 0
  let over = false
  let spawn = 0
  const loop: Loop = { running: true, raf: 0, last: 0 }
  const birdR = 12
  const gravity = 980
  const flap = -320

  function gapSize(): number {
    return Math.max(78, 120 - level * 5)
  }

  function reset(): void {
    const s = sizeCanvas(canvas)
    w = s.w
    h = s.h
    birdY = h * 0.4
    birdV = 0
    pipes = []
    score = 0
    level = 1
    levelUpUntil = 0
    over = false
    spawn = 0
    onScore?.(0, level)
  }

  function step(dt: number): void {
    if (over) return
    const gap = gapSize()
    birdV += gravity * dt
    birdY += birdV * dt
    spawn += dt
    const interval = Math.max(0.85, 1.4 - level * 0.06)
    if (spawn > interval) {
      spawn = 0
      pipes.push({
        x: w + 20,
        gapY: 80 + Math.random() * (h - 160 - gap),
        scored: false,
      })
    }
    const speed = 130 + level * 12
    for (const p of pipes) p.x -= speed * dt
    pipes = pipes.filter((p) => p.x > -40)
    for (const p of pipes) {
      if (!p.scored && p.x + 28 < w * 0.28) {
        p.scored = true
        score += 1
        const next = levelFromUnits('flappy', score)
        const noted = noteLevel('flappy', level, next, score, onScore)
        level = noted.level
        if (noted.levelUpUntil) levelUpUntil = noted.levelUpUntil
        bumpBest('flappy', score)
      }
      const inX = Math.abs(p.x + 14 - w * 0.28) < 14 + birdR * 0.7
      if (inX && (birdY - birdR < p.gapY || birdY + birdR > p.gapY + gap)) {
        over = true
        bumpBest('flappy', score)
        bumpBestLevel('flappy', level)
      }
    }
    if (birdY - birdR < 0 || birdY + birdR > h) {
      over = true
      bumpBest('flappy', score)
      bumpBestLevel('flappy', level)
    }
  }

  function draw(): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const s = sizeCanvas(canvas)
    w = s.w
    h = s.h
    const gap = gapSize()
    ctx.fillStyle = '#0a1624'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#00d2be'
    for (const p of pipes) {
      ctx.fillRect(p.x, 0, 28, p.gapY)
      ctx.fillRect(p.x, p.gapY + gap, 28, h - (p.gapY + gap))
    }
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.arc(w * 0.28, birdY, birdR, 0, Math.PI * 2)
    ctx.fill()
    drawHud(ctx, w, h, score, level, over, 'FLAPPY', { levelUpUntil })
  }

  function frame(t: number): void {
    if (!loop.running) return
    if (!loop.last) loop.last = t
    const dt = Math.min(0.033, (t - loop.last) / 1000)
    loop.last = t
    step(dt)
    draw()
    loop.raf = requestAnimationFrame(frame)
  }

  reset()
  loop.raf = requestAnimationFrame(frame)

  return {
    stop: () => {
      loop.running = false
      cancelAnimationFrame(loop.raf)
    },
    pointer: (_x, _y, type) => {
      if (over && type === 'down') {
        reset()
        return
      }
      if (over || type !== 'down') return
      birdV = flap
    },
    restart: () => reset(),
    getScore: () => score,
    getLevel: () => level,
    isOver: () => over,
  }
}

/** —— DODGE —— */
export function mountDodge(canvas: HTMLCanvasElement, onScore?: ScoreCb): ArcadeHandle {
  let w = 320
  let h = 400
  let playerX = 160
  let hazards: Array<{ x: number; y: number; s: number; vy: number }> = []
  let score = 0
  let level = 1
  let levelUpUntil = 0
  let over = false
  let spawn = 0
  let elapsed = 0
  const loop: Loop = { running: true, raf: 0, last: 0 }
  const pw = 36
  const ph = 18

  function reset(): void {
    const s = sizeCanvas(canvas)
    w = s.w
    h = s.h
    playerX = w / 2
    hazards = []
    score = 0
    level = 1
    levelUpUntil = 0
    over = false
    spawn = 0
    elapsed = 0
    onScore?.(0, level)
  }

  function step(dt: number): void {
    if (over) return
    elapsed += dt
    spawn += dt
    const rate = Math.max(0.22, 0.95 - level * 0.07)
    if (spawn > rate) {
      spawn = 0
      const s = 18 + Math.random() * 22
      hazards.push({
        x: s / 2 + Math.random() * (w - s),
        y: -s,
        s,
        vy: 150 + level * 25 + Math.random() * 80,
      })
    }
    for (const hz of hazards) hz.y += hz.vy * dt
    const before = hazards.length
    hazards = hazards.filter((hz) => hz.y - hz.s < h + 10)
    const passed = before - hazards.length
    if (passed > 0) {
      score += passed
      const next = levelFromUnits('dodge', score)
      const noted = noteLevel('dodge', level, next, score, onScore)
      level = noted.level
      if (noted.levelUpUntil) levelUpUntil = noted.levelUpUntil
      bumpBest('dodge', score)
    }
    const px = playerX - pw / 2
    const py = h - 42
    for (const hz of hazards) {
      if (
        px < hz.x + hz.s / 2 &&
        px + pw > hz.x - hz.s / 2 &&
        py < hz.y + hz.s / 2 &&
        py + ph > hz.y - hz.s / 2
      ) {
        over = true
        bumpBest('dodge', score)
        bumpBestLevel('dodge', level)
        break
      }
    }
  }

  function draw(): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const s = sizeCanvas(canvas)
    w = s.w
    h = s.h
    ctx.fillStyle = '#0b121c'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#ff6b6b'
    for (const hz of hazards) {
      ctx.fillRect(hz.x - hz.s / 2, hz.y - hz.s / 2, hz.s, hz.s)
    }
    ctx.fillStyle = '#5affe8'
    ctx.fillRect(playerX - pw / 2, h - 42, pw, ph)
    drawHud(ctx, w, h, score, level, over, 'DODGE', { levelUpUntil })
  }

  function frame(t: number): void {
    if (!loop.running) return
    if (!loop.last) loop.last = t
    const dt = Math.min(0.033, (t - loop.last) / 1000)
    loop.last = t
    step(dt)
    draw()
    loop.raf = requestAnimationFrame(frame)
  }

  reset()
  loop.raf = requestAnimationFrame(frame)

  return {
    stop: () => {
      loop.running = false
      cancelAnimationFrame(loop.raf)
    },
    pointer: (x, _y, type) => {
      if (over && type === 'down') {
        reset()
        return
      }
      if (over) return
      playerX = Math.max(pw / 2, Math.min(w - pw / 2, x))
    },
    restart: () => reset(),
    getScore: () => score,
    getLevel: () => level,
    isOver: () => over,
  }
}

/** —— PONG (solo wall) —— */
export function mountPong(canvas: HTMLCanvasElement, onScore?: ScoreCb): ArcadeHandle {
  let w = 320
  let h = 400
  let paddleX = 120
  let ball = { x: 160, y: 200, vx: 160, vy: -220 }
  let score = 0
  let level = 1
  let levelUpUntil = 0
  let over = false
  const loop: Loop = { running: true, raf: 0, last: 0 }
  const paddleH = 12
  const ballR = 8

  function paddleW(): number {
    return Math.max(48, 86 - level * 4)
  }

  function reset(): void {
    const s = sizeCanvas(canvas)
    w = s.w
    h = s.h
    paddleX = w / 2 - paddleW() / 2
    ball = { x: w / 2, y: h * 0.45, vx: 150 * (Math.random() < 0.5 ? -1 : 1), vy: -220 }
    score = 0
    level = 1
    levelUpUntil = 0
    over = false
    onScore?.(0, level)
  }

  function step(dt: number): void {
    if (over) return
    const pw = paddleW()
    const speedMul = 1 + (level - 1) * 0.08
    ball.x += ball.vx * dt * speedMul
    ball.y += ball.vy * dt * speedMul
    if (ball.x - ballR < 0) {
      ball.x = ballR
      ball.vx = Math.abs(ball.vx)
    }
    if (ball.x + ballR > w) {
      ball.x = w - ballR
      ball.vx = -Math.abs(ball.vx)
    }
    if (ball.y - ballR < 28) {
      ball.y = 28 + ballR
      ball.vy = Math.abs(ball.vy)
    }
    const py = h - 36
    if (
      ball.vy > 0 &&
      ball.y + ballR >= py &&
      ball.y - ballR <= py + paddleH &&
      ball.x >= paddleX &&
      ball.x <= paddleX + pw
    ) {
      ball.y = py - ballR
      ball.vy = -Math.abs(ball.vy) * 1.03
      ball.vx = pongPaddleBounce(ball.x, paddleX, pw)
      score += 1
      const next = levelFromUnits('pong', score)
      const noted = noteLevel('pong', level, next, score, onScore)
      level = noted.level
      if (noted.levelUpUntil) levelUpUntil = noted.levelUpUntil
      bumpBest('pong', score)
    }
    if (ball.y - ballR > h) {
      over = true
      bumpBest('pong', score)
      bumpBestLevel('pong', level)
    }
  }

  function draw(): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const s = sizeCanvas(canvas)
    w = s.w
    h = s.h
    const pw = paddleW()
    ctx.fillStyle = '#071018'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#5ac8ff'
    ctx.fillRect(paddleX, h - 36, pw, paddleH)
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ballR, 0, Math.PI * 2)
    ctx.fill()
    drawHud(ctx, w, h, score, level, over, 'PONG', { levelUpUntil })
  }

  function frame(t: number): void {
    if (!loop.running) return
    if (!loop.last) loop.last = t
    const dt = Math.min(0.033, (t - loop.last) / 1000)
    loop.last = t
    step(dt)
    draw()
    loop.raf = requestAnimationFrame(frame)
  }

  reset()
  loop.raf = requestAnimationFrame(frame)

  return {
    stop: () => {
      loop.running = false
      cancelAnimationFrame(loop.raf)
    },
    pointer: (x, _y, type) => {
      if (over && type === 'down') {
        reset()
        return
      }
      if (over) return
      const pw = paddleW()
      paddleX = Math.max(0, Math.min(w - pw, x - pw / 2))
    },
    restart: () => reset(),
    getScore: () => score,
    getLevel: () => level,
    isOver: () => over,
  }
}

/** —— SLIDE (스윽) —— timed sliding puzzle */
export function slideGridSize(level: number): number {
  if (level <= 5) return 3
  if (level <= 12) return 4
  return 5
}

export function slideScrambleMoves(level: number, size: number): number {
  if (size === 3) return 10 + level * 3
  if (size === 4) return 36 + (level - 5) * 5
  return 70 + (level - 12) * 8
}

export function slideTimeLimitSec(level: number, size: number): number {
  const base = size === 3 ? 55 : size === 4 ? 95 : 140
  return Math.max(28, base - Math.floor(level * 1.6))
}

export function slideSolvedBoard(size: number): number[] {
  const n = size * size
  const b: number[] = []
  for (let i = 1; i < n; i++) b.push(i)
  b.push(0)
  return b
}

export function slideIsSolved(board: number[]): boolean {
  const n = board.length
  for (let i = 0; i < n - 1; i++) {
    if (board[i] !== i + 1) return false
  }
  return board[n - 1] === 0
}

function slideNeighbors(empty: number, size: number): number[] {
  const r = Math.floor(empty / size)
  const c = empty % size
  const out: number[] = []
  if (r > 0) out.push(empty - size)
  if (r < size - 1) out.push(empty + size)
  if (c > 0) out.push(empty - 1)
  if (c < size - 1) out.push(empty + 1)
  return out
}

export function slideScramble(size: number, moves: number): { board: number[]; empty: number } {
  let board = slideSolvedBoard(size)
  let empty = size * size - 1
  let last = -1
  for (let i = 0; i < moves; i++) {
    const opts = slideNeighbors(empty, size).filter((x) => x !== last)
    const pick = opts[Math.floor(Math.random() * opts.length)]!
    board = [...board]
    board[empty] = board[pick]!
    board[pick] = 0
    last = empty
    empty = pick
  }
  if (slideIsSolved(board)) {
    const opts = slideNeighbors(empty, size)
    const pick = opts[0]!
    board = [...board]
    board[empty] = board[pick]!
    board[pick] = 0
    empty = pick
  }
  return { board, empty }
}

export function mountSlide(canvas: HTMLCanvasElement, onScore?: ScoreCb): ArcadeHandle {
  let w = 320
  let h = 400
  let score = 0
  let level = 1
  let clears = 0
  let levelUpUntil = 0
  let over = false
  let clearedFlash = 0
  let size = 3
  let board: number[] = []
  let empty = 0
  let moves = 0
  let timeLeft = 60
  let cell = 40
  let originX = 0
  let originY = 40
  let downX = 0
  let downY = 0
  const loop: Loop = { running: true, raf: 0, last: 0 }
  const colors = ['#3d9cf0', '#5ad1c0', '#7bdff2', '#2a6f97', '#48cae4', '#ff8a5b', '#ffd166']

  function layout(): void {
    const s = sizeCanvas(canvas)
    w = s.w
    h = s.h
    const pad = 14
    const boardSide = Math.min(w - pad * 2, h - 88)
    cell = boardSide / size
    originX = (w - boardSide) / 2
    originY = 36
  }

  function deal(): void {
    size = slideGridSize(level)
    const sc = slideScramble(size, slideScrambleMoves(level, size))
    board = sc.board
    empty = sc.empty
    moves = 0
    timeLeft = slideTimeLimitSec(level, size)
    layout()
  }

  function reset(): void {
    score = 0
    level = 1
    clears = 0
    levelUpUntil = 0
    over = false
    clearedFlash = 0
    deal()
    onScore?.(0, level)
  }

  function finish(): void {
    if (over) return
    over = true
    bumpBest('slide', score)
    bumpBestLevel('slide', level)
  }

  function trySlide(index: number): void {
    if (over || clearedFlash > 0) return
    if (!slideNeighbors(empty, size).includes(index)) return
    board = [...board]
    board[empty] = board[index]!
    board[index] = 0
    empty = index
    moves += 1
    if (slideIsSolved(board)) {
      const bonus = Math.max(20, Math.floor(timeLeft * 8) + Math.max(0, 40 - moves) * 5)
      score += bonus
      clears += 1
      const next = levelFromUnits('slide', clears)
      const noted = noteLevel('slide', level, next, score, onScore)
      level = noted.level
      if (noted.levelUpUntil) levelUpUntil = noted.levelUpUntil
      clearedFlash = 0.7
      bumpBest('slide', score)
    }
  }

  function cellAt(x: number, y: number): number {
    const c = Math.floor((x - originX) / cell)
    const r = Math.floor((y - originY) / cell)
    if (r < 0 || c < 0 || r >= size || c >= size) return -1
    return r * size + c
  }

  function tileColor(tile: number): string {
    if (tile === 0) return 'transparent'
    const i = tile - 1
    const r = Math.floor(i / size)
    const c = i % size
    const t = (r + c) / Math.max(1, size * 2 - 2)
    return colors[Math.floor(t * (colors.length - 1))]!
  }

  function step(dt: number): void {
    if (over) return
    if (clearedFlash > 0) {
      clearedFlash -= dt
      if (clearedFlash <= 0) {
        clearedFlash = 0
        deal()
        onScore?.(score, level)
      }
      return
    }
    timeLeft -= dt
    if (timeLeft <= 0) {
      timeLeft = 0
      finish()
    }
  }

  function draw(): void {
    layout()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, w, h)
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#102536')
    g.addColorStop(1, '#0a1824')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    const limit = slideTimeLimitSec(level, size)
    const ratio = Math.max(0, timeLeft / limit)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fillRect(originX, 8, cell * size, 8)
    ctx.fillStyle = ratio > 0.25 ? '#5ad1c0' : '#ff8a5b'
    ctx.fillRect(originX, 8, cell * size * ratio, 8)

    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fillRect(originX - 4, originY - 4, cell * size + 8, cell * size + 8)

    const gap = 3
    for (let i = 0; i < board.length; i++) {
      const tile = board[i]!
      const r = Math.floor(i / size)
      const c = i % size
      const x = originX + c * cell
      const y = originY + r * cell
      if (tile === 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'
        ctx.setLineDash([4, 4])
        ctx.strokeRect(x + gap, y + gap, cell - gap * 2, cell - gap * 2)
        ctx.setLineDash([])
        continue
      }
      ctx.fillStyle = tileColor(tile)
      const rr = 8
      const tx = x + gap
      const ty = y + gap
      const tw = cell - gap * 2
      const th = cell - gap * 2
      ctx.beginPath()
      ctx.moveTo(tx + rr, ty)
      ctx.arcTo(tx + tw, ty, tx + tw, ty + th, rr)
      ctx.arcTo(tx + tw, ty + th, tx, ty + th, rr)
      ctx.arcTo(tx, ty + th, tx, ty, rr)
      ctx.arcTo(tx, ty, tx + tw, ty, rr)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.font = `700 ${Math.max(14, Math.floor(cell * 0.34))}px IBM Plex Sans KR, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(tile), x + cell / 2, y + cell / 2 + 1)
    }

    ctx.fillStyle = '#9adfd6'
    ctx.font = '500 12px IBM Plex Sans KR, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${size}×${size} · ${moves}수 · ${Math.ceil(timeLeft)}초`, w / 2, originY + cell * size + 22)

    if (clearedFlash > 0) {
      ctx.fillStyle = 'rgba(0, 210, 190, 0.2)'
      ctx.fillRect(0, h * 0.36, w, 48)
      ctx.fillStyle = '#5affe8'
      ctx.font = '700 20px Orbitron, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('CLEAR!', w / 2, h * 0.36 + 32)
    }

    drawHud(ctx, w, h, score, level, over, '스윽', { levelUpUntil })
  }

  function frame(t: number): void {
    if (!loop.running) return
    const dt = Math.min(0.05, (t - loop.last) / 1000 || 0.016)
    loop.last = t
    step(dt)
    draw()
    loop.raf = requestAnimationFrame(frame)
  }

  reset()
  loop.last = performance.now()
  loop.raf = requestAnimationFrame(frame)

  return {
    stop: () => {
      loop.running = false
      cancelAnimationFrame(loop.raf)
    },
    pointer: (x, y, type) => {
      if (over && type === 'down') {
        reset()
        return
      }
      if (over || clearedFlash > 0) return
      if (type === 'down') {
        downX = x
        downY = y
        return
      }
      if (type === 'up') {
        const dx = x - downX
        const dy = y - downY
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 28) {
          let target = -1
          if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0 && empty % size > 0) target = empty - 1
            if (dx < 0 && empty % size < size - 1) target = empty + 1
          } else {
            if (dy > 0 && empty >= size) target = empty - size
            if (dy < 0 && empty < size * (size - 1)) target = empty + size
          }
          if (target >= 0) trySlide(target)
          return
        }
        const idx = cellAt(x, y)
        if (idx >= 0) trySlide(idx)
      }
    },
    restart: () => reset(),
    getScore: () => score,
    getLevel: () => level,
    isOver: () => over,
  }
}


/** —— 스페이스2 (id: gyeokpa) — waves/boss/power-ups through Lv25, no wingmen —— */
export type GyeokpaWeapon = 'pulse' | 'twin' | 'spread' | 'laser'

export const GYEOKPA_WEAPONS: GyeokpaWeapon[] = ['pulse', 'twin', 'spread', 'laser']

/** Clear / max stage count for 스페이스2 (wave == level). */
export const GYEOKPA_MAX_LEVEL = 25

/**
 * Final laser reach (px upward from ship tip).
 * Short bolts felt weak; this is a long-range beam (~screen height).
 */
export const GYEOKPA_LASER_BEAM_LEN = 280

/** Enemy fall speed — soft-capped after mid levels so Lv25 stays playable. */
export function gyeokpaEnemyFallSpeed(wave: number, stage = 1): number {
  const w = Math.max(1, Math.min(GYEOKPA_MAX_LEVEL, Math.floor(wave)))
  const early = Math.min(w, 15)
  const late = Math.max(0, w - 15)
  return 50 + early * 8 + stage * 10 + late * 3
}

/** Spawn gap between enemies — floor so late waves do not become unreadable. */
export function gyeokpaSpawnInterval(wave: number, stage = 1): number {
  const w = Math.max(1, Math.floor(wave))
  return Math.max(0.2, 0.55 - Math.min(w, 18) * 0.02 - stage * 0.03)
}

export function gyeokpaWeaponLabel(w: GyeokpaWeapon): string {
  if (w === 'pulse') return '펄스'
  if (w === 'twin') return '트윈'
  if (w === 'spread') return '스프레드'
  return '레이저'
}

/** First-version upgrade cycle (wraps after laser). */
export function gyeokpaNextWeapon(w: GyeokpaWeapon): GyeokpaWeapon {
  const i = GYEOKPA_WEAPONS.indexOf(w)
  return GYEOKPA_WEAPONS[(i + 1) % GYEOKPA_WEAPONS.length]!
}

/** @deprecated kept for older tests/imports — first version has no timed laser. */
export const GYEOKPA_LASER_SEC = 0
/** @deprecated first version has no wingmen. */
export const GYEOKPA_MAX_ALLIES = 0
export const GYEOKPA_MAX_LASER = 1
export const GYEOKPA_LASER_DROP_RATE = 0

/** @deprecated */
export type GyeokpaBaseWeapon = 'pulse' | 'twin' | 'spread'
/** @deprecated alias — use gyeokpaNextWeapon */
export function gyeokpaNextBaseWeapon(w: GyeokpaBaseWeapon): GyeokpaBaseWeapon {
  const n = gyeokpaNextWeapon(w)
  return n === 'laser' ? 'pulse' : n
}
export function gyeokpaLaserOffsets(_count: number): number[] {
  return [0]
}
export function gyeokpaAllySlotOffsets(): ReadonlyArray<{ x: number; y: number }> {
  return []
}

export function mountGyeokpa(canvas: HTMLCanvasElement, onScore?: ScoreCb): ArcadeHandle {
  type Bullet = {
    x: number
    y: number
    vx: number
    vy: number
    r: number
    dmg: number
    friendly: boolean
    laser?: boolean
    /** Upward beam length for laser weapon (px). */
    laserLen?: number
    life?: number
  }
  type Enemy = {
    x: number
    y: number
    vx: number
    vy: number
    r: number
    hp: number
    maxHp: number
    kind: 'scout' | 'tank' | 'zig' | 'boss'
    score: number
    shootCd: number
    phase: number
  }
  type Power = { x: number; y: number; kind: 'weapon' | 'life' | 'shield' | 'bomb'; life: number }
  type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
  type Star = { x: number; y: number; z: number; s: number }

  let w = 320
  let h = 420
  let score = 0
  let kills = 0
  let level = 1
  let levelUpUntil = 0
  let over = false
  let cleared = false
  let lives = 3
  let inv = 0
  let shield = 0
  let shipX = 160
  let shipY = 360
  let targetX = 160
  let targetY = 360
  let weapon: GyeokpaWeapon = 'pulse'
  let fireCd = 0
  let wave = 1
  let stage = 1
  let betweenWaves = 0
  let spawnLeft = 0
  let spawnCd = 0
  let bossActive = false
  let combo = 0
  let comboT = 0
  let flashLabel = ''
  let flashUntil = 0
  let shake = 0
  let screenFlash = 0
  let bullets: Bullet[] = []
  let enemies: Enemy[] = []
  let powers: Power[] = []
  let particles: Particle[] = []
  let stars: Star[] = []
  const loop: Loop = { running: true, raf: 0, last: 0 }

  function toast(msg: string): void {
    flashLabel = msg
    flashUntil = performance.now() + 1100
  }

  function hudTitle(): string {
    const boss = enemies.find((e) => e.kind === 'boss')
    if (boss) return `스페이스2 BOSS ${Math.max(0, Math.ceil(boss.hp))}`
    return `스페이스2 Lv${wave}/${GYEOKPA_MAX_LEVEL} · ${gyeokpaWeaponLabel(weapon)}${combo > 1 ? ` · x${combo}` : ''}`
  }

  function syncLevel(): void {
    const next = Math.max(1, Math.min(GYEOKPA_MAX_LEVEL, wave))
    const noted = noteLevel('gyeokpa', level, next, score, onScore)
    level = noted.level
    if (noted.levelUpUntil) levelUpUntil = noted.levelUpUntil
  }

  function queueWave(): void {
    // Longer waves so each of the 25 stages takes more time.
    const base = 12 + Math.min(wave, GYEOKPA_MAX_LEVEL) * 3 + stage * 2
    spawnLeft = base
    spawnCd = 0.4
    betweenWaves = 0
    if (wave % 5 === 0) {
      spawnLeft = 0
      spawnBoss()
    } else {
      toast(`스테이지 ${wave}/${GYEOKPA_MAX_LEVEL}`)
    }
  }

  function spawnBoss(): void {
    bossActive = true
    const hp = 80 + stage * 40 + Math.min(wave, GYEOKPA_MAX_LEVEL) * 12
    enemies.push({
      x: w / 2,
      y: -60,
      vx: 40 + stage * 6,
      vy: 40,
      r: 36,
      hp,
      maxHp: hp,
      kind: 'boss',
      score: 1200 + stage * 200,
      shootCd: 0.8,
      phase: 0,
    })
    toast(wave >= GYEOKPA_MAX_LEVEL ? '최종 보스!' : '보스 출현!')
  }

  function spawnEnemy(): void {
    const roll = Math.random()
    let kind: Enemy['kind'] = 'scout'
    if (roll > 0.78) kind = 'tank'
    else if (roll > 0.52) kind = 'zig'
    const x = 28 + Math.random() * (w - 56)
    const speed = gyeokpaEnemyFallSpeed(wave, stage)
    if (kind === 'scout') {
      enemies.push({
        x,
        y: -20,
        vx: (Math.random() - 0.5) * 40,
        vy: speed,
        r: 12,
        hp: 1 + Math.floor(stage / 2),
        maxHp: 1 + Math.floor(stage / 2),
        kind,
        score: 100,
        shootCd: 1.2 + Math.random(),
        phase: Math.random() * Math.PI * 2,
      })
    } else if (kind === 'zig') {
      enemies.push({
        x,
        y: -24,
        vx: 90 + stage * 10,
        vy: speed * 0.75,
        r: 13,
        hp: 2,
        maxHp: 2,
        kind,
        score: 140,
        shootCd: 1.4,
        phase: 0,
      })
    } else {
      enemies.push({
        x,
        y: -28,
        vx: 20,
        vy: speed * 0.55,
        r: 18,
        hp: 4 + stage,
        maxHp: 4 + stage,
        kind,
        score: 220,
        shootCd: 1.8,
        phase: 0,
      })
    }
  }

  function burst(x: number, y: number, n: number, color: string): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 40 + Math.random() * 160
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.35,
        max: 0.7,
        color,
        size: 1.5 + Math.random() * 2.5,
      })
    }
  }

  function reset(): void {
    const sized = sizeCanvas(canvas)
    w = sized.w
    h = sized.h
    score = 0
    kills = 0
    level = 1
    levelUpUntil = 0
    over = false
    cleared = false
    lives = 3
    inv = 1.2
    shield = 0
    shipX = w / 2
    shipY = h * 0.82
    targetX = shipX
    targetY = shipY
    weapon = 'pulse'
    fireCd = 0
    wave = 1
    stage = 1
    betweenWaves = 1.5
    spawnLeft = 0
    spawnCd = 0
    bossActive = false
    combo = 0
    comboT = 0
    flashLabel = ''
    flashUntil = 0
    shake = 0
    screenFlash = 0
    bullets = []
    enemies = []
    powers = []
    particles = []
    stars = Array.from({ length: 48 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: 0.3 + Math.random() * 1.4,
      s: 0.6 + Math.random() * 1.8,
    }))
    queueWave()
    onScore?.(0, level)
  }

  function finish(win: boolean): void {
    if (over) return
    over = true
    cleared = win
    bumpBest('gyeokpa', score)
    bumpBestLevel('gyeokpa', Math.max(level, Math.min(wave, GYEOKPA_MAX_LEVEL)))
    onScore?.(score, level)
    toast(win ? `스페이스2 클리어! (Lv${GYEOKPA_MAX_LEVEL})` : 'GAME OVER')
  }

  function hurt(): void {
    if (inv > 0) return
    if (shield > 0) {
      shield = 0
      inv = 1
      toast('실드 파괴!')
      return
    }
    lives -= 1
    combo = 0
    inv = 1.6
    shake = 10
    screenFlash = 0.25
    if (lives <= 0) finish(false)
  }

  function detonateBomb(): void {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]!
      if (e.kind === 'boss') {
        e.hp -= 18
        if (e.hp <= 0) killEnemy(e, i)
      } else {
        killEnemy(e, i)
      }
    }
    bullets = bullets.filter((b) => b.friendly)
    screenFlash = 0.35
    shake = 14
    toast('폭탄!')
  }

  function killEnemy(e: Enemy, idx: number): void {
    enemies.splice(idx, 1)
    kills += 1
    combo += 1
    comboT = 1.6
    const mult = 1 + Math.floor(combo / 5) * 0.15
    score += Math.floor(e.score * mult)
    burst(e.x, e.y, e.kind === 'boss' ? 28 : 12, e.kind === 'boss' ? '#ff5a4a' : '#3de0c5')
    if (e.kind === 'boss') {
      bossActive = false
      toast('보스 격파!')
      powers.push({ x: e.x, y: e.y, kind: 'weapon', life: 8 })
      powers.push({ x: e.x + 24, y: e.y + 10, kind: 'life', life: 8 })
    } else if (Math.random() < 0.12 + stage * 0.02) {
      const kinds: Power['kind'][] = ['weapon', 'shield', 'bomb', 'life']
      powers.push({
        x: e.x,
        y: e.y,
        kind: kinds[Math.floor(Math.random() * kinds.length)]!,
        life: 7,
      })
    }
    syncLevel()
    onScore?.(score, level)
  }

  function fire(): void {
    const mk = (ox: number, oy: number, vx: number, vy: number, dmg: number, r = 3.5) => {
      bullets.push({ x: shipX + ox, y: shipY + oy, vx, vy, r, dmg, friendly: true })
    }
    if (weapon === 'pulse') {
      mk(0, -12, 0, -620, 1)
    } else if (weapon === 'twin') {
      mk(-8, -8, 0, -640, 1)
      mk(8, -8, 0, -640, 1)
    } else if (weapon === 'spread') {
      mk(0, -10, 0, -600, 1)
      mk(-4, -8, -160, -560, 1)
      mk(4, -8, 160, -560, 1)
    } else {
      // Long-range piercing beam anchored to the ship tip (사정거리).
      const reach = Math.max(GYEOKPA_LASER_BEAM_LEN, Math.floor(h * 0.72))
      bullets = bullets.filter((b) => !(b.friendly && b.laser))
      bullets.push({
        x: shipX,
        y: shipY - 14,
        vx: 0,
        vy: 0,
        r: 5,
        dmg: 0.6,
        friendly: true,
        laser: true,
        laserLen: reach,
        life: 0.07,
      })
    }
  }

  function step(dt: number): void {
    if (over) return
    shake = Math.max(0, shake - dt * 28)
    screenFlash = Math.max(0, screenFlash - dt)
    inv = Math.max(0, inv - dt)
    shield = Math.max(0, shield - dt)
    comboT = Math.max(0, comboT - dt)
    if (comboT <= 0) combo = 0

    shipX += (targetX - shipX) * Math.min(1, dt * 14)
    shipY += (targetY - shipY) * Math.min(1, dt * 14)

    fireCd -= dt
    const rate = weapon === 'laser' ? 0.05 : weapon === 'spread' ? 0.16 : weapon === 'twin' ? 0.12 : 0.14
    if (fireCd <= 0) {
      fire()
      fireCd = rate
    }

    for (const s of stars) {
      s.y += (40 + s.z * 90) * dt
      if (s.y > h) {
        s.y = -4
        s.x = Math.random() * w
      }
    }

    if (!bossActive && betweenWaves > 0) {
      betweenWaves -= dt
      if (betweenWaves <= 0) queueWave()
    } else if (!bossActive && spawnLeft > 0) {
      spawnCd -= dt
      if (spawnCd <= 0) {
        spawnEnemy()
        spawnLeft -= 1
        spawnCd = gyeokpaSpawnInterval(wave, stage)
      }
    } else if (!bossActive && spawnLeft <= 0 && enemies.length === 0 && !cleared) {
      if (wave >= GYEOKPA_MAX_LEVEL) {
        finish(true)
        return
      }
      wave += 1
      betweenWaves = 1.5
      syncLevel()
      toast(`다음 스테이지 ${wave}/${GYEOKPA_MAX_LEVEL}`)
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]!
      e.phase += dt
      if (e.kind === 'zig') {
        e.x += Math.sin(e.phase * 4) * e.vx * dt
        e.y += e.vy * dt
      } else if (e.kind === 'boss') {
        if (e.y < 90) e.y += e.vy * dt
        else {
          e.x += e.vx * dt
          if (e.x < 50 || e.x > w - 50) e.vx *= -1
        }
        e.shootCd -= dt
        if (e.shootCd <= 0) {
          const pattern = Math.floor(e.phase) % 3
          if (pattern === 0) {
            for (let a = -2; a <= 2; a++) {
              const ang = Math.PI / 2 + a * 0.22
              bullets.push({
                x: e.x,
                y: e.y + 20,
                vx: Math.cos(ang) * 180,
                vy: Math.sin(ang) * 220,
                r: 4,
                dmg: 1,
                friendly: false,
              })
            }
          } else if (pattern === 1) {
            const dx = shipX - e.x
            const dy = shipY - e.y
            const len = Math.hypot(dx, dy) || 1
            bullets.push({
              x: e.x,
              y: e.y + 16,
              vx: (dx / len) * 260,
              vy: (dy / len) * 260,
              r: 5,
              dmg: 1,
              friendly: false,
            })
          } else {
            for (let k = 0; k < 8; k++) {
              const ang = (k / 8) * Math.PI * 2 + e.phase
              bullets.push({
                x: e.x,
                y: e.y,
                vx: Math.cos(ang) * 140,
                vy: Math.sin(ang) * 140,
                r: 3.5,
                dmg: 1,
                friendly: false,
              })
            }
          }
          e.shootCd = 0.85
        }
      } else {
        e.x += e.vx * dt
        e.y += e.vy * dt
        if (e.x < 16 || e.x > w - 16) e.vx *= -1
        e.shootCd -= dt
        if (e.shootCd <= 0 && e.y > 40 && e.y < h * 0.65) {
          const dx = shipX - e.x
          const dy = shipY - e.y
          const len = Math.hypot(dx, dy) || 1
          bullets.push({
            x: e.x,
            y: e.y + 8,
            vx: (dx / len) * (150 + wave * 8),
            vy: (dy / len) * (150 + wave * 8),
            r: 3.5,
            dmg: 1,
            friendly: false,
          })
          e.shootCd = 1.4 + Math.random()
        }
      }
      if (e.y > h + 50) {
        enemies.splice(i, 1)
        continue
      }
      if (Math.hypot(e.x - shipX, e.y - shipY) < e.r + 12) {
        hurt()
        if (e.kind !== 'boss' && e.kind !== 'tank') killEnemy(e, i)
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]!
      if (b.laser && b.friendly) {
        // Keep beam locked to the ship so range stays constant while firing.
        b.x = shipX
        b.y = shipY - 14
        b.laserLen = Math.max(GYEOKPA_LASER_BEAM_LEN, Math.floor(h * 0.72))
      } else {
        b.x += b.vx * dt
        b.y += b.vy * dt
      }
      if (b.life != null) {
        b.life -= dt
        if (b.life <= 0) {
          bullets.splice(i, 1)
          continue
        }
      }
      if (!b.laser && (b.y < -40 || b.y > h + 40 || b.x < -40 || b.x > w + 40)) {
        bullets.splice(i, 1)
        continue
      }
      if (b.friendly) {
        for (let ei = enemies.length - 1; ei >= 0; ei--) {
          const e = enemies[ei]!
          let hit = false
          if (b.laser) {
            const len = b.laserLen ?? GYEOKPA_LASER_BEAM_LEN
            const beamTop = b.y - len
            const beamBot = b.y + 4
            hit =
              Math.abs(e.x - b.x) <= e.r + b.r &&
              e.y + e.r >= beamTop &&
              e.y - e.r <= beamBot
          } else {
            hit = Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r
          }
          if (hit) {
            e.hp -= b.dmg
            if (!b.laser) bullets.splice(i, 1)
            if (e.hp <= 0) killEnemy(e, ei)
            if (!b.laser) break
          }
        }
      } else if (Math.hypot(shipX - b.x, shipY - b.y) < 14 + b.r) {
        bullets.splice(i, 1)
        hurt()
      }
    }

    for (let i = powers.length - 1; i >= 0; i--) {
      const p = powers[i]!
      p.y += 75 * dt
      p.life -= dt
      if (p.y > h + 20 || p.life <= 0) {
        powers.splice(i, 1)
        continue
      }
      if (Math.hypot(p.x - shipX, p.y - shipY) < 26) {
        if (p.kind === 'weapon') {
          weapon = gyeokpaNextWeapon(weapon)
          toast(`무기: ${gyeokpaWeaponLabel(weapon)}`)
        } else if (p.kind === 'life') {
          lives = Math.min(5, lives + 1)
          toast(`라이프 ${lives}`)
        } else if (p.kind === 'shield') {
          shield = 5
          toast('실드')
        } else {
          detonateBomb()
        }
        powers.splice(i, 1)
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]!
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.life <= 0) particles.splice(i, 1)
    }
  }

  function draw(): void {
    const sized = sizeCanvas(canvas)
    w = sized.w
    h = sized.h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.save()
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake)
    }
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#0b1a2b')
    g.addColorStop(1, '#050b12')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = 'rgba(207,231,255,0.45)'
    for (const s of stars) {
      ctx.fillRect(s.x, s.y, s.s, s.s)
    }

    for (const p of powers) {
      ctx.fillStyle =
        p.kind === 'weapon' ? '#3de0c5' : p.kind === 'life' ? '#ff5a4a' : p.kind === 'shield' ? '#f0c35a' : '#ff8a5b'
      ctx.beginPath()
      ctx.moveTo(p.x, p.y - 8)
      ctx.lineTo(p.x + 8, p.y)
      ctx.lineTo(p.x, p.y + 8)
      ctx.lineTo(p.x - 8, p.y)
      ctx.closePath()
      ctx.fill()
    }

    for (const b of bullets) {
      if (b.friendly) {
        if (b.laser) {
          const len = b.laserLen ?? GYEOKPA_LASER_BEAM_LEN
          const top = b.y - len
          ctx.fillStyle = 'rgba(124,255,239,0.22)'
          ctx.fillRect(b.x - 4.5, top, 9, len)
          ctx.fillStyle = '#7cffef'
          ctx.fillRect(b.x - 2, top, 4, len)
        } else {
          ctx.fillStyle = '#ffd1c8'
          ctx.beginPath()
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        ctx.fillStyle = '#ff7a6b'
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    for (const e of enemies) {
      if (e.kind === 'boss') {
        ctx.fillStyle = '#8aa3bd'
        ctx.fillRect(e.x - 34, e.y - 22, 68, 44)
        ctx.fillStyle = '#ff5a4a'
        ctx.fillRect(e.x - 10, e.y + 4, 20, 16)
        // boss hp bar
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(e.x - 40, e.y - 34, 80, 6)
        ctx.fillStyle = '#ff5a4a'
        ctx.fillRect(e.x - 40, e.y - 34, 80 * Math.max(0, e.hp / e.maxHp), 6)
      } else if (e.kind === 'tank') {
        ctx.fillStyle = '#8aa3bd'
        ctx.fillRect(e.x - 15, e.y - 11, 30, 22)
        ctx.fillStyle = '#ff5a4a'
        ctx.fillRect(e.x - 5, e.y + 2, 10, 12)
      } else if (e.kind === 'zig') {
        ctx.fillStyle = '#3de0c5'
        ctx.beginPath()
        ctx.moveTo(e.x, e.y + 12)
        ctx.lineTo(e.x + 12, e.y - 9)
        ctx.lineTo(e.x, e.y - 3)
        ctx.lineTo(e.x - 12, e.y - 9)
        ctx.closePath()
        ctx.fill()
      } else {
        ctx.fillStyle = '#f0c35a'
        ctx.beginPath()
        ctx.moveTo(e.x, e.y + 11)
        ctx.lineTo(e.x + 10, e.y - 9)
        ctx.lineTo(e.x - 10, e.y - 9)
        ctx.closePath()
        ctx.fill()
      }
    }

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max)
      ctx.fillStyle = p.color
      ctx.fillRect(p.x, p.y, p.size, p.size)
      ctx.globalAlpha = 1
    }

    if (!(inv > 0 && Math.floor(inv * 18) % 2 === 0)) {
      if (shield > 0) {
        ctx.strokeStyle = 'rgba(240,195,90,0.75)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(shipX, shipY, 20, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.fillStyle = '#e8f2ff'
      ctx.beginPath()
      ctx.moveTo(shipX, shipY - 15)
      ctx.lineTo(shipX + 11, shipY + 11)
      ctx.lineTo(shipX, shipY + 5)
      ctx.lineTo(shipX - 11, shipY + 11)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#ff5a4a'
      ctx.fillRect(shipX - 2.5, shipY + 7, 5, 7)
    }

    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < lives ? '#ff5a4a' : 'rgba(255,90,74,0.25)'
      ctx.beginPath()
      ctx.arc(12 + i * 12, h - 12, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    if (screenFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.45, screenFlash)})`
      ctx.fillRect(0, 0, w, h)
    }

    drawHud(ctx, w, h, score, level, over, hudTitle(), { levelUpUntil, cleared })
    if (!over && performance.now() < flashUntil) {
      ctx.fillStyle = 'rgba(61,224,197,0.16)'
      ctx.fillRect(0, h * 0.48, w, 36)
      ctx.fillStyle = '#7cffef'
      ctx.font = '700 15px Orbitron, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(flashLabel, w / 2, h * 0.48 + 24)
    }
    ctx.restore()
  }

  function frame(t: number): void {
    if (!loop.running) return
    if (!loop.last) loop.last = t
    const dt = Math.min(0.033, (t - loop.last) / 1000)
    loop.last = t
    step(dt)
    draw()
    loop.raf = requestAnimationFrame(frame)
  }

  reset()
  loop.raf = requestAnimationFrame(frame)

  return {
    stop: () => {
      loop.running = false
      cancelAnimationFrame(loop.raf)
    },
    pointer: (x, y, type) => {
      if (over && type === 'down') {
        reset()
        return
      }
      if (over) return
      targetX = Math.max(18, Math.min(w - 18, x))
      targetY = Math.max(h * 0.45, Math.min(h - 28, y))
    },
    restart: () => reset(),
    getScore: () => score,
    getLevel: () => level,
    isOver: () => over,
  }
}


export function mountArcade(
  id: ArcadeId,
  canvas: HTMLCanvasElement,
  onScore?: ScoreCb,
): ArcadeHandle {
  if (id === 'breakout') return mountBreakout(canvas, onScore)
  if (id === 'shooter') return mountShooter(canvas, onScore)
  if (id === 'flappy') return mountFlappy(canvas, onScore)
  if (id === 'dodge') return mountDodge(canvas, onScore)
  if (id === 'slide') return mountSlide(canvas, onScore)
  if (id === 'gyeokpa') return mountGyeokpa(canvas, onScore)
  return mountPong(canvas, onScore)
}

/** Pure helpers for unit tests */
export function breakoutPaddleBounce(ballX: number, paddleX: number, paddleW: number): number {
  const hit = (ballX - (paddleX + paddleW / 2)) / (paddleW / 2)
  return hit * 220
}

export function pongPaddleBounce(ballX: number, paddleX: number, paddleW: number): number {
  const hit = (ballX - (paddleX + paddleW / 2)) / (paddleW / 2)
  return hit * 260
}

export function flappyPipeCleared(birdX: number, pipeX: number, pipeW: number, already: boolean): boolean {
  if (already) return false
  return pipeX + pipeW < birdX
}
