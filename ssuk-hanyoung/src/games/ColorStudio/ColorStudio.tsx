import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BRUSH_PX,
  CATEGORY_LABEL,
  STUDIO_COLORS,
  TOOLS,
  type BrushSize,
  type ColorCategory,
  type PaintTool,
  type StudioMode,
  getTemplate,
  readyTemplates,
  templatesByCategory,
} from '../../data/colorStudio'
import { GameShell } from '../../components/GameShell'
import { Confetti } from '../../components/Confetti'
import { Character } from '../../components/visual/Character'
import { VisualIcon } from '../../components/visual/VisualIcon'
import { deleteArtwork, getArtwork, listArtworks, newArtworkId, saveArtwork, type ArtworkRecord } from '../../lib/artworkStore'
import { recordCreativeEngaged, recordCreativeStarted } from '../../lib/learningEvents'
import { addStars } from '../../lib/store'
import { sfx } from '../../lib/sfx'
import { speak } from '../../lib/speech'
import { FreeCanvas, type FreeCanvasHandle } from './FreeCanvas'
import { LineArtSvg } from './LineArtSvg'
import './colorStudio.css'

type Screen = 'pick' | 'studio' | 'gallery' | 'finish'

type EasyHistory = Record<string, string>

const MAX_EASY_HISTORY = 24
const GAME_ID = 'car-paint'

function defaultFills(templateId: string): EasyHistory {
  const t = getTemplate(templateId)
  const out: EasyHistory = {}
  t?.regions.forEach((r) => {
    out[r.id] = r.defaultFill || '#FFFDF8'
  })
  return out
}

type DrawingPayload = {
  v: 1
  mode: StudioMode
  templateId: string
  regionFills?: EasyHistory
  canvasPng?: string
}

