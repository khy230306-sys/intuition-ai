import { useState, type PointerEvent } from 'react'
import { PLAY_COLORS } from '../data/colors'
import { speak } from '../lib/speech'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'

const STAMPS = ['🚗', '🚌', '🚓', '🚒', '⭐', '❤️', '🌸', '🐶', '🐱', '🏠', '🚀', '🐟']

type Mark = { id: number; x: number; y: number; stamp: string; hex: string }

export function StampPad() {
  const [stamp, setStamp] = useState(STAMPS[0]!)
  const [color, setColor] = useState(PLAY_COLORS[0]!)
  const [marks, setMarks] = useState<Mark[]>([])

  function place(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMarks((m) => [...m.slice(-40), { id: Date.now(), x, y, stamp, hex: color.hex }])
    speak(stamp)
    if ((marks.length + 1) % 6 === 0) addStars(1, 'stamp-pad')
  }

  return (
    <GameShell title="스탬프 놀이" subtitle="도장을 골라 화면을 콕콕 찍어요">
      <div className="subject-row">
        {STAMPS.map((s) => (
          <button
            key={s}
            type="button"
            className={`subject-chip${stamp === s ? ' on' : ''}`}
            onClick={() => {
              setStamp(s)
              speak('이 도장으로 찍어요')
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="grid-3" style={{ margin: '0.6rem 0' }}>
        {PLAY_COLORS.slice(0, 6).map((c) => (
          <button
            key={c.id}
            type="button"
            className="swatch"
            style={{
              background: c.hex,
              outline: color.id === c.id ? '4px solid #1a1510' : undefined,
              minHeight: '3.2rem',
            }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      <div className="play-area stamp-canvas" onPointerDown={place}>
        {marks.map((m) => (
          <span
            key={m.id}
            className="stamp-mark"
            style={{ left: `${m.x}%`, top: `${m.y}%`, background: `${m.hex}66` }}
          >
            {m.stamp}
          </span>
        ))}
        {marks.length === 0 && <p className="prompt-sub">여기를 터치해서 찍어요!</p>}
      </div>
      <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: '0.7rem' }} onClick={() => setMarks([])}>
        지우기
      </button>
    </GameShell>
  )
}
