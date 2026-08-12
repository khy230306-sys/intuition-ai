import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CHARACTER_SLOTS, VEHICLE_CATALOG } from './assets/registry'
import {
  FIRETRUCK_CLASSIC_COLORS,
  FIRETRUCK_PAINT_SWATCHES,
  FIRETRUCK_VIEWBOX,
} from './assets/vehicles/firetruck/manifest'
import { AssetRequired } from './components/AssetRequired'
import { StageBar } from './components/StageBar'
import { VehicleRenderer } from './components/VehicleRenderer'
import { createFiretruckEntity, isFullyAssembled } from './entity/createFiretruck'
import {
  completeMission,
  distance,
  hitTestPart,
  moveVehicle,
  paintPart,
  startMission,
  tickVehicle,
  trySnapPart,
} from './entity/vehicleOps'
import { sfx } from './lib/sfx'
import type {
  FiretruckPartId,
  MissionDefinition,
  VehicleEntity,
  VehicleTypeId,
  WorkshopStage,
} from './types/vehicle'

const MISSION: MissionDefinition = {
  id: 'put-out-fire',
  title: '불을 꺼요!',
  hint: '사이렌을 켜고 불꽃까지 소방차를 운전해 주세요',
  target: { x: 0.78, y: 0.32 },
  radius: 56,
  rewardStars: 3,
}

const STAGE_FLOW: WorkshopStage[] = ['select', 'assemble', 'paint', 'drive', 'mission', 'reward']

function unlockThrough(stage: WorkshopStage): WorkshopStage[] {
  const idx = STAGE_FLOW.indexOf(stage)
  return STAGE_FLOW.slice(0, Math.max(0, idx) + 1)
}

