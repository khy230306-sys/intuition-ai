import { useState } from 'react'
import { PLAY_COLORS } from '../data/colors'
import { speak } from '../lib/speech'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'

type Subject = {
  id: string
  ko: string
  emoji: string
  kind: 'car' | 'fun'
}

const SUBJECTS: Subject[] = [
  { id: 'car', ko: '자동차', emoji: '🚗', kind: 'car' },
  { id: 'bus', ko: '버스', emoji: '🚌', kind: 'car' },
  { id: 'fire', ko: '소방차', emoji: '🚒', kind: 'car' },
  { id: 'police', ko: '경찰차', emoji: '🚓', kind: 'car' },
  { id: 'ambulance', ko: '구급차', emoji: '🚑', kind: 'car' },
  { id: 'truck', ko: '트럭', emoji: '🚚', kind: 'car' },
  { id: 'train', ko: '기차', emoji: '🚂', kind: 'car' },
  { id: 'plane', ko: '비행기', emoji: '✈️', kind: 'fun' },
  { id: 'house', ko: '집', emoji: '🏠', kind: 'fun' },
  { id: 'cat', ko: '고양이', emoji: '🐱', kind: 'fun' },
  { id: 'dog', ko: '강아지', emoji: '🐶', kind: 'fun' },
  { id: 'flower', ko: '꽃', emoji: '🌸', kind: 'fun' },
  { id: 'star', ko: '별', emoji: '⭐', kind: 'fun' },
  { id: 'rocket', ko: '로켓', emoji: '🚀', kind: 'fun' },
  { id: 'fish', ko: '물고기', emoji: '🐟', kind: 'fun' },
  { id: 'dinosaur', ko: '공룡', emoji: '🦕', kind: 'fun' },
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
              className={`subject-chip${subject.id === s.id ? ' on' : ''}`}
              onClick={() => pickSubject(s)}
            >
              <span aria-hidden>{s.emoji}</span>
              <span>{s.ko}</span>
            </button>
          ))}
        </div>

        <div className="color-stage" style={{ background: `${color.hex}33` }} aria-label={`${color.ko} ${subject.ko}`}>
          <div className="color-stage-emoji" style={{ filter: `drop-shadow(0 0 0 ${color.hex})` }}>
            {subject.emoji}
          </div>
          <div className="color-stage-blob" style={{ background: color.hex }} />
          {subject.kind === 'car' && (
            <div className="paint-car mini" aria-hidden>
              <div className="cabin" />
              <div className="body" style={{ background: color.hex }} />
              <div className="wheel l" />
              <div className="wheel r" />
            </div>
          )}
        </div>

        <div className="grid-3" style={{ marginTop: '0.9rem' }}>
          {PLAY_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="swatch"
              style={{
                background: c.hex,
                color: c.id === 'yellow' ? '#1a1510' : '#fff',
                outline: c.id === color.id ? '4px solid #1a1510' : undefined,
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

/** Keep old export name for routes */
export { ColorBook as CarPaint }
