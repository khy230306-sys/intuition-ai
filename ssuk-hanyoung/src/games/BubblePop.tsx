import { useEffect, useState } from 'react'
import { PLAY_COLORS, pick } from '../data/colors'
import { speak } from '../lib/speech'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'

type Bubble = {
  id: number
  x: number
  y: number
  size: number
  hex: string
  emoji: string
}

const EMOJIS = ['🫧', '🚗', '⭐', '🎈', '🚌', '💛', '🔵']

function makeBubble(id: number): Bubble {
  const c = pick(PLAY_COLORS)
  return {
    id,
    x: 8 + Math.random() * 74,
    y: 10 + Math.random() * 60,
    size: 56 + Math.random() * 42,
    hex: c.hex,
    emoji: pick(EMOJIS),
  }
}

export function BubblePop() {
  const [bubbles, setBubbles] = useState(() => Array.from({ length: 8 }, (_, i) => makeBubble(i)))
  const [score, setScore] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setInterval(() => {
      setBubbles((list) => {
        if (list.length >= 10) return list
        return [...list, makeBubble(Date.now())]
      })
    }, 1200)
    return () => clearInterval(t)
  }, [])

  function pop(id: number) {
    setBubbles((list) => list.filter((b) => b.id !== id).concat(makeBubble(Date.now() + 1)))
    const next = score + 1
    setScore(next)
    speak('팡!')
    if (next % 5 === 0) {
      addStars(1, 'bubble-pop')
      setToast('잘해요!')
      setTimeout(() => setToast(null), 800)
    }
  }

  return (
    <GameShell title="방울 팡팡" subtitle="나타나는 방울을 터치해요">
      {toast && <div className="toast">{toast}</div>}
      <div className="prompt">
        <div className="prompt-big">팡! {score}개</div>
        <div className="prompt-sub">크게 터치해도 괜찮아요</div>
      </div>
      <div className="play-area bubble-stage">
        {bubbles.map((b) => (
          <button
            key={b.id}
            type="button"
            className="bubble-ball"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: b.size,
              height: b.size,
              background: `${b.hex}cc`,
            }}
            onClick={() => pop(b.id)}
            aria-label="방울 터뜨리기"
          >
            {b.emoji}
          </button>
        ))}
      </div>
    </GameShell>
  )
}