export default function App() {
  const [stage, setStage] = useState<WorkshopStage>('select')
  const [unlocked, setUnlocked] = useState<WorkshopStage[]>(['select'])
  const [vehicle, setVehicle] = useState<VehicleEntity | null>(null)
  const [selectedPart, setSelectedPart] = useState<FiretruckPartId | null>(null)
  const [paintColor, setPaintColor] = useState(FIRETRUCK_PAINT_SWATCHES[0].hex)
  const [dragPart, setDragPart] = useState<FiretruckPartId | null>(null)
  const [driving, setDriving] = useState(false)
  const [stars, setStars] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const lastDriveSfx = useRef(0)
  const driveBounds = useRef({ w: 360, h: 360 })

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      setVehicle((v) => (v ? tickVehicle(v, dt) : v))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 1600)
    return () => window.clearTimeout(id)
  }, [toast])

  const assembled = vehicle ? isFullyAssembled(vehicle) : false

  function go(next: WorkshopStage) {
    setStage(next)
    setUnlocked((u) => Array.from(new Set([...u, ...unlockThrough(next)])))
  }

  function selectVehicle(type: VehicleTypeId) {
    const entry = VEHICLE_CATALOG.find((v) => v.type === type)
    if (!entry || entry.assetStatus !== 'READY' || !entry.workshopReady) {
      sfx.tap()
      setToast('Asset Required — 소방차만 지금 플레이할 수 있어요')
      return
    }
    sfx.whoosh()
    setVehicle(createFiretruckEntity({ assembled: false }))
    setSelectedPart(null)
    setStars(0)
    go('assemble')
    setToast('부품을 끌어다 조립해요!')
  }

  function svgPoint(e: ReactPointerEvent<SVGSVGElement>, extraH = 0) {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * FIRETRUCK_VIEWBOX.w,
      y: ((e.clientY - rect.top) / rect.height) * (FIRETRUCK_VIEWBOX.h + extraH),
    }
  }

  function onAssemblePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (!vehicle) return
    const p = svgPoint(e, 40)
    const hit = hitTestPart(vehicle, p, false)
    if (!hit) return
    setDragPart(hit)
    setSelectedPart(hit)
    e.currentTarget.setPointerCapture(e.pointerId)
    sfx.tap()
  }

  function onAssemblePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!vehicle || !dragPart) return
    const p = svgPoint(e, 40)
    setVehicle((v) =>
      v
        ? {
            ...v,
            parts: {
              ...v.parts,
              [dragPart]: { ...v.parts[dragPart], trayPos: p },
            },
          }
        : v,
    )
  }

  function onAssemblePointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    if (!vehicle || !dragPart) return
    const p = svgPoint(e, 40)
    const before = vehicle.parts[dragPart].assembled
    const next = trySnapPart(vehicle, dragPart, p)
    setVehicle(next)
    setDragPart(null)
    if (next.parts[dragPart].assembled && !before) {
      sfx.snap()
      setToast(`찰칵! ${partLabel(dragPart)} 장착!`)
      if (isFullyAssembled(next)) {
        setToast('조립 완료! 색칠하러 가요')
        window.setTimeout(() => go('paint'), 450)
      }
    }
  }

  function onPaintPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (!vehicle) return
    const p = svgPoint(e, 0)
    const hit = hitTestAssembledSlots(vehicle, p)
    if (!hit) return
    setSelectedPart(hit)
    setVehicle(paintPart(vehicle, hit, paintColor))
    sfx.paint()
    setToast(`${partLabel(hit)} 색칠!`)
  }

  function onDrivePointer(e: ReactPointerEvent<HTMLDivElement>) {
    if (!vehicle || (stage !== 'drive' && stage !== 'mission')) return
    const rect = e.currentTarget.getBoundingClientRect()
    driveBounds.current = { w: rect.width, h: rect.height }

    if (e.type === 'pointerdown') {
      setDriving(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (e.type === 'pointerup' || e.type === 'pointercancel') {
      setDriving(false)
      return
    }
    if (!driving && e.type !== 'pointerdown') return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setVehicle((v) => (v ? moveVehicle(v, { x, y }, { w: rect.width, h: rect.height }) : v))

    const now = performance.now()
    if (now - lastDriveSfx.current > 220) {
      sfx.drive()
      lastDriveSfx.current = now
    }

    if (stage === 'mission' && vehicle.missionState === 'active') {
      const target = {
        x: MISSION.target.x * rect.width,
        y: MISSION.target.y * rect.height,
      }
      if (distance({ x, y }, target) <= MISSION.radius) {
        setVehicle((v) => (v ? completeMission(v) : v))
        sfx.win()
        setStars(MISSION.rewardStars)
        setToast('미션 성공!')
        window.setTimeout(() => go('reward'), 550)
      }
    }
  }

  function beginDrive() {
    if (!vehicle || !assembled) return
    sfx.whoosh()
    setVehicle((v) =>
      v
        ? {
            ...v,
            position: { x: 100, y: 220 },
            animation: 'idle',
          }
        : v,
    )
    go('drive')
    setToast('화면을 드래그해서 운전해요')
  }

  function beginMission() {
    if (!vehicle || !assembled) return
    sfx.siren()
    setVehicle((v) =>
      v
        ? startMission({
            ...v,
            position: { x: 90, y: 220 },
          })
        : v,
    )
    go('mission')
    setToast(MISSION.hint)
  }

  function resetWorkshop() {
    setVehicle(null)
    setSelectedPart(null)
    setStars(0)
    setUnlocked(['select'])
    setStage('select')
  }

  const classicHint = useMemo(
    () =>
      Object.entries(FIRETRUCK_CLASSIC_COLORS)
        .map(([k, hex]) => `${partLabel(k as FiretruckPartId)} ${hex}`)
        .join(' · '),
    [],
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <p className="brand">쑥쑥놀이터 NEW</p>
          <h1>자동차 공방</h1>
          <p className="tagline">소방차로 선택 → 조립 → 색칠 → 운전 → 미션 → 보상</p>
        </div>
        <div className="policy-chip" title="REFERENCE IMAGE IS NOT A GAME ASSET">
          Style Ref Only
        </div>
      </header>

      <StageBar
        stage={stage}
        unlocked={unlocked}
        onJump={(s) => {
          if (unlocked.includes(s)) setStage(s)
        }}
      />

      {toast && <div className="toast">{toast}</div>}

      <main className="stage-panel">
        {stage === 'select' && (
          <section className="panel">
            <h2>차량 선택</h2>
            <p className="lead">첫 production 차량은 소방차입니다. 나머지는 Asset Required.</p>
            <div className="vehicle-grid">
              {VEHICLE_CATALOG.map((entry) => {
                const ready = entry.assetStatus === 'READY' && entry.workshopReady
                return (
                  <button
                    key={entry.type}
                    type="button"
                    className={`vehicle-card${ready ? ' ready' : ' locked'}`}
                    onClick={() => selectVehicle(entry.type)}
                  >
                    {ready ? (
                      <>
                        <VehicleThumb />
                        <strong>{entry.labelKo}</strong>
                        <span className="ready-badge">READY</span>
                      </>
                    ) : (
                      <AssetRequired title={entry.labelKo} detail={entry.note} />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="character-slot">
              <h3>캐릭터</h3>
              {CHARACTER_SLOTS.map((c) => (
                <AssetRequired
                  key={c.id}
                  title={`${c.labelKo} (${c.poses.join(', ')})`}
                  detail="캐릭터 production 포즈 시트 대기 중"
                />
              ))}
            </div>
          </section>
        )}

        {stage === 'assemble' && vehicle && (
          <section className="panel">
            <h2>조립</h2>
            <p className="lead">파츠를 점선 슬롯으로 끌어다 놓아요. 한 장의 통짜 이미지가 아닙니다.</p>
            <div className="canvas assemble-canvas">
              <VehicleRenderer
                entity={vehicle}
                stage={stage}
                selectedPartId={selectedPart}
                ghostSlots
                mode="tray"
                onPointerDown={onAssemblePointerDown}
                onPointerMove={onAssemblePointerMove}
                onPointerUp={onAssemblePointerUp}
                onPointerCancel={onAssemblePointerUp}
              />
            </div>
            <div className="part-legend">
              {vehicle.assembleOrder.map((id) => (
                <span key={id} className={`chip${vehicle.parts[id].assembled ? ' on' : ''}`}>
                  {partLabel(id)}
                </span>
              ))}
            </div>
            {assembled && (
              <button type="button" className="btn primary" onClick={() => go('paint')}>
                색칠하러 가기
              </button>
            )}
          </section>
        )}

        {stage === 'paint' && vehicle && (
          <section className="panel">
            <h2>부분 색칠</h2>
            <p className="lead">
              차 전체 hue 필터가 아니라 파츠 단위로 칠합니다. 예: 차체 빨강 · 문 노랑 · 휠 파랑 · 사다리 회색
            </p>
            <p className="hint">추천 조합: {classicHint}</p>
            <div className="swatches" role="listbox" aria-label="물감">
              {FIRETRUCK_PAINT_SWATCHES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`swatch${paintColor === c.hex ? ' on' : ''}`}
                  style={{ background: c.hex }}
                  aria-label={c.ko}
                  onClick={() => {
                    setPaintColor(c.hex)
                    sfx.tap()
                  }}
                />
              ))}
            </div>
            <div className="canvas paint-canvas">
              <VehicleRenderer
                entity={centeredEntity(vehicle)}
                stage={stage}
                selectedPartId={selectedPart}
                mode="paint"
                onPointerDown={onPaintPointerDown}
              />
            </div>
            <div className="part-legend">
              {vehicle.assembleOrder.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`chip${selectedPart === id ? ' on' : ''}`}
                  style={{ borderColor: vehicle.parts[id].color }}
                  onClick={() => {
                    setSelectedPart(id)
                    setVehicle(paintPart(vehicle, id, paintColor))
                    sfx.paint()
                  }}
                >
                  {partLabel(id)}
                </button>
              ))}
            </div>
            <button type="button" className="btn primary" onClick={beginDrive}>
              운전하러 가기
            </button>
          </section>
        )}

        {(stage === 'drive' || stage === 'mission') && vehicle && (
          <section className="panel">
            <h2>{stage === 'drive' ? '운전' : MISSION.title}</h2>
            <p className="lead">
              {stage === 'drive'
                ? 'Vehicle Entity를 드래그해서 움직여요. 바퀴가 회전합니다.'
                : MISSION.hint}
            </p>
            <div
              className={`canvas drive-canvas${stage === 'mission' ? ' mission' : ''}`}
              onPointerDown={onDrivePointer}
              onPointerMove={onDrivePointer}
              onPointerUp={onDrivePointer}
              onPointerCancel={onDrivePointer}
            >
              <div className="workshop-floor" />
              {stage === 'mission' && (
                <div
                  className="mission-fire"
                  style={{
                    left: `${MISSION.target.x * 100}%`,
                    top: `${MISSION.target.y * 100}%`,
                  }}
                  aria-label="불꽃 목표"
                >
                  <span className="flame" />
                  <span className="flame f2" />
                  <span className="flame f3" />
                </div>
              )}
              <VehicleRenderer entity={vehicle} stage={stage} mode="world" />
            </div>
            {stage === 'drive' && (
              <button type="button" className="btn primary" onClick={beginMission}>
                미션 시작 · 위이잉!
              </button>
            )}
          </section>
        )}

        {stage === 'reward' && (
          <section className="panel reward-panel">
            <h2>보상</h2>
            <p className="lead">소방차 파이프라인을 완주했어요!</p>
            <div className="stars" aria-label={`${stars} stars`}>
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} className={`star${i < stars ? ' lit' : ''}`}>
                  ★
                </span>
              ))}
            </div>
            {vehicle && (
              <div className="canvas reward-canvas">
                <VehicleRenderer
                  entity={{ ...centeredEntity(vehicle), animation: 'celebrate' }}
                  stage={stage}
                  mode="paint"
                />
              </div>
            )}
            <p className="policy-note">
              굴착기 · 덤프트럭 · 크레인 · 구급차는 이 소방차 품질 기준을 통과한 뒤에만 확장합니다.
            </p>
            <button type="button" className="btn primary" onClick={resetWorkshop}>
              다시 공방 하기
            </button>
          </section>
        )}
      </main>

      <footer className="footer">
        <span>REFERENCE IMAGE IS NOT A GAME ASSET</span>
        <span>Part-based Vehicle Entity · Firetruck v1</span>
      </footer>
    </div>
  )
}

function partLabel(id: FiretruckPartId): string {
  const map: Record<FiretruckPartId, string> = {
    shadow: '그림자',
    body: '차체',
    door: '문',
    window: '창문',
    bumper: '범퍼',
    ladder: '사다리',
    light: '경광등',
    frontWheel: '앞바퀴',
    rearWheel: '뒷바퀴',
  }
  return map[id]
}

function centeredEntity(vehicle: VehicleEntity): VehicleEntity {
  return {
    ...vehicle,
    position: { x: FIRETRUCK_VIEWBOX.w / 2, y: FIRETRUCK_VIEWBOX.h / 2 },
  }
}

function hitTestAssembledSlots(
  entity: VehicleEntity,
  local: { x: number; y: number },
): FiretruckPartId | null {
  const order = [...entity.assembleOrder].reverse()
  for (const id of order) {
    const part = entity.parts[id]
    if (!part?.assembled) continue
    if (distance(local, part.slotPos) <= 44) return id
  }
  return null
}

function VehicleThumb() {
  const preview = createFiretruckEntity({ assembled: true, id: 'preview' })
  return (
    <div className="thumb">
      <VehicleRenderer entity={centeredEntity(preview)} stage="select" mode="paint" />
    </div>
  )
}
