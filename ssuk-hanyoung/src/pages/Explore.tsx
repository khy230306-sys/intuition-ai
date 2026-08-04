import { Link, useParams } from 'react-router-dom'
import { COLORS } from '../data/colors'
import { VEHICLES } from '../data/vehicles'
import { speak } from '../lib/speech'
import { CHAR_IMG, CharImg } from '../components/GameArt'

const VEHICLE_IMG: Record<string, string> = {
  car: CHAR_IMG.car,
  sports: CHAR_IMG.car,
  taxi: CHAR_IMG.car,
  police: CHAR_IMG.police,
  fire: CHAR_IMG.fire,
  ambulance: CHAR_IMG.ambulance,
  bus: CHAR_IMG.bus,
  school: CHAR_IMG.busFront,
  truck: CHAR_IMG.dump,
  dump: CHAR_IMG.dump,
  tractor: CHAR_IMG.tractor,
  mixer: CHAR_IMG.dump,
  train: CHAR_IMG.bus,
  plane: CHAR_IMG.star,
  helicopter: CHAR_IMG.star,
  boat: CHAR_IMG.ambulance,
  bike: CHAR_IMG.car,
  moto: CHAR_IMG.police,
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
        진짜 자동차 친구들을 만져 보아요
      </p>
      <div className="grid-2">
        <Link to="/explore/colors" className="card art-card photo-card" style={{ background: '#FFD6E4' }}>
          <div className="art-wrap photo">
            <CharImg src={CHAR_IMG.paint} size={110} />
          </div>
          <div className="card-title">색깔 탐험</div>
          <div className="card-sub">{COLORS.length}가지 선명한 색깔</div>
        </Link>
        <Link to="/explore/vehicles" className="card art-card photo-card" style={{ background: '#D6E4FF' }}>
          <div className="art-wrap photo">
            <CharImg src={CHAR_IMG.fire} size={110} />
          </div>
          <div className="card-title">탈것 탐험</div>
          <div className="card-sub">입체 자동차 캐릭터</div>
        </Link>
        <Link to="/games" className="card art-card photo-card" style={{ background: '#FFF2B8' }}>
          <div className="art-wrap photo">
            <CharImg src={CHAR_IMG.bus} size={110} />
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
          <button key={v.id} type="button" className="card explore-item art-card photo-card" onClick={() => speak(`${v.ko}. ${v.sound}`)}>
            <div className="art-wrap photo">
              <CharImg src={VEHICLE_IMG[v.id] || CHAR_IMG.car} size={120} />
            </div>
            <div className="ko">{v.ko}</div>
            <div className="en">{v.en}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
