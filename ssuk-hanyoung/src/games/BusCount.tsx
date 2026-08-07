import { useEffect, useState } from 'react'
import { shuffle } from '../data/colors'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { PaintSubject } from '../components/PaintSubject'
import { useRound } from './useRound'

const FRIEND_COLORS = ['#FF2D55', '#2F6BFF', '#FFD400', '#22C55E', '#FF7A00', '#8B5CF6']

export function BusCount() {
  const round = useRound('bus-count', 5)
  const [count, setCount] = useState(() => 2 + Math.floor(Math.random() * 4))
  const [choices, setChoices] = useState<number[]>([])

  useEffect(() => {
    const opts = shuffle([count, count + 1, Math.max(1, count - 1), count + 2]).slice(0, 3)
    setChoices(opts)
    speak(`버스에 친구 ${count}명. 몇 명일까요?`)
  }, [count, round.score])

  function answer(n: number) {
    if (round.done) return
    if (n === count) {
      sfx.win()
      speak('맞아요!')
      round.win('잘 세요!')
      setTimeout(() => setCount(2 + Math.floor(Math.random() * 4)), 600)
    } else {
      sfx.wrong()
      speak('다시 세어 보아요')
    }
  }

  return (
    <GameShell title="버스 세기" subtitle="친구를 세어 보아요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="play-area">
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <PaintSubject kind="bus" color="#FFD400" size={120} />
        </div>
        <div className="parts" style={{ minHeight: '4rem', justifyContent: 'center' }}>
          {Array.from({ length: count }, (_, i) => (
            <PaintSubject key={i} kind="star" color={FRIEND_COLORS[i % FRIEND_COLORS.length]!} size={44} />
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
