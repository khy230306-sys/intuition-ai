/** Offline arcade games — canvas, no network. */

export type ArcadeId = 'snake' | 'breakout' | 'shooter' | 'flappy' | 'dodge' | 'pong'

export const ARCADE_META: Record<ArcadeId, { title: string; blurb: string }> = {
  snake: { title: '스네이크', blurb: '먹이를 먹고 몸을 늘리세요 · 벽·몸에 닿으면 끝' },
  breakout: { title: '벽돌깨기', blurb: '패들로 공을 튕겨 벽돌을 깨세요' },
  shooter: { title: '스페이스', blurb: '좌우로 움직이며 적을 격추하세요' },
  flappy: { title: '플래피', blurb: '탭해서 날아오르고 기둥을 피하세요' },
  dodge: { title: '닷지', blurb: '좌우로 피해 떨어지는 장애물을 피하세요' },
  pong: { title: '퐁', blurb: '패들로 공을 계속 받아치세요' },
}

const BEST_KEY = 'jarvis.arcade.best.v1'

export type ArcadeBest = {
  snake: number | null
  breakout: number | null
  shooter: number | null
  flappy: number | null
  dodge: number | null
  pong: number | null
}

const EMPTY_BEST: ArcadeBest = {
  snake: null,
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
    return { ...EMPTY_BEST, ...JSON.parse(raw) }
  } catch {
    return { ...EMPTY_BEST }
  }
}

function saveBest(best: ArcadeBest): void {
  localStorage.setItem(BEST_KEY, JSON.stringify(best))
}

function bumpBest(game: ArcadeId, score: number): void {
  const best = loadArcadeBest()
  const cur = best[game]
  if (cur == null || score > cur) {
    best[game] = score
    saveBest(best)
  }
}

export type ArcadeHandle = {
  stop: () => void
  setDir?: (dx: number, dy: number) => void
  pointer: (x: number, y: number, type: 'down' | 'move' | 'up') => void
  restart: () => void
  getScore: () => number
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
  over: boolean,
  title: string,
  cleared = false,
): void {
  ctx.fillStyle = 'rgba(8,14,22,0.55)'
  ctx.fillRect(0, 0, w, 28)
  ctx.fillStyle = '#5affe8'
  ctx.font = '600 13px IBM Plex Sans KR, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`${title}  SCORE ${score}`, 10, 18)
  if (over || cleared) {
    ctx.fillStyle = 'rgba(0,0,0,0.62)'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#fff'
    ctx.font = '700 22px Orbitron, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(cleared ? 'CLEAR!' : 'GAME OVER', w / 2, h * 0.36)
    const bw = 168
    const bh = 48
    const bx = w / 2 - bw / 2
    const by = h * 0.36 + 28
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

/** —— SNAKE —— */
export function mountSnake(canvas: HTMLCanvasElement, onScore?: (n: number) => void): ArcadeHandle {
  const cols = 16
  const rows = 22
  let dir = { x: 1, y: 0 }
  let nextDir = { x: 1, y: 0 }
  let snake = [
    { x: 4, y: 10 },
    { x: 3, y: 10 },
    { x: 2, y: 10 },
  ]
  let food = { x: 10, y: 10 }
  let score = 0
  let over = false
  let acc = 0
  const step = 1 / 9
  const loop: Loop = { running: true, raf: 0, last: 0 }

  function placeFood(): void {
    for (let i = 0; i < 200; i++) {
      const x = Math.floor(Math.random() * cols)
      const y = Math.floor(Math.random() * rows)
      if (!snake.some((s) => s.x === x && s.y === y)) {
        food = { x, y }
        return
      }
    }
  }

  function reset(): void {
    dir = { x: 1, y: 0 }
    nextDir = { x: 1, y: 0 }
    snake = [
      { x: 4, y: 10 },
      { x: 3, y: 10 },
      { x: 2, y: 10 },
    ]
    score = 0
    over = false
    placeFood()
    onScore?.(score)
  }

  function tick(): void {
    if (over) return
    dir = nextDir
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }
    if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows || snake.some((s) => s.x === head.x && s.y === head.y)) {
      over = true
      bumpBest('snake', score)
      onScore?.(score)
      return
    }
    snake.unshift(head)
    if (head.x === food.x && head.y === food.y) {
      score += 10
      onScore?.(score)
      placeFood()
    } else {
      snake.pop()
    }
  }

  function draw(): void {
    const { w, h } = sizeCanvas(canvas)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const cellW = w / cols
    const cellH = (h - 28) / rows
    ctx.fillStyle = '#070b12'
    ctx.fillRect(0, 0, w, h)
    // grid vibe
    ctx.strokeStyle = 'rgba(0,210,190,0.06)'
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath()
      ctx.moveTo(x * cellW, 28)
      ctx.lineTo(x * cellW, h)
      ctx.stroke()
    }
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(food.x * cellW + 2, 28 + food.y * cellH + 2, cellW - 4, cellH - 4)
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#5affe8' : '#00d2be'
      ctx.fillRect(s.x * cellW + 1, 28 + s.y * cellH + 1, cellW - 2, cellH - 2)
    })
    drawHud(ctx, w, h, score, over, 'SNAKE')
  }

  function frame(t: number): void {
    if (!loop.running) return
    if (!loop.last) loop.last = t
    const dt = Math.min(0.05, (t - loop.last) / 1000)
    loop.last = t
    if (!over) {
      acc += dt
      while (acc >= step) {
        acc -= step
        tick()
      }
    }
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
    setDir: (dx, dy) => {
      if (over) return
      if (dx === -dir.x && dy === -dir.y) return
      if (dx === 0 && dy === 0) return
      nextDir = { x: dx, y: dy }
    },
    pointer: (_x, _y, type) => {
      if (type === 'down' && over) {
        reset()
        acc = 0
      }
    },
    restart: () => {
      reset()
      acc = 0
    },
    getScore: () => score,
    isOver: () => over,
  }
}

