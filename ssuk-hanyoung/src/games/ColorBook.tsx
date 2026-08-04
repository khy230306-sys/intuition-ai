import { useState } from 'react'
import { PLAY_COLORS } from '../data/colors'
import { speak } from '../lib/speech'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { CHAR_IMG, CharImg } from '../components/GameArt'

type Subject = { id: string; ko: string; src: string }

const SUBJECTS: Subject[] = [
  { id: 'car', ko: '자동차', src: CHAR_IMG.car },
  { id: 'bus', ko: '버스', src: CHAR_IMG.bus },
  { id: 'fire', ko: '소방차', src: CHAR_IMG.fire },
  { id: 'police', ko: '경찰차', src: CHAR_IMG.police },
  { id: 'ambulance', ko: '구급차', src: CHAR_IMG.ambulance },
  { id: 'truck', ko: '트럭', src: CHAR_IMG.dump },
  { id: 'tractor', ko: '트랙터', src: CHAR_IMG.tractor },
  { id: 'paint', ko: '팔레트', src: CHAR_IMG.paint },
  { id: 'sand', ko: '모래성', src: CHAR_IMG.sand },
  { id: 'star', ko: '별', src: CHAR_IMG.star },
  { id: 'drum', ko: '북', src: CHAR_IMG.drum },
]

export function ColorBook() {
  const [subject, setSubject] = useState(SUBJECTS[0]!)
  const [color, setColor] = useState(PLAY_COLORS[0]!)
  const [painted, setPainted] = useState(0)
  const [confetti, setConfetti] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function pickSubject(s: Subject) {
    setSubject(s)
    speak(`${s.ko}를 골라 보아요`)
  }

  function paint(c: (typeof PLAY_COLORS)[number]) {
    setColor(c)
    speak(`${c.ko} ${subject.ko}!`)
    const next = painted + 1
    setPainted(next)
    if (next % 4 === 0) {
      addStars(1, 'car-paint')
      setToast('멋져요!')
      setConfetti(true)
      setTimeout(() => {
        setToast(null)
        setConfetti(false)
      }, 1200)
    }
  }

  return (
    <GameShell title="색칠놀이" subtitle="캐릭터를 고르고 색깔 무대를 바꿔요">
      <Confetti show={confetti} />
      {toast && <div className="toast">{toast}</div>}
      <div className="prompt">
        <div className="prompt-big">
          {color.ko} {subject.ko}
        </div>
        <div className="prompt-sub">아래 색깔을 누르면 무대가 바뀌어요</div>
      </div>
      <div className="play-area">
        <div className="subject-row">
          {SUBJECTS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`subject-chip photo${subject.id === s.id ? ' on' : ''}`}
              onClick={() => pickSubject(s)}
            >
              <CharImg src={s.src} size={48} />
              <span>{s.ko}</span>
            </button>
          ))}
        </div>

        <div
          className="color-stage photo-stage"
          style={{
            background: `radial-gradient(circle at 50% 70%, #fff 0 26%, ${color.hex} 27% 100%)`,
            boxShadow: `0 0 0 6px ${color.hex}`,
          }}
        >
          <CharImg src={subject.src} size={210} className="stage-photo" />
          <div className="color-ribbon" style={{ background: color.hex }}>
            {color.ko}
          </div>
        </div>

        <div className="grid-3" style={{ marginTop: '0.9rem' }}>
          {PLAY_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`swatch bold${c.id === color.id ? ' on' : ''}`}
              style={{ background: c.hex, color: c.id === 'yellow' ? '#1a1510' : '#fff' }}
              onClick={() => paint(c)}
            >
              {c.ko.replace('색', '')}
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  )
}

export { ColorBook as CarPaint }
