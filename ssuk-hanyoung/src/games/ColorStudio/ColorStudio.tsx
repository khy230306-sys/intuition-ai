import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BRUSH_PX,
  NUMBER_COLOR_MAP,
  STUDIO_COLORS,
  TOOLS,
  VEHICLE_CATEGORY_LABEL,
  countVehicleArt,
  getVehicleTemplate,
  playableVehicles,
  vehiclesByCategory,
  type BrushSize,
  type PaintTool,
  type StudioMode,
  type VehiclePaintCategory,
} from '../../data/vehicleColoringTemplates'
import { GameShell } from '../../components/GameShell'
import { Confetti } from '../../components/Confetti'
import { CharImg } from '../../components/GameArt'
import { Character } from '../../components/visual/Character'
import { VisualIcon } from '../../components/visual/VisualIcon'
import {
  deleteArtwork,
  duplicateArtwork,
  getArtwork,
  listArtworks,
  newArtworkId,
  saveArtwork,
  type ArtworkRecord,
} from '../../lib/artworkStore'
import { recordCreativeEngaged, recordCreativeStarted } from '../../lib/learningEvents'
import { addStars } from '../../lib/store'
import { sfx } from '../../lib/sfx'
import { speak } from '../../lib/speech'
import { FreeCanvas, type FreeCanvasHandle } from './FreeCanvas'
import { LineArtSvg } from './LineArtSvg'
import './colorStudio.css'

type Screen = 'home' | 'pick' | 'studio' | 'gallery' | 'finish'
type EasyHistory = Record<string, string>

const MAX_EASY_HISTORY = 24
const GAME_ID = 'car-paint'
const BASIC_COLOR_IDS = STUDIO_COLORS.slice(0, 12).map((c) => c.id)

function defaultFills(templateId: string): EasyHistory {
  const t = getVehicleTemplate(templateId)
  const out: EasyHistory = {}
  t?.regions.forEach((r) => {
    out[r.id] = r.defaultFill || '#FFFDF8'
  })
  return out
}

type DrawingPayload = {
  v: 2
  mode: StudioMode
  templateId: string
  regionFills?: EasyHistory
  canvasPng?: string
  regionsColored?: string[]
  toolsUsed?: string[]
  colorsUsed?: string[]
}

