import { Link, useParams } from 'react-router-dom'
import { COLORS } from '../data/colors'
import { VEHICLES } from '../data/vehicles'
import { speak } from '../lib/speech'

export function Explore() {
  const { topic } = useParams()
  if (topic === 'colors') return <ColorExplore />
  if (topic === 'vehicles') return <VehicleExplore />

  return (
    <div>
      <div className="page-head">
        <h1>탐험 🧭</h1>
      </div>
      <p className="section-sub" style={{ marginTop: '-0.4rem' }}>
        터치하면 이름과 소리를 들려줘요
      </p>
      <div className="grid-2">
        <Link to="/explore/colors" className="card" style={{ background: '#ffe3ea' }}>
          <div className="card-emoji">🎨</div>
          <div className="card-title">색깔 탐험</div>
          <div className="card-sub">{COLORS.length}가지 색깔</div>
        </Link>
        <Link to="/explore/vehicles" className="card" style={{ background: '#dde8ff' }}>
          <div className="card-emoji">🚒</div>
          <div className="card-title">탈것 탐험</div>
          <div className="card-sub">{VEHICLES.length}가지 탈것</div>
        </Link>
        <Link to="/games" className="card" style={{ background: '#fff2b8' }}>
          <div className="card-emoji">🎈</div>
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
            className="card explore-item"
            style={{ background: c.hex, color: c.id === 'yellow' || c.id === 'white' || c.id === 'lime' ? '#1a1510' : '#fff' }}
            onClick={() => speak(`${c.ko}. ${c.en}`)}
          >
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
      <div className="grid-3">
        {VEHICLES.map((v) => (
          <button
            key={v.id}
            type="button"
            className="card explore-item"
            onClick={() => speak(`${v.ko}. ${v.sound}`)}
          >
            {v.img ? (
              <img src={v.img} alt="" width={56} height={56} style={{ margin: '0 auto', objectFit: 'contain' }} />
            ) : (
              <div className="big">{v.emoji}</div>
            )}
            <div className="ko">{v.ko}</div>
            <div className="en">{v.en}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
