import { useState } from 'react'
import { PLAY_COLORS } from '../data/colors'
import { speak } from '../lib/speech'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'

const SIZE = 16

export function PopIt() {
  const [pops, setPops] = useState(() => Array.from({ length: SIZE }, () => false))
  const [confetti, setConfetti] = useState(false)

  function toggle(i: number) {
    if (pops[i]) return
    const next = pops.map((v, idx) => (idx === i ? true : v))
    setPops(next)
    speak('톡!')
    const count = next.filter(Boolean).length
    if (count % 4 === 0) addStars(1, 'pop-it')
    if (count === SIZE) {
      setConfetti(true)
      speak('전부 톡톡!')
      setTimeout(() => {
        setConfetti(false)
        setPops(Array.from({ length: SIZE }, () => false))
      }, 1200)
    }
  }

  return (
    <GameShell title="톡톡 팝잇" subtitle="동그라미를 하나씩 눌러요">
      <Confetti show={confetti} />
      <div className="prompt">
        <div className="prompt-big">톡! {pops.filter(Boolean).length}/{SIZE}</div>
      </div>
      <div className="play-area">
        <div className="popit-grid">
          {pops.map((on, i) => (
            <button
              key={i}
              type="button"
              className={`popit-dot${on ? ' on' : ''}`}
              style={{ background: on ? '#ddd' : PLAY_COLORS[i % PLAY_COLORS.length]!.hex }}
              onClick={() => toggle(i)}
              aria-label={on ? '눌림' : '누르기'}
            />
          ))}
        </div>
      </div>
    </GameShell>
  )
}
