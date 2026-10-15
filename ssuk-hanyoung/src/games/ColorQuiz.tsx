import { useEffect, useState } from 'react'
import { PLAY_COLORS, pick, shuffle } from '../data/colors'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { useRound } from './useRound'

export function ColorQuiz() {
  const round = useRound('color-quiz', 6)
  const [target, setTarget] = useState(() => pick(PLAY_COLORS))
  const [choices, setChoices] = useState(() => shuffle([target, ...shuffle(PLAY_COLORS.filter((c) => c.id !== target.id)).slice(0, 3)]))

  function next() {
    const t = pick(PLAY_COLORS)
    setTarget(t)
    setChoices(shuffle([t, ...shuffle(PLAY_COLORS.filter((c) => c.id !== t.id)).slice(0, 3)]))
  }

  useEffect(() => {
    speak(`${target.ko}을 찾아 보세요`)
  }, [target])

  function answer(id: string) {
    if (round.done) return
    if (id === target.id) {
      speak('정답!')
      round.win('멋져요!')
      setTimeout(next, 550)
    } else {
      speak('다른 색깔이에요')
    }
  }

  return (
    <GameShell title="색깔 퀴즈" subtitle="색깔 이름을 듣고 골라요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">{target.ko}</div>
        <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => speak(target.ko)}>
          다시 듣기 🔊
        </button>
      </div>
      <div className="play-area">
        <div className="grid-2">
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              className="swatch"
              style={{ background: c.hex, minHeight: '5.5rem' }}
              onClick={() => answer(c.id)}
              aria-label={c.ko}
            />
          ))}
        </div>
        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
            또 퀴즈!
          </button>
        )}
      </div>
    </GameShell>
  )
}
