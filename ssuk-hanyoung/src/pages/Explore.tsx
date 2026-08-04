import { Link, useParams } from 'react-router-dom'
import { COLORS } from '../data/colors'
import { VEHICLES } from '../data/vehicles'
import { speak } from '../lib/speech'
import { CartoonArt } from '../components/CartoonArt'

const VEHICLE_ART: Record<string, string> = {
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
  tractor: 'truck',
  mixer: 'truck',
  train: 'train',
  plane: 'plane',
  helicopter: 'plane',
  boat: 'car',
  bike: 'car',
  moto: 'car',
}

const VEHICLE_COLOR: Record<string, string> = {
  car: '#FF2D55',
  sports: '#2F6BFF',
  taxi: '#FFD400',
  police: '#2F6BFF',
  fire: '#FF2D55',
  ambulance: '#FFF8E7',
  bus: '#FFD400',
  school: '#FFD400',
  truck: '#22C55E',
  dump: '#FF7A00',
  tractor: '#22C55E',
  mixer: '#8B5CF6',
  train: '#FF2D55',
  plane: '#38BDF8',
  helicopter: '#8B5CF6',
  boat: '#2F6BFF',
  bike: '#FF5DA2',
  moto: '#1A1510',
}

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
        크게 그려진 색깔·탈것을 만져 보아요
      </p>
      <div className="grid-2">
        <Link to="/explore/colors" className="card art-card" style={{ background: '#FFD6E4' }}>
          <div className="art-wrap">
            <CartoonArt kind="flower" color="#FF2D55" size={72} />
          </div>
          <div className="card-title">색깔 탐험</div>
          <div className="card-sub">{COLORS.length}가지 선명한 색깔</div>
        </Link>
        <Link to="/explore/vehicles" className="card art-card" style={{ background: '#D6E4FF' }}>
          <div className="art-wrap">
            <CartoonArt kind="fire" color="#FF2D55" size={72} />
          </div>
          <div className="card-title">탈것 탐험</div>
          <div className="card-sub">뚜렷한 자동차 친구들</div>
        </Link>
        <Link to="/games" className="card art-card" style={{ background: '#FFF2B8' }}>
          <div className="art-wrap">
            <CartoonArt kind="bus" color="#FFD400" size={72} />
          </div>
          <div className="card-title">재미있는 게임</div>
          <div className="card-sub">부릉부릉 놀이하러 가요</div>
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
        <h1>색깔 탐험</h1>
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
              borderColor: '#1a1510',
            }}
            onClick={() => speak(`${c.ko}. ${c.en}`)}
          >
            <span className="color-blob" style={{ background: c.hex }} />
            <div className="ko">{c.ko}</div>
            <div className="en">{c.en}</div>
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
        <h1>탈것 탐험</h1>
      </div>
      <div className="grid-2">
        {VEHICLES.map((v) => (
          <button key={v.id} type="button" className="card explore-item art-card" onClick={() => speak(`${v.ko}. ${v.sound}`)}>
            <div className="art-wrap">
              <CartoonArt kind={VEHICLE_ART[v.id] || 'car'} color={VEHICLE_COLOR[v.id] || '#FF2D55'} size={96} />
            </div>
            <div className="ko">{v.ko}</div>
            <div className="en">{v.en}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
