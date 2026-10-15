import { Link, useParams } from 'react-router-dom'
import { COLORS } from '../data/colors'
import { VEHICLES } from '../data/vehicles'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { CHAR_IMG, CharImg } from '../components/GameArt'
import { PaintSubject } from '../components/PaintSubject'

const VEHICLE_KIND: Record<string, string> = {
  car: 'car',
  sports: 'car',
  taxi: 'car',
  police: 'police',
  fire: 'fire',
  ambulance: 'ambulance',
  bus: 'bus',
  school: 'bus',
  truck: 'truck',
  dump: 'truck',
  tractor: 'tractor',
  mixer: 'truck',
  train: 'bus',
  moto: 'car',
}

const VEHICLE_COLOR: Record<string, string> = {
  car: '#FF2D55',
  sports: '#FF7A00',
  taxi: '#FFD400',
  police: '#2F6BFF',
  fire: '#FF2D55',
  ambulance: '#FFF8E7',
  bus: '#FFD400',
  school: '#FFD400',
  truck: '#FF7A00',
  dump: '#FF7A00',
  tractor: '#22C55E',
  mixer: '#8B5CF6',
  train: '#2F6BFF',
  moto: '#1A1510',
}

const SHOW_VEHICLES = VEHICLES.filter((v) => v.id in VEHICLE_KIND)

export function Explore() {
  const { topic } = useParams()
  if (topic === 'colors') return <ColorExplore />
  if (topic === 'vehicles') return <VehicleExplore />

  return (
    <div>
      <div className="page-head">
        <h1>탐험</h1>
      </div>
      <p className="section-sub" style={{ marginTop: '-0.4rem' }}>
        눌러서 배워 보아요
      </p>
      <div className="grid-2">
        <Link to="/explore/colors" className="card art-card photo-card" style={{ background: '#FFD6E4' }}>
          <div className="art-wrap photo">
            <CharImg src={CHAR_IMG.paint} size={110} />
          </div>
          <div className="card-title">색깔</div>
          <div className="card-sub">{COLORS.length}가지</div>
        </Link>
        <Link to="/explore/vehicles" className="card art-card photo-card" style={{ background: '#D6E4FF' }}>
          <div className="art-wrap photo">
            <CharImg src={CHAR_IMG.fire} size={110} />
          </div>
          <div className="card-title">자동차</div>
          <div className="card-sub">{SHOW_VEHICLES.length}대</div>
        </Link>
      </div>
    </div>
  )
}

function ColorExplore() {
  return (
    <div>
      <div className="page-head">
        <Link to="/explore" className="icon-btn" aria-label="뒤로">
          ←
        </Link>
        <h1>색깔</h1>
      </div>
      <div className="grid-3">
        {COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            className="card explore-item bold-color"
            style={{
              background: c.hex,
              color: c.id === 'yellow' || c.id === 'white' || c.id === 'lime' ? '#1a1510' : '#fff',
            }}
            onClick={() => {
              sfx.tap()
              speak(c.ko)
            }}
          >
            <span className="color-blob" style={{ background: c.hex }} />
            <div className="ko">{c.ko}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function VehicleExplore() {
  return (
    <div>
      <div className="page-head">
        <Link to="/explore" className="icon-btn" aria-label="뒤로">
          ←
        </Link>
        <h1>자동차</h1>
      </div>
      <div className="grid-2">
        {SHOW_VEHICLES.map((v) => (
          <button
            key={v.id}
            type="button"
            className="card explore-item art-card photo-card"
            onClick={() => {
              sfx.horn()
              speak(`${v.ko}. ${v.sound}`)
            }}
          >
            <div className="art-wrap photo">
              <PaintSubject kind={VEHICLE_KIND[v.id]!} color={VEHICLE_COLOR[v.id] || '#FFD400'} size={120} />
            </div>
            <div className="ko">{v.ko}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
