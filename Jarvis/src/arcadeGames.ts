/** Offline arcade games — canvas, no network. */

export type ArcadeId = 'snake' | 'breakout' | 'shooter'

export const ARCADE_META: Record<ArcadeId, { title: string; blurb: string }> = {
  snake: { title: '스네이크', blurb: '먹이를 먹고 몸을 늘리세요 · 벽·몸에 닿으면 끝' },
  breakout: { title: '벽돌깨기', blurb: '패들로 공을 튕겨 벽돌을 깨세요' },
  shooter: { title: '스페이스', blurb: '좌우로 움직이며 적을 격추하세요' },
}

const BEST_KEY = 'jarvis.arcade.best.v1'

export type ArcadeBest = {
  snake: number | null
  breakout: number | null
  shooter: number | null
}

export function loadArcadeBest(): ArcadeBest {
  try {
    const raw = localStorage.getItem(BEST_KEY)
    if (!raw) return { snake: null, breakout: null, shooter: null }
    return { snake: null, breakout: null, shooter: null, ...JSON.parse(raw) }
  } catch {
    return { snake: null, breakout: null, shooter: null }
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

function drawHud(ctx: CanvasRenderingContext2D, w: number, score: number, over: boolean, title: string): void {
  ctx.fillStyle = 'rgba(8,14,22,0.55)'
  ctx.fillRect(0, 0, w, 28)
  ctx.fillStyle = '#5affe8'
  ctx.font = '600 13px IBM Plex Sans KR, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`${title}  SCORE ${score}`, 10, 18)
  if (over) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, w, 9999)
    ctx.fillStyle = '#fff'
    ctx.font = '700 22px Orbitron, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('GAME OVER', w / 2, 160)
    ctx.font = '500 13px IBM Plex Sans KR, sans-serif'
    ctx.fillStyle = '#5affe8'
    ctx.fillText('다시 시작을 누르세요', w / 2, 190)
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
    drawHud(ctx, w, score, over, 'SNAKE')
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
      // no instant reverse
      if (dx === -dir.x && dy === -dir.y) return
      if (dx === 0 && dy === 0) return
      nextDir = { x: dx, y: dy }
    },
    pointer: () => undefined,
    restart: () => {
      reset()
      acc = 0
    },
    getScore: () => score,
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
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#5affe8'
      ctx.font = '700 22px Orbitron, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('CLEAR!', w / 2, 160)
    }
    drawHud(ctx, w, score, over, 'BREAKOUT')
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
      if (type === 'down') pointerDown = true
      if (type === 'up') pointerDown = false
      if (type === 'down' || type === 'move' || pointerDown) {
        paddleX = Math.max(0, Math.min(w - paddleW, x - paddleW / 2))
      }
    },
    restart: () => reset(),
    getScore: () => score,
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
    drawHud(ctx, w, score, over, 'SPACE')
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
    pointer: (x) => {
      if (over) return
      shipX = Math.max(16, Math.min(w - 16, x))
    },
    restart: () => reset(),
    getScore: () => score,
  }
}

export function mountArcade(
  id: ArcadeId,
  canvas: HTMLCanvasElement,
  onScore?: (n: number) => void,
): ArcadeHandle {
  if (id === 'snake') return mountSnake(canvas, onScore)
  if (id === 'breakout') return mountBreakout(canvas, onScore)
  return mountShooter(canvas, onScore)
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
