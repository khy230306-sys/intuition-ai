import { useEffect, useState } from 'react'
import { PLAY_COLORS, pick, shuffle } from '../data/colors'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { useRound } from './useRound'

type Balloon = { id: string; colorId: string; hex: string; ko: string; popped?: boolean }

function makeBalloons(targetId: string): Balloon[] {
  const target = PLAY_COLORS.find((c) => c.id === targetId)!
  const others = shuffle(PLAY_COLORS.filter((c) => c.id !== targetId)).slice(0, 5)
  return shuffle(
    [target, target, ...others].map((c, i) => ({
      id: `${c.id}-${i}`,
      colorId: c.id,
      hex: c.hex,
      ko: c.ko,
    })),
  )
}

export function Balloons() {
  const round = useRound('balloons', 5)
  const [target, setTarget] = useState(() => pick(PLAY_COLORS))
  const [balloons, setBalloons] = useState(() => makeBalloons(target.id))

  useEffect(() => {
    speak(`${target.ko} 풍선을 터뜨려요`)
  }, [target])

  function pop(b: Balloon) {
    if (b.popped || round.done) return
    if (b.colorId !== target.id) {
      speak('다른 색깔이에요')
      round.fail()
      return
    }
    const next = balloons.map((x) => (x.id === b.id ? { ...x, popped: true } : x))
    setBalloons(next)
    speak('팡!')
    const left = next.filter((x) => x.colorId === target.id && !x.popped)
    if (left.length === 0) {
      round.win('다 터뜨렸어요!')
      setTimeout(() => {
        const t = pick(PLAY_COLORS)
        setTarget(t)
        setBalloons(makeBalloons(t.id))
      }, 600)
    }
  }

  return (
    <GameShell title="색깔 풍선 팡!" subtitle="말한 색깔 풍선을 터뜨려요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big" style={{ color: target.hex }}>
          {target.ko} 풍선!
        </div>
      </div>
      <div className="play-area">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
          {balloons.map((b, i) => (
            <button
              key={b.id}
              type="button"
              className={`balloon${b.popped ? ' pop' : ''}`}
              style={{ background: b.hex, animationDelay: `${(i % 5) * 0.12}s`, visibility: b.popped ? 'hidden' : 'visible' }}
              onClick={() => pop(b)}
              aria-label={b.ko}
            />
          ))}
        </div>
        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
            또 팡팡!
          </button>
        )}
      </div>
    </GameShell>
  )
}
