import {
  baselineTriad,
  FIRE_TRUCK_01_ASSETS,
  GARAGE_ASSETS,
  SSUKSSUK_ASSETS,
} from '../assets/registry'
import { AssetRequired } from './AssetRequired'

/** First quality lock: Ssukssuk + FIRE_TRUCK_01 + Garage — before any expansion. */
export function BaselineGate() {
  const triad = baselineTriad()

  return (
    <section className="panel baseline-gate">
      <h2>기준 Asset 트라이어드</h2>
      <p className="lead">
        쑥쑥이 + FIRE_TRUCK_01 + 자동차 공방 Visual Quality가 모두 APPROVED 되기 전에는 공방 플레이와
        차량 확장을 하지 않습니다.
      </p>

      <div className="triad-status">
        <StatusPill label="쑥쑥이" ok={triad.ssukssukReady} count={triad.groups.ssukssuk.length} />
        <StatusPill
          label="FIRE_TRUCK_01"
          ok={triad.fireTruckReady}
          count={triad.groups.fire_truck_01.length}
        />
        <StatusPill label="자동차 공방" ok={triad.garageReady} count={triad.groups.garage.length} />
      </div>

      <p className="hint">
        Registry: APPROVED {triad.approvedCount} · ASSET_REQUIRED {triad.requiredCount}
      </p>

      <h3>쑥쑥이 Character Bible</h3>
      <div className="spec-grid">
        {SSUKSSUK_ASSETS.map((a) => (
          <AssetRequired key={a.id} asset={a} />
        ))}
      </div>

      <h3>FIRE_TRUCK_01 파츠</h3>
      <div className="spec-grid">
        {FIRE_TRUCK_01_ASSETS.map((a) => (
          <AssetRequired key={a.id} asset={a} />
        ))}
      </div>

      <h3>자동차 공방</h3>
      <div className="spec-grid">
        {GARAGE_ASSETS.map((a) => (
          <AssetRequired key={a.id} asset={a} />
        ))}
      </div>
    </section>
  )
}

function StatusPill({ label, ok, count }: { label: string; ok: boolean; count: number }) {
  return (
    <div className={`triad-pill${ok ? ' ok' : ''}`}>
      <strong>{label}</strong>
      <span>{ok ? 'APPROVED' : 'ASSET_REQUIRED'}</span>
      <em>{count} assets</em>
    </div>
  )
}
