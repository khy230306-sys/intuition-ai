import { forwardRef, useEffect, useImperativeHandle, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { BrushSize, ColorTemplate, PaintTool } from '../../data/colorStudio'
import { BRUSH_PX } from '../../data/colorStudio'
import { floodFill, hexToRgb } from '../../lib/floodFill'
import { LineArtSvg } from './LineArtSvg'

const MAX_HISTORY = 18

export type FreeCanvasHandle = {
  undo: () => boolean
  redo: () => boolean
  clear: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  exportPng: () => string
  loadFromDataUrl: (dataUrl: string) => void
  snapshot: () => string
}

type Props = {
  template: ColorTemplate
  color: string
  tool: PaintTool
  brushSize: BrushSize
  showOriginal: boolean
  onEngage: (tool: PaintTool, color: string) => void
  onHistoryChange?: () => void
}

function toolStyle(tool: PaintTool, color: string, size: number) {
  if (tool === 'eraser') {
    return { strokeStyle: 'rgba(255,253,248,1)', lineWidth: size * 1.4, globalAlpha: 1, globalCompositeOperation: 'destination-out' as GlobalCompositeOperation }
  }
  if (tool === 'pencil') {
    return { strokeStyle: color, lineWidth: size * 0.55, globalAlpha: 0.85, globalCompositeOperation: 'source-over' as GlobalCompositeOperation }
  }
  if (tool === 'crayon') {
    return { strokeStyle: color, lineWidth: size * 1.1, globalAlpha: 0.72, globalCompositeOperation: 'source-over' as GlobalCompositeOperation }
  }
  if (tool === 'marker') {
    return { strokeStyle: color, lineWidth: size * 1.25, globalAlpha: 0.55, globalCompositeOperation: 'source-over' as GlobalCompositeOperation }
  }
  // brush
  return { strokeStyle: color, lineWidth: size, globalAlpha: 0.9, globalCompositeOperation: 'source-over' as GlobalCompositeOperation }
}

export const FreeCanvas = forwardRef<FreeCanvasHandle, Props>(function FreeCanvas(
  { template, color, tool, brushSize, showOriginal, onEngage, onHistoryChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const dpr = useRef(1)
  const drawing = useRef(false)
  const pointerId = useRef<number | null>(null)
  const last = useRef<{ x: number; y: number } | null>(null)
  const undoStack = useRef<ImageData[]>([])
  const redoStack = useRef<ImageData[]>([])
  const engaged = useRef(false)

  function getCtx() {
    return canvasRef.current?.getContext('2d', { willReadFrequently: true }) ?? null
  }

  function pushUndo() {
    const c = canvasRef.current
    const ctx = getCtx()
    if (!c || !ctx) return
    try {
      const snap = ctx.getImageData(0, 0, c.width, c.height)
      undoStack.current.push(snap)
      if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift()
      redoStack.current = []
      onHistoryChange?.()
    } catch {
      /* ignore */
    }
  }

  function clearCanvas() {
    const c = canvasRef.current
    const ctx = getCtx()
    if (!c || !ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
  }

  function resize() {
    const c = canvasRef.current
    const wrap = wrapRef.current
    if (!c || !wrap) return
    const rect = wrap.getBoundingClientRect()
    const prev = c.toDataURL('image/png')
    dpr.current = Math.min(2, window.devicePixelRatio || 1)
    c.width = Math.max(1, Math.floor(rect.width * dpr.current))
    c.height = Math.max(1, Math.floor(rect.height * dpr.current))
    c.style.width = `${rect.width}px`
    c.style.height = `${rect.height}px`
    const ctx = getCtx()
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
    if (prev && prev.length > 100) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, c.width, c.height)
      }
      img.src = prev
    }
    undoStack.current = []
    redoStack.current = []
    onHistoryChange?.()
  }

  useEffect(() => {
    resize()
    const ro = new ResizeObserver(() => resize())
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id])

  useImperativeHandle(ref, () => ({
    undo() {
      const c = canvasRef.current
      const ctx = getCtx()
      if (!c || !ctx || !undoStack.current.length) return false
      try {
        redoStack.current.push(ctx.getImageData(0, 0, c.width, c.height))
        const prev = undoStack.current.pop()!
        ctx.putImageData(prev, 0, 0)
        onHistoryChange?.()
        return true
      } catch {
        return false
      }
    },
    redo() {
      const c = canvasRef.current
      const ctx = getCtx()
      if (!c || !ctx || !redoStack.current.length) return false
      try {
        undoStack.current.push(ctx.getImageData(0, 0, c.width, c.height))
        const next = redoStack.current.pop()!
        ctx.putImageData(next, 0, 0)
        onHistoryChange?.()
        return true
      } catch {
        return false
      }
    },
    clear() {
      pushUndo()
      clearCanvas()
      onHistoryChange?.()
    },
    canUndo: () => undoStack.current.length > 0,
    canRedo: () => redoStack.current.length > 0,
    exportPng() {
      return canvasRef.current?.toDataURL('image/png') || ''
    },
    snapshot() {
      return canvasRef.current?.toDataURL('image/png') || ''
    },
    loadFromDataUrl(dataUrl: string) {
      const c = canvasRef.current
      const ctx = getCtx()
      if (!c || !ctx || !dataUrl) return
      const img = new Image()
      img.onload = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, c.width, c.height)
        ctx.drawImage(img, 0, 0, c.width, c.height)
        undoStack.current = []
        redoStack.current = []
        onHistoryChange?.()
      }
      img.src = dataUrl
    },
  }))

  function pos(e: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * dpr.current,
      y: (e.clientY - rect.top) * dpr.current,
    }
  }

  function markEngage() {
    onEngage(tool, color)
    engaged.current = true
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    // Ignore extra touches (multitouch)
    if (pointerId.current !== null && pointerId.current !== e.pointerId) return
    pointerId.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    const ctx = getCtx()
    const c = canvasRef.current
    if (!ctx || !c) return

    const p = pos(e)
    markEngage()

    if (tool === 'bucket') {
      pushUndo()
      const [r, g, b] = hexToRgb(color)
      const imageData = ctx.getImageData(0, 0, c.width, c.height)
      // Seed transparent areas with soft white so fill works
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i + 3]! < 8) {
          imageData.data[i] = 255
          imageData.data[i + 1] = 253
          imageData.data[i + 2] = 248
          imageData.data[i + 3] = 255
        }
      }
      const changed = floodFill(imageData, p.x, p.y, r, g, b, 255, 40)
      if (changed) ctx.putImageData(imageData, 0, 0)
      else {
        undoStack.current.pop()
      }
      onHistoryChange?.()
      return
    }

    pushUndo()
    drawing.current = true
    last.current = p
    const size = BRUSH_PX[brushSize] * dpr.current
    const st = toolStyle(tool, color, size)
    ctx.save()
    ctx.globalCompositeOperation = st.globalCompositeOperation
    ctx.globalAlpha = st.globalAlpha
    ctx.strokeStyle = st.strokeStyle
    ctx.lineWidth = st.lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(p.x + 0.01, p.y)
    ctx.stroke()
    ctx.restore()
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || pointerId.current !== e.pointerId) return
    const ctx = getCtx()
    if (!ctx || !last.current) return
    const p = pos(e)
    const size = BRUSH_PX[brushSize] * dpr.current
    const st = toolStyle(tool, color, size)
    ctx.save()
    ctx.globalCompositeOperation = st.globalCompositeOperation
    ctx.globalAlpha = st.globalAlpha
    ctx.strokeStyle = st.strokeStyle
    ctx.lineWidth = st.lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    ctx.restore()
    last.current = p
  }

  function onPointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (pointerId.current !== e.pointerId) return
    drawing.current = false
    pointerId.current = null
    last.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="studio-stage" ref={wrapRef}>
      <div className={`studio-lineart${showOriginal ? ' is-original' : ''}`} aria-hidden={false}>
        <LineArtSvg template={template} showDefaultFills={!showOriginal} fills={showOriginal ? {} : undefined} />
      </div>
      <canvas
        ref={canvasRef}
        className={`studio-canvas${showOriginal ? ' is-dim' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ touchAction: 'none' }}
      />
    </div>
  )
})
