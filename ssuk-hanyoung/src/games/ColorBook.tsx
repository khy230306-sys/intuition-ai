import { useState } from 'react'
import { PLAY_COLORS } from '../data/colors'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { KIND_NATURAL, PaintSubject } from '../components/PaintSubject'

type Subject = { id: string; ko: string }

const SUBJECTS: Subject[] = [
  { id: 'car', ko: '자동차' },
  { id: 'bus', ko: '버스' },
  { id: 'fire', ko: '소방차' },
  { id: 'police', ko: '경찰차' },
  { id: 'ambulance', ko: '구급차' },
  { id: 'truck', ko: '트럭' },
  { id: 'tractor', ko: '트랙터' },
  { id: 'star', ko: '별' },
  { id: 'paint', ko: '팔레트' },
  { id: 'sand', ko: '모래성' },
  { id: 'drum', ko: '북' },
]

export function ColorBook() {
  const [subject, setSubject] = useState(SUBJECTS[0]!)
  const [color, setColor] = useState(PLAY_COLORS.find((c) => c.id === 'pink') ?? PLAY_COLORS[0]!)
  const [painted, setPainted] = useState(0)
  const [confetti, setConfetti] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [pop, setPop] = useState(0)

  function pickSubject(s: Subject) {
    setSubject(s)
    speak(`${s.ko}를 골라 보아요`)
  }

  function paint(c: (typeof PLAY_COLORS)[number]) {
    setColor(c)
    setPop((n) => n + 1)
    sfx.paint()
    speak(`${c.ko} ${subject.ko}!`)
    const next = painted + 1
    setPainted(next)
    if (next % 4 === 0) {
      addStars(1, 'car-paint')
      sfx.cheer()
      setToast('멋져요!')
      setConfetti(true)
      setTimeout(() => {
        setToast(null)
        setConfetti(false)
      }, 1200)
    }
  }

  return (
    <GameShell title="색칠놀이" subtitle="원하는 색으로 자동차를 칠해요">
      <Confetti show={confetti} />
      {toast && <div className="toast">{toast}</div>}
      <div className="prompt">
        <div className="prompt-big">
          {color.ko} {subject.ko}
        </div>
        <div className="prompt-sub">아래 색깔을 누르면 자동차 색이 바뀌어요</div>
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
              <PaintSubject
                kind={s.id}
                color={subject.id === s.id ? color.hex : KIND_NATURAL[s.id] || '#FFD400'}
                size={52}
              />
              <span>{s.ko}</span>
            </button>
          ))}
        </div>

        <div
          className="color-stage photo-stage paint-live"
          style={{
            background: `radial-gradient(circle at 50% 78%, #fff 0 24%, ${color.hex}33 25% 100%)`,
            boxShadow: `0 0 0 6px ${color.hex}`,
          }}
        >
          <div key={pop} className="paint-pop">
            <PaintSubject kind={subject.id} color={color.hex} size={230} className="stage-paint" />
          </div>
          <div className="color-ribbon" style={{ background: color.hex, color: color.id === 'yellow' ? '#1a1510' : '#fff' }}>
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