/** —— BREAKOUT —— */
export function mountBreakout(canvas: HTMLCanvasElement, onScore?: (n: number) => void): ArcadeHandle {
  let score = 0
  let over = false
  let won = false
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
    const rows = 5
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

  function reset(): void {
    const sized = sizeCanvas(canvas)
    w = sized.w
    h = sized.h
    score = 0
    over = false
    won = false
    paddleX = w / 2 - paddleW / 2
    ball = { x: w / 2, y: h - 60, vx: 140 * (Math.random() > 0.5 ? 1 : -1), vy: -220 }
    buildBricks()
    onScore?.(score)
  }

  function step(dt: number): void {
    if (over || won) return
    ball.x += ball.vx * dt
    ball.y += ball.vy * dt
    if (ball.x < ballR || ball.x > w - ballR) ball.vx *= -1
    if (ball.y < 28 + ballR) ball.vy = Math.abs(ball.vy)
    // paddle
    const py = h - 28
    if (ball.y + ballR >= py && ball.y + ballR <= py + paddleH + 8 && ball.x >= paddleX && ball.x <= paddleX + paddleW && ball.vy > 0) {
      ball.vy = -Math.abs(ball.vy)
      const hit = (ball.x - (paddleX + paddleW / 2)) / (paddleW / 2)
      ball.vx = hit * 220
      ball.y = py - ballR
    }
    if (ball.y > h) {
      over = true
      bumpBest('breakout', score)
      onScore?.(score)
      return
    }
    for (const b of bricks) {
      if (!b.alive) continue
      if (ball.x > b.x && ball.x < b.x + b.w && ball.y > b.y && ball.y < b.y + b.h) {
        b.alive = false
        ball.vy *= -1
        score += 10
        onScore?.(score)
        break
      }
    }
    if (bricks.every((b) => !b.alive)) {
      won = true
      score += 100
      bumpBest('breakout', score)
      onScore?.(score)
    }
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
    if (won) {
      // handled in drawHud as cleared
    }
    drawHud(ctx, w, h, score, over, 'BREAKOUT', won)
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
      if ((over || won) && type === 'down') {
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
    isOver: () => over || won,
  }
}

/** —— SPACE SHOOTER —— */
export function mountShooter(canvas: HTMLCanvasElement, onScore?: (n: number) => void): ArcadeHandle {
  let w = 320
  let h = 420
  let score = 0
  let over = false
  let shipX = 160
  let bullets: Array<{ x: number; y: number }> = []
  let enemies: Array<{ x: number; y: number; vx: number; hp: number }> = []
  let spawnAcc = 0
  let fireAcc = 0
  const loop: Loop = { running: true, raf: 0, last: 0 }

  function reset(): void {
    const sized = sizeCanvas(canvas)
    w = sized.w
    h = sized.h
    score = 0
    over = false
    shipX = w / 2
    bullets = []
    enemies = []
    spawnAcc = 0
    fireAcc = 0
    onScore?.(score)
  }

  function step(dt: number): void {
    if (over) return
    fireAcc += dt
    if (fireAcc > 0.28) {
      fireAcc = 0
      bullets.push({ x: shipX, y: h - 50 })
    }
    spawnAcc += dt
    if (spawnAcc > Math.max(0.35, 1.1 - score / 400)) {
      spawnAcc = 0
      enemies.push({
        x: 20 + Math.random() * (w - 40),
        y: 36,
        vx: (Math.random() - 0.5) * 80,
        hp: 1 + (score > 120 ? 1 : 0),
      })
    }
    bullets.forEach((b) => {
      b.y -= 380 * dt
    })
    bullets = bullets.filter((b) => b.y > 20)
    enemies.forEach((e) => {
      e.y += (55 + score * 0.15) * dt
      e.x += e.vx * dt
      if (e.x < 12 || e.x > w - 12) e.vx *= -1
    })
    for (const e of enemies) {
      for (const b of bullets) {
        if (Math.hypot(e.x - b.x, e.y - b.y) < 16) {
          e.hp -= 1
          b.y = -99
          if (e.hp <= 0) {
            e.y = 9999
            score += 15
            onScore?.(score)
          }
        }
      }
    }
    bullets = bullets.filter((b) => b.y > 20)
    enemies = enemies.filter((e) => e.y < h + 20)
    // collision with ship
    for (const e of enemies) {
      if (Math.hypot(e.x - shipX, e.y - (h - 36)) < 22 || e.y > h - 10) {
        over = true
        bumpBest('shooter', score)
        onScore?.(score)
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
    // stars
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    for (let i = 0; i < 30; i++) {
      ctx.fillRect((i * 47) % w, (i * 89 + score) % h, 2, 2)
    }
    // ship
    ctx.fillStyle = '#5affe8'
    ctx.beginPath()
    ctx.moveTo(shipX, h - 48)
    ctx.lineTo(shipX - 16, h - 22)
    ctx.lineTo(shipX + 16, h - 22)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#fbbf24'
    for (const b of bullets) {
      ctx.fillRect(b.x - 2, b.y - 8, 4, 10)
    }
    for (const e of enemies) {
      ctx.fillStyle = e.hp > 1 ? '#f472b6' : '#ff6b6b'
      ctx.fillRect(e.x - 12, e.y - 10, 24, 20)
    }
    drawHud(ctx, w, h, score, over, 'SPACE')
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
    isOver: () => over,
  }
}

/** —— FLAPPY —— */
export function mountFlappy(canvas: HTMLCanvasElement, onScore?: (n: number) => void): ArcadeHandle {
  let w = 320
  let h = 400
  let birdY = 180
  let birdV = 0
  let pipes: Array<{ x: number; gapY: number; scored: boolean }> = []
  let score = 0
  let over = false
  let spawn = 0
  const loop: Loop = { running: true, raf: 0, last: 0 }
  const birdR = 12
  const gap = 110
  const gravity = 980
  const flap = -320

  function reset(): void {
    const s = sizeCanvas(canvas)
    w = s.w
    h = s.h
    birdY = h * 0.4
    birdV = 0
    pipes = []
    score = 0
    over = false
    spawn = 0
    onScore?.(0)
  }

  function step(dt: number): void {
    if (over) return
    birdV += gravity * dt
    birdY += birdV * dt
    spawn += dt
    if (spawn > 1.35) {
      spawn = 0
      pipes.push({
        x: w + 20,
        gapY: 80 + Math.random() * (h - 160 - gap),
        scored: false,
      })
    }
    for (const p of pipes) p.x -= 140 * dt
    pipes = pipes.filter((p) => p.x > -40)
    for (const p of pipes) {
      if (!p.scored && p.x + 28 < w * 0.28) {
        p.scored = true
        score += 1
        bumpBest('flappy', score)
        onScore?.(score)
      }
      const inX = Math.abs(p.x + 14 - w * 0.28) < 14 + birdR * 0.7
      if (inX && (birdY - birdR < p.gapY || birdY + birdR > p.gapY + gap)) {
        over = true
        bumpBest('flappy', score)
      }
    }
    if (birdY - birdR < 0 || birdY + birdR > h) {
      over = true
      bumpBest('flappy', score)
    }
  }

  function draw(): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const s = sizeCanvas(canvas)
    w = s.w
    h = s.h
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
    drawHud(ctx, w, h, score, over, 'FLAPPY')
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
    isOver: () => over,
  }
}

/** —— DODGE —— */
export function mountDodge(canvas: HTMLCanvasElement, onScore?: (n: number) => void): ArcadeHandle {
  let w = 320
  let h = 400
  let playerX = 160
  let hazards: Array<{ x: number; y: number; s: number; vy: number }> = []
  let score = 0
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
    over = false
    spawn = 0
    elapsed = 0
    onScore?.(0)
  }

  function step(dt: number): void {
    if (over) return
    elapsed += dt
    spawn += dt
    const rate = Math.max(0.28, 0.9 - elapsed * 0.02)
    if (spawn > rate) {
      spawn = 0
      const s = 18 + Math.random() * 22
      hazards.push({
        x: s / 2 + Math.random() * (w - s),
        y: -s,
        s,
        vy: 160 + Math.random() * 120 + elapsed * 8,
      })
    }
    for (const hz of hazards) hz.y += hz.vy * dt
    const before = hazards.length
    hazards = hazards.filter((hz) => hz.y - hz.s < h + 10)
    const passed = before - hazards.length
    if (passed > 0) {
      score += passed
      bumpBest('dodge', score)
      onScore?.(score)
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
    drawHud(ctx, w, h, score, over, 'DODGE')
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
    isOver: () => over,
  }
}

/** —— PONG (solo wall) —— */
export function mountPong(canvas: HTMLCanvasElement, onScore?: (n: number) => void): ArcadeHandle {
  let w = 320
  let h = 400
  let paddleX = 120
  let ball = { x: 160, y: 200, vx: 160, vy: -220 }
  let score = 0
  let over = false
  const loop: Loop = { running: true, raf: 0, last: 0 }
  const paddleW = 78
  const paddleH = 12
  const ballR = 8

  function reset(): void {
    const s = sizeCanvas(canvas)
    w = s.w
    h = s.h
    paddleX = w / 2 - paddleW / 2
    ball = { x: w / 2, y: h * 0.45, vx: 150 * (Math.random() < 0.5 ? -1 : 1), vy: -230 }
    score = 0
    over = false
    onScore?.(0)
  }

  function step(dt: number): void {
    if (over) return
    ball.x += ball.vx * dt
    ball.y += ball.vy * dt
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
      ball.x <= paddleX + paddleW
    ) {
      ball.y = py - ballR
      ball.vy = -Math.abs(ball.vy) * 1.03
      ball.vx = pongPaddleBounce(ball.x, paddleX, paddleW)
      score += 1
      bumpBest('pong', score)
      onScore?.(score)
    }
    if (ball.y - ballR > h) {
      over = true
      bumpBest('pong', score)
    }
  }

  function draw(): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const s = sizeCanvas(canvas)
    w = s.w
    h = s.h
    ctx.fillStyle = '#071018'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#5ac8ff'
    ctx.fillRect(paddleX, h - 36, paddleW, paddleH)
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ballR, 0, Math.PI * 2)
    ctx.fill()
    drawHud(ctx, w, h, score, over, 'PONG')
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
      paddleX = Math.max(0, Math.min(w - paddleW, x - paddleW / 2))
    },
    restart: () => reset(),
    getScore: () => score,
    isOver: () => over,
  }
}

export function mountArcade(
  id: ArcadeId,
  canvas: HTMLCanvasElement,
  onScore?: (n: number) => void,
): ArcadeHandle {
  if (id === 'snake') return mountSnake(canvas, onScore)
  if (id === 'breakout') return mountBreakout(canvas, onScore)
  if (id === 'shooter') return mountShooter(canvas, onScore)
  if (id === 'flappy') return mountFlappy(canvas, onScore)
  if (id === 'dodge') return mountDodge(canvas, onScore)
  return mountPong(canvas, onScore)
}

/** Pure helpers for unit tests */
export function snakeWouldHitSelf(
  snake: Array<{ x: number; y: number }>,
  next: { x: number; y: number },
): boolean {
  return snake.some((s) => s.x === next.x && s.y === next.y)
}

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
