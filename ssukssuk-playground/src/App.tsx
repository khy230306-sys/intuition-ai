import { useEffect, useMemo, useState } from 'react'
import {
  CHARACTER_SLOTS,
  FIRE_TRUCK_01_ASSETS,
  FIRE_TRUCK_01_VEHICLE,
  VEHICLE_CATALOG,
  baselineTriad,
  getAsset,
  isWorkshopPlayable,
} from './assets/registry'
import { buildFactorySnapshot } from './assets/factory/pipeline'
import { getAssetProviderStatus } from './assets/factory/provider'
import {
  ASSET_DELIVERY_MODE,
  IMPORT_DIRECTORY,
} from './assets/delivery/mode'
import { REQUIRED_BASELINE_FILENAMES } from './assets/delivery/slots'
import { buildClientManifest } from './assets/manifest/productionGate'
import { AssetRequired } from './components/AssetRequired'
import { BaselineGate } from './components/BaselineGate'
import { StageBar } from './components/StageBar'
import { StudioStagePanel } from './components/StudioStagePanel'
import {
  applySoap,
  createCareState,
  resolveIssue,
  rinseWater,
  scrubSponge,
  type CareState,
  type RepairIssueId,
} from './entity/careOps'
import { createFiretruckEntity, toDesign } from './entity/createFiretruck'
import { loadFireTruckDesign, saveFireTruckDesign } from './lib/designStore'
import {
  DEFAULT_CUSTOMIZATION,
  saveVehicleCustomization,
  type VehicleCustomization,
} from './lib/vehicleCustomization'
import { recordGrowthEvent } from './growth/store'
import { evaluatePrototypeGates } from './prototype/playLoop'
import { sfx } from './lib/sfx'
import { FIRETRUCK_PAINT_SWATCHES } from './studio/paintSwatches'
import {
  STAGE_FLOW,
  nextStage,
  requiresApprovedArt,
  unlockThrough,
} from './studio/stageFlow'
import type { WorkshopStage } from './types/vehicle'

/**
 * AIZIO Studio · 쑥쑥놀이터 NEW — Production Prototype 01 shell.
 * Play loop stays BLOCKED until BASELINE TRIAD is GAME_READY.
 * Style Master / Visual Bible = reference only — never cropped into assets.
 */
