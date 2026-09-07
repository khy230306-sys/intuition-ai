import { useEffect, useState } from 'react'
import { PLAY_COLORS, pick } from '../data/colors'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'

type Bubble = { id: number; x: number; y: number; size: number; hex: string; ko: string }

function makeBubble(id: number): Bubble {
  const c = pick(PLAY_COLORS)
  return {
    id,
    x: 8 + Math.random() * 74,
    y: 10 + Math.random() * 60,
    size: 58 + Math.random() * 40,
    hex: c.hex,
    ko: c.ko,
  }
}

export function BubblePop() {
  const [bubbles, setBubbles] = useState(() => Array.from({ length: 8 }, (_, i) => makeBubble(i)))
  const [score, setScore] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [confetti, setConfetti] = useState(false)

  useEffect(() => {
    const t = window.setInterval(() => {
      setBubbles((list) => {
        if (list.length >= 10) return list
        return [...list, makeBubble(Date.now())]
      })
    }, 1200)
    return () => clearInterval(t)
  }, [])

  function pop(id: number, ko: string) {
    setBubbles((list) => list.filter((b) => b.id !== id).concat(makeBubble(Date.now() + 1)))
    const next = score + 1
    setScore(next)
    sfx.pop()
    if (next % 5 === 0) {
      addStars(1, 'bubble-pop')
      sfx.cheer()
      speak('잘해요!')
      setToast('잘해요!')
      setConfetti(true)
      setTimeout(() => {
        setToast(null)
        setConfetti(false)
      }, 900)
    } else {
      speak(ko)
    }
  }

  return (
    <GameShell title="방울 팡팡" subtitle="방울을 터치해요">
      <Confetti show={confetti} />
      {toast && <div className="toast">{toast}</div>}
      <div className="prompt">
        <div className="prompt-big">팡! {score}개</div>
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
            onClick={() => pop(b.id, b.ko)}
            aria-label={`${b.ko} 방울`}
          />
        ))}
      </div>
    </GameShell>
  )
}
