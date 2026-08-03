import { useMemo } from 'react'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { useRound } from './useRound'
import { shuffle } from '../data/colors'

const SHAPES = [
  { id: 'circle', ko: '동그라미', emoji: '🔵' },
  { id: 'square', ko: '네모', emoji: '🟦' },
  { id: 'triangle', ko: '세모', emoji: '🔺' },
  { id: 'star', ko: '별', emoji: '⭐' },
  { id: 'heart', ko: '하트', emoji: '❤️' },
]

export function ShapeTouch() {
  const round = useRound('shape-touch', 6)
  const target = useMemo(() => {
    void round.score
    return shuffle(SHAPES)[0]!
  }, [round.score])
  const choices = useMemo(() => shuffle(SHAPES), [target])

  function pick(id: string) {
    if (round.done) return
    if (id === target.id) {
      speak(`맞아요! ${target.ko}`)
      round.win('잘했어요!')
    } else {
      speak('다시 찾아 보아요')
    }
  }

  return (
    <GameShell title="모양 만지기" subtitle="말한 모양을 터치해요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">
          {target.emoji} {target.ko}
        </div>
        <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => speak(`${target.ko}를 찾아요`)}>
          다시 듣기 🔊
        </button>
      </div>
      <div className="play-area">
        <div className="grid-2">
          {choices.map((s) => (
            <button key={s.id} type="button" className="card big-touch" onClick={() => pick(s.id)}>
              <div className="card-emoji" style={{ fontSize: '3rem' }}>
                {s.emoji}
              </div>
              <div className="card-title" style={{ textAlign: 'center' }}>
                {s.ko}
              </div>
            </button>
          ))}
        </div>
        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
            또 해요!
          </button>
        )}
      </div>
    </GameShell>
  )
}
