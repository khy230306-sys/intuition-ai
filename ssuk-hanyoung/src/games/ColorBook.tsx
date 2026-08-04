import { useState } from 'react'
import { PLAY_COLORS } from '../data/colors'
import { speak } from '../lib/speech'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { CartoonArt, type ArtKind } from '../components/CartoonArt'

type Subject = {
  id: ArtKind
  ko: string
  kind: 'car' | 'fun'
}

const SUBJECTS: Subject[] = [
  { id: 'car', ko: '자동차', kind: 'car' },
  { id: 'bus', ko: '버스', kind: 'car' },
  { id: 'fire', ko: '소방차', kind: 'car' },
  { id: 'police', ko: '경찰차', kind: 'car' },
  { id: 'ambulance', ko: '구급차', kind: 'car' },
  { id: 'truck', ko: '트럭', kind: 'car' },
  { id: 'train', ko: '기차', kind: 'car' },
  { id: 'plane', ko: '비행기', kind: 'fun' },
  { id: 'house', ko: '집', kind: 'fun' },
  { id: 'cat', ko: '고양이', kind: 'fun' },
  { id: 'dog', ko: '강아지', kind: 'fun' },
  { id: 'flower', ko: '꽃', kind: 'fun' },
  { id: 'star', ko: '별', kind: 'fun' },
  { id: 'rocket', ko: '로켓', kind: 'fun' },
  { id: 'fish', ko: '물고기', kind: 'fun' },
  { id: 'dinosaur', ko: '공룡', kind: 'fun' },
]

export function ColorBook() {
  const [subject, setSubject] = useState(SUBJECTS[0]!)
  const [color, setColor] = useState(PLAY_COLORS[0]!)
  const [painted, setPainted] = useState(0)
  const [confetti, setConfetti] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function pickSubject(s: Subject) {
    setSubject(s)
    speak(`${s.ko}를 색칠해 보아요`)
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
    <GameShell title="색칠놀이" subtitle="원하는 그림을 골라 색칠해요">
      <Confetti show={confetti} />
      {toast && <div className="toast">{toast}</div>}
      <div className="prompt">
        <div className="prompt-big">
          {color.ko} {subject.ko}
        </div>
        <div className="prompt-sub">위 그림을 고르고, 아래 색깔을 눌러요</div>
      </div>
      <div className="play-area">
        <div className="subject-row">
          {SUBJECTS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`subject-chip art${subject.id === s.id ? ' on' : ''}`}
              onClick={() => pickSubject(s)}
            >
              <CartoonArt kind={s.id} color={subject.id === s.id ? color.hex : '#FFD400'} size={44} />
              <span>{s.ko}</span>
            </button>
          ))}
        </div>

        <div className="color-stage bold" style={{ background: `linear-gradient(180deg, ${color.hex}55, #fff8e7)` }}>
          <CartoonArt kind={subject.id} color={color.hex} size={200} className="stage-art" />
        </div>

        <div className="grid-3" style={{ marginTop: '0.9rem' }}>
          {PLAY_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`swatch bold${c.id === color.id ? ' on' : ''}`}
              style={{
                background: c.hex,
                color: c.id === 'yellow' ? '#1a1510' : '#fff',
              }}
              onClick={() => paint(c)}
            >
              {c.ko.replace('색', '')}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-sky btn-block"
          style={{ marginTop: '0.8rem' }}
          onClick={() => speak(`이 ${subject.ko}는 ${color.ko}이에요`)}
        >
          말하기 🔊
        </button>
      </div>
    </GameShell>
  )
}

export { ColorBook as CarPaint }