export default function App() {
  const triad = useMemo(() => baselineTriad(), [])
  const factory = useMemo(() => buildFactorySnapshot(), [])
  const provider = useMemo(() => getAssetProviderStatus(), [])
  const gates = useMemo(() => evaluatePrototypeGates(), [])
  const manifestApproved = useMemo(
    () => buildClientManifest().filter((m) => m.productionApproved).length,
    [],
  )
  const playable = isWorkshopPlayable()
  const [stage, setStage] = useState<WorkshopStage>('select')
  const [unlocked, setUnlocked] = useState<WorkshopStage[]>(['select', 'growth'])
  const [toast, setToast] = useState<string | null>(null)
  const [designPreview, setDesignPreview] = useState(() => loadFireTruckDesign())
  const [paintColor, setPaintColor] = useState(FIRETRUCK_PAINT_SWATCHES[0].hex)
  const [care, setCare] = useState<CareState>(() => createCareState())

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2000)
    return () => window.clearTimeout(id)
  }, [toast])

  function go(next: WorkshopStage) {
    if (requiresApprovedArt(next) && !playable) {
      sfx.tap()
      setToast('ASSET_REQUIRED — BASELINE TRIAD Quality Gate 전입니다')
      return
    }
    setStage(next)
    setUnlocked((u) => Array.from(new Set([...u, ...unlockThrough(next), 'growth'])))
  }

  function onSelectVehicle(type: string) {
    sfx.tap()
    if (type !== 'firetruck' || !playable) {
      setToast('ASSET_REQUIRED — BASELINE TRIAD Quality Gate 전입니다')
      return
    }
    sfx.whoosh()
    const entity = createFiretruckEntity({ assembled: false, design: designPreview })
    setCare(entity.care)
    go('assemble')
    setToast('부품을 끌어다 조립해요!')
  }

  function persistLogicDemo() {
    const entity = createFiretruckEntity({
      assembled: true,
      design: designPreview,
      care,
    })
    // Apply selected paint to body for demo persistence
    entity.parts.body.color = paintColor
    const design = toDesign(entity)
    saveFireTruckDesign(design)
    const custom: VehicleCustomization = {
      ...DEFAULT_CUSTOMIZATION,
      bodyColor: design.colors.BODY ?? paintColor,
      frontDoorColor: design.colors.FRONT_DOOR ?? DEFAULT_CUSTOMIZATION.frontDoorColor,
      rearDoorColor: design.colors.REAR_DOOR ?? DEFAULT_CUSTOMIZATION.rearDoorColor,
      frontRimColor: design.colors.RIM ?? DEFAULT_CUSTOMIZATION.frontRimColor,
      rearRimColor: design.colors.RIM ?? DEFAULT_CUSTOMIZATION.rearRimColor,
      bumperColor: design.colors.BUMPER ?? DEFAULT_CUSTOMIZATION.bumperColor,
      ladderColor: design.colors.LADDER ?? DEFAULT_CUSTOMIZATION.ladderColor,
      assembledParts: design.assembledParts,
      updatedAt: Date.now(),
    }
    saveVehicleCustomization(custom)
    setDesignPreview(design)
    recordGrowthEvent({
      activity: 'paint',
      skill: 'color_recognition',
      signal: 0.8,
      hintsUsed: 0,
      retries: 0,
      noteKo: 'customization 로직 저장',
    })
    sfx.snap()
    setToast('customization 저장 — 세차/정비/운전/미션 동일 상태용')
  }

  function onSoap() {
    if (!playable) return
    setCare((c) => applySoap(c))
    sfx.wash()
  }

  function onScrub() {
    if (!playable) return
    setCare((c) => scrubSponge(c))
    sfx.wash()
    recordGrowthEvent({
      activity: 'wash',
      skill: 'fine_motor_control',
      signal: 0.7,
      hintsUsed: 0,
      retries: 0,
    })
  }

  function onRinse() {
    if (!playable) return
    setCare((c) => rinseWater(c))
    sfx.wash()
  }

  function onResolveIssue(id: RepairIssueId) {
    if (!playable) return
    setCare((c) => resolveIssue(c, id))
    sfx.repair()
    recordGrowthEvent({
      activity: 'repair',
      skill: 'sequence_understanding',
      signal: 0.75,
      hintsUsed: 0,
      retries: 0,
    })
  }

  function onLogicAdvance() {
    const n = nextStage(stage)
    if (n) go(n)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <p className="brand">아이지오 스튜디오</p>
          <p className="brand-sub">AIZIO STUDIO · 쑥쑥놀이터 NEW</p>
          <h1>자동차 공방 · Prototype 01</h1>
          <p className="tagline">선택→조립→색칠→세차→정비→운전→미션→보상→성장</p>
        </div>
        <div className="policy-chip" title="REFERENCE IMAGE IS NOT A GAME ASSET">
          Style Ref Only
        </div>
      </header>

      <StageBar stage={stage} unlocked={unlocked} onJump={go} />

      {toast && <div className="toast">{toast}</div>}

      <main className="stage-panel">
        <StudioStagePanel
          stage={stage}
          playable={playable}
          care={care}
          paintColor={paintColor}
          onPaintColor={(hex) => {
            setPaintColor(hex)
            sfx.paint()
          }}
          onSoap={onSoap}
          onScrub={onScrub}
          onRinse={onRinse}
          onResolveIssue={onResolveIssue}
          onLogicAdvance={onLogicAdvance}
          onPersistCustomization={persistLogicDemo}
        />

        <section className="panel constitution-banner">
          <h2>Prototype 01 = {gates.PROTOTYPE_01}</h2>
          <p className="lead">
            Visual Style Master는 DNA 고정용입니다. crop/분할 금지. Provider 없이 임시 그래픽을
            넣지 않습니다.
          </p>
          <ul className="pipeline-list">
            <li>ASSET_DELIVERY_MODE: {ASSET_DELIVERY_MODE}</li>
            <li>IMPORT_DIRECTORY: {IMPORT_DIRECTORY}</li>
            <li>REQUIRED masters: {REQUIRED_BASELINE_FILENAMES.join(', ')}</li>
            <li>ASSET_PROVIDER_STATUS: {provider.status}</li>
            <li>Factory baselineReady: {String(factory.baselineReady)}</li>
            <li>Manifest productionApproved: {manifestApproved}</li>
            <li>VISUAL_PRODUCTION_GATE: {gates.VISUAL_PRODUCTION_GATE}</li>
            <li>FUNCTIONAL_GATE: {gates.FUNCTIONAL_GATE}</li>
            <li>FORBIDDEN_ASSET_GATE: {gates.FORBIDDEN_ASSET_GATE} (CI test)</li>
            <li>GROWTH_DATA_GATE: {gates.GROWTH_DATA_GATE}</li>
            <li>STAGE_FLOW: {STAGE_FLOW.join(' → ')}</li>
          </ul>
        </section>

        <BaselineGate />

        <section className="panel">
          <h2>Play Loop (gated)</h2>
          <p className="lead">
            TRIAD GAME_READY 전에는 조립·색칠·세차·정비·운전·미션을 가짜 완료로 열지 않습니다.
          </p>
          <ul className="pipeline-list">
            {gates.stages.map((s) => (
              <li key={s.id}>
                {s.labelKo}: <strong>{s.gate}</strong> — {s.interactive.join(', ')}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>차량 카탈로그</h2>
          <p className="lead">
            FIRE_TRUCK_01만 기준 차량입니다. 파츠 {FIRE_TRUCK_01_ASSETS.length} · 상태{' '}
            {FIRE_TRUCK_01_VEHICLE.status}
          </p>
          <div className="vehicle-grid">
            {VEHICLE_CATALOG.map((entry) => (
              <button
                key={entry.type}
                type="button"
                className="vehicle-card locked"
                onClick={() => onSelectVehicle(entry.type)}
              >
                <AssetRequired
                  title={entry.labelKo}
                  detail={entry.note}
                  asset={entry.type === 'firetruck' ? getAsset('ASSET_FIRETRUCK_BODY') : undefined}
                />
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <h3>캐릭터 Bible</h3>
          {CHARACTER_SLOTS.map((c) => (
            <AssetRequired
              key={c.id}
              title={c.labelKo}
              detail={`상태: ${c.poses.join(', ')} · docs/style/CHARACTER_BIBLE_SSUKSSUK.md`}
              asset={getAsset('ASSET_SSUKSSUK_IDLE')}
            />
          ))}
        </section>

        <section className="panel">
          <h2>파이프라인 로직</h2>
          <p className="lead">
            Entity + wash/repair care + vehicleCustomization + Growth 데이터 구조는 준비. 렌더는
            APPROVED 비트맵만.
          </p>
          <ul className="pipeline-list">
            <li>
              트라이어드: 쑥쑥이 {triad.ssukssukReady ? 'OK' : 'REQUIRED'} · 소방차{' '}
              {triad.fireTruckReady ? 'OK' : 'REQUIRED'} · 공방{' '}
              {triad.garageReady ? 'OK' : 'REQUIRED'}
            </li>
            <li>
              저장 디자인:{' '}
              {designPreview
                ? `BODY ${designPreview.colors.BODY ?? '-'} · FRONT_DOOR ${designPreview.colors.FRONT_DOOR ?? '-'}`
                : '없음'}
            </li>
            <li>
              care: dirt {(care.dirtLevel * 100).toFixed(0)}% · 이슈{' '}
              {care.issues.filter((i) => !i.resolved).length}/{care.issues.length}
            </li>
          </ul>
          <button type="button" className="btn ghost" onClick={persistLogicDemo}>
            customization 저장 테스트 (그래픽 없음)
          </button>
          <AssetRequired asset={getAsset('ASSET_REWARD_STAR')} />
          <AssetRequired asset={getAsset('ASSET_EFFECT_FIRE')} />
          <AssetRequired asset={getAsset('ASSET_GARAGE_BACKGROUND')} />
          <AssetRequired asset={getAsset('ASSET_WASH_BAY_BACKGROUND')} />
          <AssetRequired asset={getAsset('ASSET_REPAIR_BAY_BACKGROUND')} />
        </section>
      </main>

      <footer className="footer">
        <span>AIZIO Studio · VSM-2026-08-12 · REFERENCE ≠ ASSET</span>
        <span>Prototype 01 · {gates.PROTOTYPE_01}</span>
      </footer>
    </div>
  )
}
