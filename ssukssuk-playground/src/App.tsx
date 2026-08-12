import { useMemo, useState } from 'react'
import {
  CHARACTER_SLOTS,
  FIRE_TRUCK_01_ASSETS,
  FIRE_TRUCK_01_VEHICLE,
  VEHICLE_CATALOG,
  baselineTriad,
  getAsset,
  isWorkshopPlayable,
} from './assets/registry'
import { AssetRequired } from './components/AssetRequired'
import { BaselineGate } from './components/BaselineGate'
import { StageBar } from './components/StageBar'
import { createFiretruckEntity, toDesign } from './entity/createFiretruck'
import { loadFireTruckDesign, saveFireTruckDesign } from './lib/designStore'
import { sfx } from './lib/sfx'
import type { WorkshopStage } from './types/vehicle'

/**
 * 쑥쑥놀이터 NEW — Constitution-first shell.
 * Workshop gameplay graphics stay gated until baseline triad Quality Gate approval.
 * Temp SVG / emoji / crop / hue-filter cars are never shown as production.
 */
export default function App() {
  const triad = useMemo(() => baselineTriad(), [])
  const playable = isWorkshopPlayable()
  const [stage] = useState<WorkshopStage>('select')
  const [toast, setToast] = useState<string | null>(null)
  const [designPreview, setDesignPreview] = useState(() => loadFireTruckDesign())

  function onSelectVehicle(type: string) {
    sfx.tap()
    if (type !== 'firetruck' || !playable) {
      setToast('ASSET_REQUIRED — 기준 트라이어드 Quality Gate 통과 전입니다')
      window.setTimeout(() => setToast(null), 1800)
      return
    }
    // Future: enter assemble/paint/drive with approved registry bitmaps.
  }

  function persistLogicDemo() {
    // Entity + design persistence can be exercised without faking graphics.
    const entity = createFiretruckEntity({ assembled: true, design: designPreview })
    const design = toDesign(entity)
    saveFireTruckDesign(design)
    setDesignPreview(design)
    sfx.snap()
    setToast('디자인 상태 저장(로직) — 그래픽 APPROVED 후 동일 디자인으로 운전/미션')
    window.setTimeout(() => setToast(null), 2200)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <p className="brand">쑥쑥놀이터 NEW</p>
          <h1>자동차 공방</h1>
          <p className="tagline">VISUAL ASSET CONSTITUTION V1 · REFERENCE ≠ ASSET</p>
        </div>
        <div className="policy-chip" title="REFERENCE IMAGE IS NOT A GAME ASSET">
          Style Ref Only
        </div>
      </header>

      <StageBar stage={stage} unlocked={['select']} />

      {toast && <div className="toast">{toast}</div>}

      <main className="stage-panel">
        <section className="panel constitution-banner">
          <h2>그래픽이 없으면 없는 상태가 맞습니다</h2>
          <p className="lead">
            임시 SVG · Emoji · Visual Bible crop · 전체 hue 색칠 · CSS 가짜 자동차로 공방을
            “완성된 것처럼” 채우지 않습니다. 목표는 상용 어린이 앱 Visual System입니다.
          </p>
          <p className="hint">
            문서: <code>docs/VISUAL_ASSET_CONSTITUTION.md</code>
          </p>
        </section>

        <BaselineGate />

        <section className="panel">
          <h2>차량 카탈로그</h2>
          <p className="lead">
            FIRE_TRUCK_01이 첫 기준 차량입니다. 승인 전에는 모든 카드가 ASSET_REQUIRED입니다.
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
                  asset={
                    entry.type === 'firetruck'
                      ? getAsset('ASSET_FIRETRUCK_BODY')
                      : undefined
                  }
                />
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <h3>캐릭터</h3>
          {CHARACTER_SLOTS.map((c) => (
            <AssetRequired
              key={c.id}
              title={`${c.labelKo}`}
              detail={`상태: ${c.poses.join(', ')}`}
              asset={getAsset('ASSET_SSUKSSUK_IDLE')}
            />
          ))}
        </section>

        <section className="panel">
          <h2>파이프라인 로직 (그래픽 게이트)</h2>
          <p className="lead">
            선택 → 조립 → 부분 색칠 → 운전 → 미션 → 보상 엔티티/저장 구조는 준비되어 있으나,{' '}
            <strong>렌더링은 APPROVED 에셋이 있을 때만</strong> 활성화됩니다.
          </p>
          <ul className="pipeline-list">
            <li>차량 ID: {FIRE_TRUCK_01_VEHICLE.id}</li>
            <li>파츠 수: {FIRE_TRUCK_01_ASSETS.length}</li>
            <li>플레이 가능: {playable ? 'YES' : 'NO (ASSET_REQUIRED)'}</li>
            <li>
              저장된 디자인:{' '}
              {designPreview
                ? `BODY ${designPreview.colors.BODY ?? '-'} · DOOR ${designPreview.colors.DOOR ?? '-'}`
                : '없음'}
            </li>
            <li>
              트라이어드: 쑥쑥이 {triad.ssukssukReady ? 'OK' : 'REQUIRED'} · 소방차{' '}
              {triad.fireTruckReady ? 'OK' : 'REQUIRED'} · 공방{' '}
              {triad.garageReady ? 'OK' : 'REQUIRED'}
            </li>
          </ul>
          <button type="button" className="btn ghost" onClick={persistLogicDemo}>
            디자인 상태 저장 테스트 (그래픽 없음)
          </button>
          <AssetRequired
            asset={getAsset('ASSET_REWARD_STAR')}
            detail="보상 별은 Unicode/Emoji로 대체하지 않습니다."
          />
          <AssetRequired
            asset={getAsset('ASSET_EFFECT_FIRE')}
            detail="미션 불꽃은 CSS 가짜 불꽃으로 대체하지 않습니다."
          />
        </section>
      </main>

      <footer className="footer">
        <span>REFERENCE ≠ ASSET</span>
        <span>Constitution V1 · Registry gate</span>
      </footer>
    </div>
  )
}
