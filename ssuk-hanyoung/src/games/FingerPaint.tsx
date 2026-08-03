import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { PLAY_COLORS } from '../data/colors'
import { speak } from '../lib/speech'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'

export function FingerPaint() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [color, setColor] = useState(PLAY_COLORS[0]!)
  const [strokes, setStrokes] = useState(0)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const resize = () => {
      const rect = c.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      c.width = rect.width * ratio
      c.height = rect.height * ratio
      const ctx = c.getContext('2d')
      if (!ctx) return
      ctx.scale(ratio, ratio)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.fillStyle = '#fffaf0'
      ctx.fillRect(0, 0, rect.width, rect.height)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  function pos(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function start(e: PointerEvent<HTMLCanvasElement>) {
    drawing.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const p = pos(e)
    ctx.strokeStyle = color.hex
    ctx.lineWidth = 18
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }

  function move(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const p = pos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  function end() {
    if (!drawing.current) return
    drawing.current = false
    const next = strokes + 1
    setStrokes(next)
    if (next % 5 === 0) {
      addStars(1, 'finger-paint')
      speak('멋져요!')
    }
  }

  function clear() {
    const c = canvasRef.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const rect = c.getBoundingClientRect()
    ctx.fillStyle = '#fffaf0'
    ctx.fillRect(0, 0, rect.width, rect.height)
    setStrokes(0)
    speak('깨끗해요')
  }

  return (
    <GameShell title="손가락 그림" subtitle="손가락으로 마음껏 그려요">
      <div className="grid-3" style={{ marginBottom: '0.6rem' }}>
        {PLAY_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            className="swatch"
            style={{
              background: c.hex,
              outline: color.id === c.id ? '4px solid #1a1510' : undefined,
              minHeight: '3rem',
            }}
            onClick={() => {
              setColor(c)
              speak(c.ko)
            }}
          />
        ))}
      </div>
      <div className="play-area" style={{ padding: 0, overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          className="finger-canvas"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      </div>
      <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: '0.7rem' }} onClick={clear}>
        모두 지우기
      </button>
    </GameShell>
  )
}
