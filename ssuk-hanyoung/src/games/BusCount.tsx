import { useEffect, useState } from 'react'
import { pick, shuffle } from '../data/colors'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { useRound } from './useRound'

export function BusCount() {
  const round = useRound('bus-count', 5)
  const [count, setCount] = useState(() => 2 + Math.floor(Math.random() * 5))
  const [choices, setChoices] = useState<number[]>([])

  useEffect(() => {
    const opts = shuffle([count, count + 1, Math.max(1, count - 1), count + 2]).slice(0, 3)
    setChoices(opts)
    speak(`버스에 친구 ${count}명이 탔어요. 몇 명일까요?`)
  }, [count, round.score])

  function answer(n: number) {
    if (round.done) return
    if (n === count) {
      speak('맞아요!')
      round.win('잘 세요!')
      setTimeout(() => setCount(2 + Math.floor(Math.random() * 5)), 600)
    } else {
      speak('다시 세어 보아요')
    }
  }

  return (
    <GameShell title="버스 승객 세기" subtitle="버스에 탄 친구를 세어 봐요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="play-area">
        <div style={{ textAlign: 'center', fontSize: '4rem' }}>🚌</div>
        <div className="parts" style={{ minHeight: '3.5rem' }}>
          {Array.from({ length: count }, (_, i) => (
            <span key={i} style={{ fontSize: '2rem' }}>
              {pick(['🧒', '👧', '👦', '🧑'])}
            </span>
          ))}
        </div>
        <div className="grid-3" style={{ marginTop: '0.9rem' }}>
          {choices.map((n) => (
            <button key={n} type="button" className="btn btn-sky btn-lg" onClick={() => answer(n)}>
              {n}
            </button>
          ))}
        </div>
        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
            또 세기!
          </button>
        )}
      </div>
    </GameShell>
  )
}