export function ColorStudio() {
  const [screen, setScreen] = useState<Screen>('pick')
  const [cat, setCat] = useState<ColorCategory | 'all'>('all')
  const [templateId, setTemplateId] = useState(readyTemplates()[0]?.id || 'car-sedan')
  const [mode, setMode] = useState<StudioMode>('easy')
  const [tool, setTool] = useState<PaintTool>('crayon')
  const [brushSize, setBrushSize] = useState<BrushSize>('md')
  const [colorId, setColorId] = useState<string>(STUDIO_COLORS[0]!.id)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [artworkId, setArtworkId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [confetti, setConfetti] = useState(false)
  const [missionIdx, setMissionIdx] = useState(0)
  const [histTick, setHistTick] = useState(0)

  const [easyFills, setEasyFills] = useState<EasyHistory>(() => defaultFills(templateId))
  const easyUndo = useRef<EasyHistory[]>([])
  const easyRedo = useRef<EasyHistory[]>([])
  const freeRef = useRef<FreeCanvasHandle>(null)

  const colorsUsed = useRef(new Set<string>())
  const toolsUsed = useRef(new Set<string>())
  const startedAt = useRef(Date.now())
  const engagedOnce = useRef(false)

  const template = useMemo(() => getTemplate(templateId) || readyTemplates()[0]!, [templateId])
  const color = STUDIO_COLORS.find((c) => c.id === colorId) || STUDIO_COLORS[0]!
  const templates = templatesByCategory(cat)
  const artworks = screen === 'gallery' ? listArtworks() : []

  useEffect(() => {
    recordCreativeStarted(GAME_ID)
    startedAt.current = Date.now()
    speak('쑥쑥 색칠 스튜디오! 그림을 골라 보아요')
  }, [])

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 1400)
  }

  function trackEngage(t: PaintTool, cHex: string) {
    toolsUsed.current.add(t)
    colorsUsed.current.add(cHex)
    if (!engagedOnce.current) {
      engagedOnce.current = true
      recordCreativeEngaged(GAME_ID, {
        duration: Math.round((Date.now() - startedAt.current) / 1000),
        score: 0,
      })
    }
  }

  function openTemplate(id: string, asMode: StudioMode = 'easy') {
    setTemplateId(id)
    setMode(asMode)
    setEasyFills(defaultFills(id))
    easyUndo.current = []
    easyRedo.current = []
    setArtworkId(null)
    setShowOriginal(false)
    setMissionIdx(0)
    setScreen('studio')
    const t = getTemplate(id)
    speak(`${t?.title || '도안'}을 색칠해 보아요`)
    sfx.tap()
  }

  function loadArtwork(rec: ArtworkRecord) {
    try {
      const data = JSON.parse(rec.drawingData) as DrawingPayload
      setTemplateId(rec.templateId)
      setMode(rec.mode)
      setArtworkId(rec.artworkId)
      if (rec.mode === 'easy' && data.regionFills) {
        setEasyFills(data.regionFills)
        easyUndo.current = []
        easyRedo.current = []
      }
      setScreen('studio')
      speak('작품을 이어서 그려 보아요')
      // free canvas load after mount
      window.setTimeout(() => {
        if (rec.mode === 'free' && data.canvasPng) {
          freeRef.current?.loadFromDataUrl(data.canvasPng)
        }
      }, 80)
    } catch {
      flash('불러오기 실패')
    }
  }

  function fillRegion(regionId: string) {
    if (showOriginal) return
    if (tool === 'eraser') {
      applyEasyFill(regionId, defaultFills(templateId)[regionId] || '#FFFDF8')
      return
    }
    applyEasyFill(regionId, color.hex)
  }

  function applyEasyFill(regionId: string, hex: string) {
    easyUndo.current.push({ ...easyFills })
    if (easyUndo.current.length > MAX_EASY_HISTORY) easyUndo.current.shift()
    easyRedo.current = []
    const next = { ...easyFills, [regionId]: hex }
    setEasyFills(next)
    setHistTick((n) => n + 1)
    trackEngage(tool === 'eraser' ? 'eraser' : tool === 'bucket' ? 'bucket' : tool, hex)
    sfx.paint()
  }

  function easyUndoFn() {
    if (!easyUndo.current.length) return
    easyRedo.current.push({ ...easyFills })
    const prev = easyUndo.current.pop()!
    setEasyFills(prev)
    setHistTick((n) => n + 1)
    sfx.tap()
  }

  function easyRedoFn() {
    if (!easyRedo.current.length) return
    easyUndo.current.push({ ...easyFills })
    const next = easyRedo.current.pop()!
    setEasyFills(next)
    setHistTick((n) => n + 1)
    sfx.tap()
  }

  function clearAll() {
    if (mode === 'easy') {
      easyUndo.current.push({ ...easyFills })
      if (easyUndo.current.length > MAX_EASY_HISTORY) easyUndo.current.shift()
      easyRedo.current = []
      setEasyFills(defaultFills(templateId))
      setHistTick((n) => n + 1)
    } else {
      freeRef.current?.clear()
    }
    speak('깨끗해요')
    sfx.tap()
  }

  function undo() {
    if (mode === 'easy') easyUndoFn()
    else {
      freeRef.current?.undo()
      setHistTick((n) => n + 1)
    }
  }

  function redo() {
    if (mode === 'easy') easyRedoFn()
    else {
      freeRef.current?.redo()
      setHistTick((n) => n + 1)
    }
  }

  function canUndo() {
    void histTick
    return mode === 'easy' ? easyUndo.current.length > 0 : !!freeRef.current?.canUndo()
  }

  function canRedo() {
    void histTick
    return mode === 'easy' ? easyRedo.current.length > 0 : !!freeRef.current?.canRedo()
  }

  function makeThumbnail(): string {
    if (mode === 'free') {
      return freeRef.current?.exportPng() || ''
    }
    // Serialize SVG regions to canvas
    const svg = document.querySelector('.studio-easy-svg') as SVGSVGElement | null
    if (!svg) return ''
    const xml = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    // sync fallback — return empty and async update not needed for save path below
    URL.revokeObjectURL(url)
    return svgToDataUrl(svg)
  }

  function svgToDataUrl(svg: SVGSVGElement): string {
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      const xml = new XMLSerializer().serializeToString(clone)
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
    } catch {
      return ''
    }
  }

  function buildPayload(): DrawingPayload {
    return {
      v: 1,
      mode,
      templateId,
      regionFills: mode === 'easy' ? easyFills : undefined,
      canvasPng: mode === 'free' ? freeRef.current?.snapshot() : undefined,
    }
  }

  function doSave(silent = false) {
    const id = artworkId || newArtworkId()
    const thumb = makeThumbnail() || (mode === 'free' ? freeRef.current?.exportPng() || '' : '')
    const rec = saveArtwork({
      artworkId: id,
      templateId,
      thumbnail: thumb,
      drawingData: JSON.stringify(buildPayload()),
      mode,
    })
    setArtworkId(rec.artworkId)
    if (!silent) {
      flash('저장했어요!')
      speak('작품을 보관함에 넣었어요')
      sfx.cheer()
    }
    return rec
  }

  function finish() {
    doSave(true)
    const duration = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))
    addStars(2, GAME_ID, {
      duration,
      colorsUsed: [...colorsUsed.current],
      toolsUsed: [...toolsUsed.current],
    })
    setConfetti(true)
    setScreen('finish')
    speak('와! 멋진 작품이에요!')
    sfx.cheer()
    window.setTimeout(() => setConfetti(false), 1600)
  }

  const mission =
    template.missionHints && template.missionHints.length
      ? template.missionHints[missionIdx % template.missionHints.length]
      : null

  /* ── Pick screen ── */
  if (screen === 'pick') {
    return (
      <GameShell title="쑥쑥 색칠 스튜디오" subtitle="도안을 고르고 색칠해 보아요">
        {toast && <div className="toast">{toast}</div>}
        <div className="studio-pick-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setScreen('gallery')}>
            내 작품
          </button>
        </div>
        <div className="studio-cats" role="tablist">
          <button type="button" className={`studio-cat${cat === 'all' ? ' on' : ''}`} onClick={() => setCat('all')}>
            전체
          </button>
          {(Object.keys(CATEGORY_LABEL) as ColorCategory[]).map((c) => (
            <button key={c} type="button" className={`studio-cat${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        <div className="studio-template-grid">
          {templates.map((t) => (
            <button key={t.id} type="button" className="studio-template-card" onClick={() => openTemplate(t.id, 'easy')}>
              <div className="studio-template-preview">
                <LineArtSvg template={t} showDefaultFills />
              </div>
              <span className="studio-template-title">{t.title}</span>
              <span className="studio-template-cat">{CATEGORY_LABEL[t.category]}</span>
            </button>
          ))}
          {!templates.length && <p className="section-sub">이 분류의 도안은 준비 중이에요</p>}
        </div>
        <p className="studio-hint">쉬운 색칠 · 자유 색칠은 도안을 고른 뒤 바꿀 수 있어요</p>
      </GameShell>
    )
  }

  /* ── Gallery ── */
  if (screen === 'gallery') {
    return (
      <GameShell title="내 작품" subtitle="저장한 그림을 다시 볼 수 있어요">
        {toast && <div className="toast">{toast}</div>}
        <button type="button" className="btn btn-ghost" onClick={() => setScreen('pick')}>
          도안 고르기
        </button>
        <div className="studio-gallery">
          {artworks.map((a) => (
            <div key={a.artworkId} className="studio-gallery-item">
              <div className="studio-gallery-thumb">
                {a.thumbnail ? <img src={a.thumbnail} alt="" /> : <span>{getTemplate(a.templateId)?.title}</span>}
              </div>
              <div className="studio-gallery-meta">
                <strong>{getTemplate(a.templateId)?.title || '작품'}</strong>
                <span>{a.mode === 'easy' ? '쉬운 색칠' : '자유 색칠'}</span>
              </div>
              <div className="studio-gallery-actions">
                <button type="button" className="btn" onClick={() => loadArtwork(a)}>
                  계속 그리기
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    deleteArtwork(a.artworkId)
                    flash('지웠어요')
                    setHistTick((n) => n + 1)
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
          {!artworks.length && <p className="section-sub">아직 저장한 작품이 없어요</p>}
        </div>
      </GameShell>
    )
  }

  /* ── Finish ── */
  if (screen === 'finish') {
    return (
      <GameShell title="완성!" subtitle="멋진 작품을 만들었어요">
        <Confetti show={confetti} />
        <div className="studio-finish">
          <div className="studio-finish-chars">
            <Character name="hani" state="celebrate" size="md" animate preferImage />
            <Character name="youngi" state="celebrate" size="md" animate preferImage />
          </div>
          <div className="studio-finish-art">
            {mode === 'easy' ? (
              <LineArtSvg template={template} fills={easyFills} showDefaultFills className="studio-easy-svg" />
            ) : (
              artworkId && getArtwork(artworkId)?.thumbnail ? (
                <img src={getArtwork(artworkId)!.thumbnail} alt="완성 작품" />
              ) : (
                <LineArtSvg template={template} showDefaultFills />
              )
            )}
          </div>
          <p className="prompt-big">별도 받았어요!</p>
          <div className="studio-finish-actions">
            <button type="button" className="btn" onClick={() => setScreen('studio')}>
              더 그리기
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setScreen('gallery')}>
              내 작품
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setScreen('pick')
                setArtworkId(null)
              }}
            >
              새 작품
            </button>
          </div>
        </div>
      </GameShell>
    )
  }

  /* ── Studio ── */
  return (
    <GameShell title="색칠 스튜디오" subtitle={template.title}>
      <Confetti show={confetti} />
      {toast && <div className="toast">{toast}</div>}

      <div className="studio-topbar">
        <div className="studio-mode-toggle">
          <button
            type="button"
            className={mode === 'easy' ? 'on' : ''}
            onClick={() => {
              setMode('easy')
              speak('쉬운 색칠')
            }}
          >
            쉬운 색칠
          </button>
          <button
            type="button"
            className={mode === 'free' ? 'on' : ''}
            onClick={() => {
              setMode('free')
              speak('자유 색칠')
            }}
          >
            자유 색칠
          </button>
        </div>
        {mission && (
          <button
            type="button"
            className="studio-mission"
            onClick={() => {
              setMissionIdx((i) => i + 1)
              speak(mission)
            }}
          >
            {mission}
          </button>
        )}
      </div>

      <div className="studio-workspace">
        {mode === 'easy' ? (
          <div className="studio-stage studio-easy">
            <LineArtSvg
              className="studio-easy-svg"
              template={template}
              fills={showOriginal ? {} : easyFills}
              showDefaultFills
              interactive={!showOriginal}
              onRegionTap={(id) => {
                if (tool === 'eraser') {
                  applyEasyFill(id, defaultFills(templateId)[id] || '#FFFDF8')
                } else {
                  fillRegion(id)
                }
              }}
            />
          </div>
        ) : (
          <FreeCanvas
            key={templateId}
            ref={freeRef}
            template={template}
            color={color.hex}
            tool={tool}
            brushSize={brushSize}
            showOriginal={showOriginal}
            onEngage={(t, c) => {
              trackEngage(t, c)
            }}
            onHistoryChange={() => setHistTick((n) => n + 1)}
          />
        )}
      </div>

      <div className="studio-dock">
        <div className="studio-actions-row">
          <button type="button" className="studio-act" disabled={!canUndo()} onClick={undo} aria-label="되돌리기">
            ↶
          </button>
          <button type="button" className="studio-act" disabled={!canRedo()} onClick={redo} aria-label="다시하기">
            ↷
          </button>
          <button
            type="button"
            className={`studio-act${showOriginal ? ' on' : ''}`}
            onClick={() => {
              setShowOriginal((v) => !v)
              speak(showOriginal ? '다시 칠해요' : '원본 보기')
            }}
          >
            원본
          </button>
          <button type="button" className="studio-act" onClick={clearAll}>
            지우기
          </button>
          <button
            type="button"
            className="studio-act"
            onClick={() => {
              doSave()
            }}
          >
            저장
          </button>
          <button type="button" className="studio-act primary" onClick={finish}>
            완성
          </button>
        </div>

        <div className="studio-tools" role="toolbar" aria-label="도구">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`studio-tool${tool === t.id ? ' on' : ''}`}
              onClick={() => {
                setTool(t.id)
                speak(t.ko)
                sfx.tap()
              }}
            >
              <VisualIcon name={t.visual} size={28} />
              <span>{t.ko}</span>
            </button>
          ))}
        </div>

        <div className="studio-size-row">
          {(['sm', 'md', 'lg'] as BrushSize[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`studio-size${brushSize === s ? ' on' : ''}`}
              onClick={() => setBrushSize(s)}
              aria-label={`굵기 ${s}`}
            >
              <span style={{ width: BRUSH_PX[s] * 0.55, height: BRUSH_PX[s] * 0.55 }} />
            </button>
          ))}
          <button
            type="button"
            className="studio-color-chip"
            style={{ background: color.hex }}
            onClick={() => setPaletteOpen((v) => !v)}
            aria-label={`${color.ko} 색 고르기`}
          />
          <button type="button" className="studio-act slim" onClick={() => setScreen('pick')}>
            도안
          </button>
          <button type="button" className="studio-act slim" onClick={() => setScreen('gallery')}>
            작품
          </button>
        </div>

        {paletteOpen && (
          <div className="studio-palette">
            {STUDIO_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`studio-swatch${colorId === c.id ? ' on' : ''}`}
                style={{ background: c.hex }}
                aria-label={c.ko}
                onClick={() => {
                  setColorId(c.id)
                  setPaletteOpen(false)
                  speak(c.ko)
                  sfx.tap()
                }}
              />
            ))}
          </div>
        )}
      </div>
    </GameShell>
  )
}
