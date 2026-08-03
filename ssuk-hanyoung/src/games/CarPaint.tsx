import { useState } from 'react'
import { PLAY_COLORS } from '../data/colors'
import { speak } from '../lib/speech'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'

export function CarPaint() {
  const [color, setColor] = useState(PLAY_COLORS[0]!)
  const [painted, setPainted] = useState(0)
  const [confetti, setConfetti] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function paint(c: (typeof PLAY_COLORS)[number]) {
    setColor(c)
    speak(`${c.ko}으로 칠했어요!`)
    const next = painted + 1
    setPainted(next)
    if (next % 3 === 0) {
      addStars(1, 'car-paint')
      setToast('멋진 자동차예요!')
      setConfetti(true)
      setTimeout(() => {
        setToast(null)
        setConfetti(false)
      }, 1200)
    }
  }

  return (
    <GameShell title="자동차 색칠공장" subtitle="원하는 색을 골라 칠해 보아요">
      <Confetti show={confetti} />
      {toast && <div className="toast">{toast}</div>}
      <div className="prompt">
        <div className="prompt-big">{color.ko} 자동차</div>
        <div className="prompt-sub">아래 색깔을 누르면 차체가 바뀌어요</div>
      </div>
      <div className="play-area">
        <div className="paint-car" aria-label={`${color.ko} 자동차`}>
          <div className="cabin" />
          <div className="body" style={{ background: color.hex }} />
          <div className="wheel l" />
          <div className="wheel r" />
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
          onClick={() => speak(`이 자동차는 ${color.ko}이에요. ${color.en}`)}
        >
          색깔 말하기 🔊
        </button>
      </div>
    </GameShell>
  )
}
