import { useState, type PointerEvent } from 'react'
import { PLAY_COLORS } from '../data/colors'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'
import { PaintSubject } from '../components/PaintSubject'

const STAMPS = [
  { id: 'car', kind: 'car', ko: '자동차' },
  { id: 'bus', kind: 'bus', ko: '버스' },
  { id: 'police', kind: 'police', ko: '경찰차' },
  { id: 'fire', kind: 'fire', ko: '소방차' },
  { id: 'star', kind: 'star', ko: '별' },
  { id: 'truck', kind: 'truck', ko: '트럭' },
]

type Mark = { id: number; x: number; y: number; kind: string; hex: string }

export function StampPad() {
  const [stamp, setStamp] = useState(STAMPS[0]!)
  const [color, setColor] = useState(PLAY_COLORS[0]!)
  const [marks, setMarks] = useState<Mark[]>([])

  function place(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMarks((m) => [...m.slice(-40), { id: Date.now(), x, y, kind: stamp.kind, hex: color.hex }])
    sfx.tap()
    speak(stamp.ko)
    if ((marks.length + 1) % 6 === 0) {
      addStars(1, 'stamp-pad')
      sfx.cheer()
    }
  }

  return (
    <GameShell title="스탬프" subtitle="골라서 콕콕 찍어요">
      <div className="subject-row">
        {STAMPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`subject-chip photo${stamp.id === s.id ? ' on' : ''}`}
            onClick={() => {
              setStamp(s)
              speak(s.ko)
            }}
          >
            <PaintSubject kind={s.kind} color={color.hex} size={40} />
            <span>{s.ko}</span>
          </button>
        ))}
      </div>
      <div className="grid-3" style={{ margin: '0.6rem 0' }}>
        {PLAY_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            className="swatch"
            style={{
              background: c.hex,
              outline: color.id === c.id ? '4px solid #1a1510' : undefined,
              minHeight: '3.2rem',
            }}
            onClick={() => {
              setColor(c)
              speak(c.ko)
            }}
          />
        ))}
      </div>
      <div className="play-area stamp-canvas" onPointerDown={place}>
        {marks.map((m) => (
          <span key={m.id} className="stamp-mark photo" style={{ left: `${m.x}%`, top: `${m.y}%` }}>
            <PaintSubject kind={m.kind} color={m.hex} size={48} />
          </span>
        ))}
        {marks.length === 0 && <p className="prompt-sub">여기를 눌러 찍어요!</p>}
      </div>
      <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: '0.7rem' }} onClick={() => setMarks([])}>
        지우기
      </button>
    </GameShell>
  )
}
