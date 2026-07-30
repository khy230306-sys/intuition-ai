/** Offline arcade games — canvas, no network. Level-up progression. */

export type ArcadeId = 'breakout' | 'shooter' | 'flappy' | 'dodge' | 'pong'

export const ARCADE_META: Record<ArcadeId, { title: string; blurb: string }> = {
  breakout: { title: '벽돌깨기', blurb: '스테이지를 깨면 다음 레벨 · 벽돌·속도 증가' },
  shooter: { title: '스페이스', blurb: '아이템으로 미사일 진화 · 5기마다 레벨업' },
  flappy: { title: '플래피', blurb: '기둥 5개마다 레벨업 · 간격 축소' },
  dodge: { title: '닷지', blurb: '8개 회피마다 레벨업 · 낙하 가속' },
  pong: { title: '퐁', blurb: '5회 받아칠 때마다 레벨업 · 공 가속' },
}

const BEST_KEY = 'jarvis.arcade.best.v1'
const LEVEL_KEY = 'jarvis.arcade.bestLevel.v1'

export type ArcadeBest = {
  breakout: number | null
  shooter: number | null
  flappy: number | null
  dodge: number | null
  pong: number | null
}

export type ArcadeBestLevel = ArcadeBest

const EMPTY_BEST: ArcadeBest = {
  breakout: null,
  shooter: null,
  flappy: null,
  dodge: null,
  pong: null,
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

/** How many progress units needed to advance one level. */
export function unitsPerLevel(id: ArcadeId): number {
  switch (id) {
    case 'breakout':
      return 1
    case 'shooter':
      return 5
    case 'flappy':
      return 5
    case 'dodge':
      return 8
    case 'pong':
      return 5
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
    const rows = Math.min(9, 4 + level)
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
    return 200 + level * 28
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
    levelUpUntil = 0
    over = false
    paddleX = w / 2 - paddleW / 2
    buildBricks()
    resetBall()
    onScore?.(score, level)
  }

  function nextStage(): void {
    score += 100
    const next = level + 1
    const noted = noteLevel('breakout', level, next, score, onScore)
    level = noted.level
    levelUpUntil = noted.levelUpUntil || performance.now() + 1200
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

export function nextWeaponTier(tier: number): ShooterWeaponTier {
  return Math.min(5, Math.max(1, Math.floor(tier) + 1)) as ShooterWeaponTier
}

export function shooterFirePattern(
  tier: ShooterWeaponTier,
  shipX: number,
  shipY: number,
): Array<{ x: number; y: number; vx: number; vy: number; dmg: number; pierce: number; color: string; w: number; h: number }> {
  const up = -1
  if (tier === 1) {
    return [{ x: shipX, y: shipY, vx: 0, vy: up, dmg: 1, pierce: 0, color: '#fbbf24', w: 4, h: 10 }]
  }
  if (tier === 2) {
    return [
      { x: shipX - 8, y: shipY, vx: 0, vy: up, dmg: 1, pierce: 0, color: '#fbbf24', w: 4, h: 10 },
      { x: shipX + 8, y: shipY, vx: 0, vy: up, dmg: 1, pierce: 0, color: '#fbbf24', w: 4, h: 10 },
    ]
  }
  if (tier === 3) {
    return [
      { x: shipX, y: shipY - 2, vx: 0, vy: up, dmg: 1, pierce: 0, color: '#5affe8', w: 5, h: 12 },
      { x: shipX - 12, y: shipY, vx: -0.15, vy: up, dmg: 1, pierce: 0, color: '#fbbf24', w: 4, h: 10 },
      { x: shipX + 12, y: shipY, vx: 0.15, vy: up, dmg: 1, pierce: 0, color: '#fbbf24', w: 4, h: 10 },
    ]
  }
  if (tier === 4) {
    return [
      { x: shipX, y: shipY - 2, vx: 0, vy: up, dmg: 2, pierce: 0, color: '#a78bfa', w: 5, h: 12 },
      { x: shipX - 10, y: shipY, vx: -0.28, vy: up, dmg: 1, pierce: 0, color: '#60a5fa', w: 4, h: 10 },
      { x: shipX + 10, y: shipY, vx: 0.28, vy: up, dmg: 1, pierce: 0, color: '#60a5fa', w: 4, h: 10 },
      { x: shipX - 18, y: shipY + 2, vx: -0.5, vy: up, dmg: 1, pierce: 0, color: '#f472b6', w: 3, h: 9 },
      { x: shipX + 18, y: shipY + 2, vx: 0.5, vy: up, dmg: 1, pierce: 0, color: '#f472b6', w: 3, h: 9 },
    ]
  }
  // Mk.5 — heavy pierce lasers
  return [
    { x: shipX, y: shipY - 4, vx: 0, vy: up, dmg: 3, pierce: 3, color: '#5affe8', w: 6, h: 18 },
    { x: shipX - 14, y: shipY, vx: -0.12, vy: up, dmg: 2, pierce: 2, color: '#00d2be', w: 5, h: 14 },
    { x: shipX + 14, y: shipY, vx: 0.12, vy: up, dmg: 2, pierce: 2, color: '#00d2be', w: 5, h: 14 },
  ]
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
  type Item = { x: number; y: number; kind: 'missile' }

  let w = 320
  let h = 420
  let score = 0
  let kills = 0
  let level = 1
  let levelUpUntil = 0
  let weapon: ShooterWeaponTier = 1
  let weaponFlashUntil = 0
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
    return Math.max(0.12, 0.32 - level * 0.012 - (weapon - 1) * 0.018)
  }

  function bulletSpeed(): number {
    return 340 + level * 18 + weapon * 12
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
    weaponFlashUntil = 0
    over = false
    shipX = w / 2
    bullets = []
    enemies = []
    items = []
    spawnAcc = 0
    fireAcc = 0
    onScore?.(score, level)
  }

  function dropMissileItem(x: number, y: number): void {
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
      for (const b of shooterFirePattern(weapon, shipX, shipY)) {
        bullets.push({
          ...b,
          vx: b.vx * spd,
          vy: b.vy * spd,
        })
      }
    }
    spawnAcc += dt
    if (spawnAcc > Math.max(0.28, 1.15 - level * 0.08)) {
      spawnAcc = 0
      enemies.push({
        x: 20 + Math.random() * (w - 40),
        y: 36,
        vx: (Math.random() - 0.5) * (70 + level * 10),
        hp: 1 + (level >= 3 ? 1 : 0) + (level >= 6 ? 1 : 0) + (level >= 9 ? 1 : 0),
      })
    }
    bullets.forEach((b) => {
      b.x += b.vx * dt
      b.y += b.vy * dt
    })
    bullets = bullets.filter((b) => b.y > 16 && b.y < h + 20 && b.x > -20 && b.x < w + 20)
    enemies.forEach((e) => {
      e.y += (50 + level * 12) * dt
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
            score += 15 + (weapon - 1) * 2
            kills += 1
            dropMissileItem(ex, ey)
            const next = levelFromUnits('shooter', kills)
            const noted = noteLevel('shooter', level, next, score, onScore)
            level = noted.level
            if (noted.levelUpUntil) levelUpUntil = noted.levelUpUntil
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
        if (it.kind === 'missile' && weapon < MAX_WEAPON) {
          weapon = nextWeaponTier(weapon)
          weaponFlashUntil = performance.now() + 1400
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
    // missile upgrade orbs
    for (const it of items) {
      ctx.fillStyle = 'rgba(90,255,232,0.2)'
      ctx.beginPath()
      ctx.arc(it.x, it.y, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#5affe8'
      ctx.beginPath()
      ctx.arc(it.x, it.y, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#041018'
      ctx.font = '700 9px Orbitron, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('M', it.x, it.y + 3)
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
    drawHud(ctx, w, h, score, level, over, `SPACE Mk.${weapon}`, { levelUpUntil })
    if (!over && performance.now() < weaponFlashUntil) {
      ctx.fillStyle = 'rgba(90,255,232,0.16)'
      ctx.fillRect(0, h * 0.48, w, 40)
      ctx.fillStyle = '#5affe8'
      ctx.font = '700 16px Orbitron, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`MISSILE Mk.${weapon}`, w / 2, h * 0.48 + 26)
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

export function mountArcade(
  id: ArcadeId,
  canvas: HTMLCanvasElement,
  onScore?: ScoreCb,
): ArcadeHandle {
  if (id === 'breakout') return mountBreakout(canvas, onScore)
  if (id === 'shooter') return mountShooter(canvas, onScore)
  if (id === 'flappy') return mountFlappy(canvas, onScore)
  if (id === 'dodge') return mountDodge(canvas, onScore)
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