export function ColorStudio() {
  const [screen, setScreen] = useState<Screen>('home')
  const [cat, setCat] = useState<VehiclePaintCategory | 'all'>('all')
  const [templateId, setTemplateId] = useState(playableVehicles()[0]?.id || 'car-red-01')
  const [mode, setMode] = useState<StudioMode>('easy')
  const [tool, setTool] = useState<PaintTool>('crayon')
  const [brushSize, setBrushSize] = useState<BrushSize>('md')
  const [colorHex, setColorHex] = useState<string>(STUDIO_COLORS[0]!.hex)
  const [colorId, setColorId] = useState<string>(STUDIO_COLORS[0]!.id)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [moreColors, setMoreColors] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [artworkId, setArtworkId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [confetti, setConfetti] = useState(false)
  const [histTick, setHistTick] = useState(0)
  const [galleryTick, setGalleryTick] = useState(0)

  const [easyFills, setEasyFills] = useState<EasyHistory>(() => defaultFills(templateId))
  const easyUndo = useRef<EasyHistory[]>([])
  const easyRedo = useRef<EasyHistory[]>([])
  const freeRef = useRef<FreeCanvasHandle>(null)
  const regionsColored = useRef(new Set<string>())
  const colorsUsed = useRef(new Set<string>())
  const toolsUsed = useRef(new Set<string>())
  const startedAt = useRef(Date.now())
  const engagedOnce = useRef(false)

  const template = useMemo(() => getVehicleTemplate(templateId) || playableVehicles()[0]!, [templateId])
  const catalog = vehiclesByCategory(cat)
  const artworks = screen === 'gallery' ? listArtworks() : []
  void galleryTick
  const artStats = useMemo(() => countVehicleArt(), [])

  useEffect(() => {
    recordCreativeStarted(GAME_ID)
    startedAt.current = Date.now()
    speak('쑥쑥 색칠놀이! 자동차를 꾸며 보아요')
  }, [])

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 1400)
  }

  function trackEngage(t: PaintTool, hex: string, regionId?: string) {
    toolsUsed.current.add(t)
    colorsUsed.current.add(hex)
    if (regionId) regionsColored.current.add(regionId)
    if (!engagedOnce.current) {
      engagedOnce.current = true
      recordCreativeEngaged(GAME_ID, {
        duration: Math.round((Date.now() - startedAt.current) / 1000),
        score: 0,
        colorsUsed: [...colorsUsed.current],
        toolsUsed: [...toolsUsed.current],
      })
    }
  }

  function startMode(m: StudioMode) {
    setMode(m)
    setScreen('pick')
    speak(m === 'easy' ? '쉬운 색칠' : m === 'free' ? '자유 색칠' : '숫자 따라 색칠')
    sfx.tap()
  }

  function openTemplate(id: string) {
    const t = getVehicleTemplate(id)
    if (!t?.playable) {
      flash('그림이 준비 중이에요')
      speak('이 차는 아직 준비 중이에요')
      return
    }
    setTemplateId(id)
    setEasyFills(defaultFills(id))
    easyUndo.current = []
    easyRedo.current = []
    regionsColored.current = new Set()
    setArtworkId(null)
    setShowOriginal(false)
    setScreen('studio')
    speak(`${t.name}을 색칠해 보아요`)
    sfx.tap()
  }

  function loadArtwork(rec: ArtworkRecord) {
    try {
      const data = JSON.parse(rec.drawingData) as DrawingPayload
      setTemplateId(rec.templateId)
      setMode(rec.mode === 'numbers' ? 'numbers' : rec.mode)
      setArtworkId(rec.artworkId)
      if ((rec.mode === 'easy' || rec.mode === 'numbers') && data.regionFills) {
        setEasyFills(data.regionFills)
        easyUndo.current = []
        easyRedo.current = []
      }
      setScreen('studio')
      speak('작품을 이어서 그려 보아요')
      window.setTimeout(() => {
        if (rec.mode === 'free' && data.canvasPng) freeRef.current?.loadFromDataUrl(data.canvasPng)
      }, 80)
    } catch {
      flash('불러오기 실패')
    }
  }

  function applyEasyFill(regionId: string, hex: string) {
    easyUndo.current.push({ ...easyFills })
    if (easyUndo.current.length > MAX_EASY_HISTORY) easyUndo.current.shift()
    easyRedo.current = []
    setEasyFills({ ...easyFills, [regionId]: hex })
    setHistTick((n) => n + 1)
    trackEngage(tool === 'eraser' ? 'eraser' : tool === 'bucket' ? 'bucket' : tool, hex, regionId)
    sfx.paint()
  }

  function onRegionTap(regionId: string) {
    if (showOriginal) return
    if (tool === 'eraser') {
      applyEasyFill(regionId, defaultFills(templateId)[regionId] || '#FFFDF8')
      return
    }
    // numbers mode: soft guide only — never mark wrong
    if (mode === 'numbers') {
      const region = template.regions.find((r) => r.id === regionId)
      if (region?.number != null) {
        const legend = NUMBER_COLOR_MAP[region.number]
        if (legend && colorHex.toLowerCase() !== legend.hex.toLowerCase()) {
          // gentle hint, still allow creative choice
          speak(`${region.number}번은 ${legend.ko}이에요. 원하는 색도 괜찮아요`)
        }
      }
    }
    applyEasyFill(regionId, colorHex)
  }

  function undo() {
    if (mode === 'free') {
      freeRef.current?.undo()
      setHistTick((n) => n + 1)
      return
    }
    if (!easyUndo.current.length) return
    easyRedo.current.push({ ...easyFills })
    setEasyFills(easyUndo.current.pop()!)
    setHistTick((n) => n + 1)
    sfx.tap()
  }

  function redo() {
    if (mode === 'free') {
      freeRef.current?.redo()
      setHistTick((n) => n + 1)
      return
    }
    if (!easyRedo.current.length) return
    easyUndo.current.push({ ...easyFills })
    setEasyFills(easyRedo.current.pop()!)
    setHistTick((n) => n + 1)
    sfx.tap()
  }

  function canUndo() {
    void histTick
    return mode === 'free' ? !!freeRef.current?.canUndo() : easyUndo.current.length > 0
  }
  function canRedo() {
    void histTick
    return mode === 'free' ? !!freeRef.current?.canRedo() : easyRedo.current.length > 0
  }

  function clearAll() {
    if (mode === 'free') freeRef.current?.clear()
    else {
      easyUndo.current.push({ ...easyFills })
      if (easyUndo.current.length > MAX_EASY_HISTORY) easyUndo.current.shift()
      easyRedo.current = []
      setEasyFills(defaultFills(templateId))
    }
    setHistTick((n) => n + 1)
    speak('깨끗해요')
    sfx.tap()
  }

  function svgToDataUrl(svg: SVGSVGElement): string {
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`
    } catch {
      return ''
    }
  }

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('img'))
      img.src = src
    })
  }

  async function makeThumbnail(): Promise<string> {
    if (mode === 'free') {
      const paint = freeRef.current?.exportPng() || ''
      const line = document.querySelector('.studio-lineart svg') as SVGSVGElement | null
      if (!line) return paint
      try {
        const vb = template.viewBox.split(/\s+/).map(Number)
        const w = Math.max(160, vb[2] || 320)
        const h = Math.max(120, vb[3] || 220)
        const c = document.createElement('canvas')
        c.width = Math.round(w * 2)
        c.height = Math.round(h * 2)
        const ctx = c.getContext('2d')
        if (!ctx) return paint
        ctx.fillStyle = '#FFFDF8'
        ctx.fillRect(0, 0, c.width, c.height)
        ctx.drawImage(await loadImage(svgToDataUrl(line)), 0, 0, c.width, c.height)
        if (paint) ctx.drawImage(await loadImage(paint), 0, 0, c.width, c.height)
        return c.toDataURL('image/png')
      } catch {
        return paint
      }
    }
    const svg = document.querySelector('.studio-easy-svg') as SVGSVGElement | null
    return svg ? svgToDataUrl(svg) : ''
  }

  function buildPayload(): DrawingPayload {
    return {
      v: 2,
      mode,
      templateId,
      regionFills: mode === 'free' ? undefined : easyFills,
      canvasPng: mode === 'free' ? freeRef.current?.snapshot() : undefined,
      regionsColored: [...regionsColored.current],
      toolsUsed: [...toolsUsed.current],
      colorsUsed: [...colorsUsed.current],
    }
  }

  async function doSave(silent = false) {
    const id = artworkId || newArtworkId()
    const thumb = await makeThumbnail()
    const rec = saveArtwork({
      artworkId: id,
      templateId,
      thumbnail: thumb,
      drawingData: JSON.stringify(buildPayload()),
      mode,
      toolsUsed: [...toolsUsed.current],
      colorsUsed: [...colorsUsed.current],
    })
    setArtworkId(rec.artworkId)
    if (!silent) {
      flash('저장했어요!')
      speak('작품을 보관함에 넣었어요')
      sfx.cheer()
    }
    return rec
  }

  async function finish() {
    await doSave(true)
    const duration = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))
    addStars(2, GAME_ID, {
      duration,
      colorsUsed: [...colorsUsed.current],
      toolsUsed: [...toolsUsed.current],
    })
    setConfetti(true)
    setScreen('finish')
    speak('우와! 정말 멋지게 꾸몄어요!')
    sfx.cheer()
    window.setTimeout(() => setConfetti(false), 1600)
  }

  function pickColor(id: string, hex: string, ko: string) {
    setColorId(id)
    setColorHex(hex)
    setPaletteOpen(false)
    speak(ko)
    sfx.tap()
  }

  const celebrate = template.celebrateEffect || 'none'

  /* ── Home: mode select ── */
  if (screen === 'home') {
    return (
      <GameShell title="쑥쑥 색칠놀이" subtitle="자동차 & 중장비 스튜디오">
        {toast && <div className="toast">{toast}</div>}
        <div className="studio-home">
          <p className="studio-home-lead">어떻게 색칠할까요?</p>
          <button type="button" className="studio-mode-card" onClick={() => startMode('easy')}>
            <span className="studio-mode-title">쉬운 색칠</span>
            <span className="studio-mode-sub">부분을 눌러 색을 채워요 · 3~5세</span>
          </button>
          <button type="button" className="studio-mode-card" onClick={() => startMode('free')}>
            <span className="studio-mode-title">자유 색칠</span>
            <span className="studio-mode-sub">손가락으로 직접 그려요 · 4~7세</span>
          </button>
          <button type="button" className="studio-mode-card soft" onClick={() => startMode('numbers')}>
            <span className="studio-mode-title">숫자 따라 색칠</span>
            <span className="studio-mode-sub">번호를 보고 색을 찾아요 (강요 없어요)</span>
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setScreen('gallery')}>
            내 작품
          </button>
          <p className="studio-art-note">
            색칠 가능 {artStats.playable}대 · 프리미엄 아트 대기 {artStats.lineArtRequired}대
            <br />
            (TEMP 선화는 연습용 · REAL 3D 아트와 다름)
          </p>
        </div>
      </GameShell>
    )
  }

  /* ── Gallery ── */
  if (screen === 'gallery') {
    return (
      <GameShell title="내 작품" subtitle="저장한 그림을 모아요">
        {toast && <div className="toast">{toast}</div>}
        <button type="button" className="btn btn-ghost" onClick={() => setScreen('home')}>
          처음으로
        </button>
        <div className="studio-gallery">
          {artworks.map((a) => (
            <div key={a.artworkId} className="studio-gallery-item">
              <div className="studio-gallery-thumb">
                {a.thumbnail ? <img src={a.thumbnail} alt="" /> : <span>{getVehicleTemplate(a.templateId)?.name}</span>}
              </div>
              <div className="studio-gallery-meta">
                <strong>{getVehicleTemplate(a.templateId)?.name || '작품'}</strong>
                <span>{a.mode === 'free' ? '자유' : a.mode === 'numbers' ? '숫자' : '쉬운'}</span>
              </div>
              <div className="studio-gallery-actions">
                <button type="button" className="btn" onClick={() => loadArtwork(a)}>
                  계속 색칠
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    const copy = duplicateArtwork(a.artworkId)
                    if (copy) {
                      flash('복사했어요!')
                      setGalleryTick((n) => n + 1)
                    }
                  }}
                >
                  복사
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    deleteArtwork(a.artworkId)
                    flash('지웠어요')
                    setGalleryTick((n) => n + 1)
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
      <GameShell title="완성!" subtitle="멋지게 꾸몄어요">
        <Confetti show={confetti} />
        <div className={`studio-finish celebrate-${celebrate}`}>
          <div className="studio-finish-chars">
            <Character name="hani" state="celebrate" size="md" animate preferImage />
            <Character name="youngi" state="celebrate" size="md" animate preferImage />
          </div>
          <div className={`studio-finish-art fx-${celebrate}`}>
            {mode === 'free' && artworkId && getArtwork(artworkId)?.thumbnail ? (
              <img src={getArtwork(artworkId)!.thumbnail} alt="완성 작품" />
            ) : (
              <LineArtSvg template={template} fills={easyFills} showDefaultFills className="studio-easy-svg" />
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
                setArtworkId(null)
                setScreen('pick')
              }}
            >
              다른 차 고르기
            </button>
          </div>
        </div>
      </GameShell>
    )
  }

  /* ── Pick vehicle ── */
  if (screen === 'pick') {
    return (
      <GameShell
        title="차량 고르기"
        subtitle={mode === 'easy' ? '쉬운 색칠' : mode === 'free' ? '자유 색칠' : '숫자 따라 색칠'}
      >
        {toast && <div className="toast">{toast}</div>}
        <div className="studio-pick-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setScreen('home')}>
            모드
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setScreen('gallery')}>
            내 작품
          </button>
        </div>
        <div className="studio-cats" role="tablist">
          <button type="button" className={`studio-cat${cat === 'all' ? ' on' : ''}`} onClick={() => setCat('all')}>
            전체
          </button>
          {(Object.keys(VEHICLE_CATEGORY_LABEL) as VehiclePaintCategory[]).map((c) => (
            <button key={c} type="button" className={`studio-cat${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>
              {VEHICLE_CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        <div className="studio-template-grid">
          {catalog.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`studio-template-card${t.playable ? '' : ' locked'}`}
              onClick={() => openTemplate(t.id)}
            >
              <div className="studio-template-preview">
                {t.playable ? (
                  <LineArtSvg template={t} showDefaultFills />
                ) : t.thumbnail ? (
                  <CharImg src={t.thumbnail} size={88} alt="" />
                ) : (
                  <span className="studio-art-required">ART</span>
                )}
                {!t.playable && <span className="studio-badge">준비중</span>}
                {t.playable && t.lineArtStatus === 'TEMP' && <span className="studio-badge temp">TEMP</span>}
              </div>
              <span className="studio-template-title">{t.name}</span>
              <span className="studio-template-cat">{VEHICLE_CATEGORY_LABEL[t.category]}</span>
            </button>
          ))}
        </div>
      </GameShell>
    )
  }

  /* ── Studio ── */
  const basicColors = STUDIO_COLORS.filter((c) => BASIC_COLOR_IDS.includes(c.id))
  const extraColors = STUDIO_COLORS.filter((c) => !BASIC_COLOR_IDS.includes(c.id))

  return (
    <GameShell title="쑥쑥 색칠놀이" subtitle={template.name}>
      <Confetti show={confetti} />
      {toast && <div className="toast">{toast}</div>}

      <div className="studio-topbar studio-topbar-compact">
        <div className="studio-actions-row tight">
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
              speak(showOriginal ? '다시 칠해요' : '미리보기')
            }}
          >
            미리보기
          </button>
        </div>
        {mode === 'numbers' && (
          <div className="studio-number-legend">
            {Object.entries(NUMBER_COLOR_MAP).map(([n, c]) => (
              <button
                key={n}
                type="button"
                className="studio-legend-chip"
                style={{ background: c.hex }}
                onClick={() => pickColor(`n-${n}`, c.hex, `${n}번 ${c.ko}`)}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="studio-workspace">
        {mode === 'free' ? (
          <FreeCanvas
            key={templateId}
            ref={freeRef}
            template={template}
            color={colorHex}
            tool={tool}
            brushSize={brushSize}
            showOriginal={showOriginal}
            onEngage={(t, c) => trackEngage(t, c)}
            onHistoryChange={() => setHistTick((n) => n + 1)}
          />
        ) : (
          <div className="studio-stage studio-easy">
            {showOriginal && template.referenceImage && template.referenceStatus === 'REAL' ? (
              <div className="studio-ref-preview">
                <CharImg src={template.referenceImage} size={220} eager alt={template.name} />
                <span>참고 모습 · 따라 칠하지 않아도 돼요</span>
              </div>
            ) : (
              <LineArtSvg
                className="studio-easy-svg"
                template={template}
                fills={showOriginal ? {} : easyFills}
                showDefaultFills
                showNumbers={mode === 'numbers' && !showOriginal}
                interactive={!showOriginal}
                onRegionTap={onRegionTap}
              />
            )}
          </div>
        )}
      </div>

      <div className="studio-dock">
        <div className="studio-actions-row">
          <button type="button" className="studio-act" onClick={clearAll}>
            지우기
          </button>
          <button type="button" className="studio-act" onClick={() => void doSave()}>
            저장
          </button>
          <button type="button" className="studio-act primary" onClick={() => void finish()}>
            완성
          </button>
          <button type="button" className="studio-act slim" onClick={() => setScreen('pick')}>
            차량
          </button>
          <button type="button" className="studio-act slim" onClick={() => setScreen('gallery')}>
            작품
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
            style={{ background: colorHex }}
            onClick={() => setPaletteOpen((v) => !v)}
            aria-label="색 고르기"
          />
        </div>

        {paletteOpen && (
          <div className="studio-palette">
            {basicColors.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`studio-swatch${colorId === c.id ? ' on' : ''}`}
                style={{ background: c.hex }}
                aria-label={c.ko}
                onClick={() => pickColor(c.id, c.hex, c.ko)}
              />
            ))}
            <button type="button" className="studio-more-colors" onClick={() => setMoreColors((v) => !v)}>
              더 많은 색
            </button>
            {moreColors &&
              extraColors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`studio-swatch${colorId === c.id ? ' on' : ''}`}
                  style={{ background: c.hex }}
                  aria-label={c.ko}
                  onClick={() => pickColor(c.id, c.hex, c.ko)}
                />
              ))}
            {moreColors && (
              <label className="studio-native-picker">
                내 색
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => {
                    setColorHex(e.target.value)
                    setColorId('custom')
                    speak('내 색깔')
                  }}
                />
              </label>
            )}
          </div>
        )}
      </div>
    </GameShell>
  )
}
