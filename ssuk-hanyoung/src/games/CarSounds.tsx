import { useEffect, useState } from 'react'
import { VEHICLES } from '../data/vehicles'
import { pick, shuffle } from '../data/colors'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { useRound } from './useRound'

const POOL = VEHICLES.filter((v) => ['police', 'fire', 'ambulance', 'bus', 'car', 'train', 'plane', 'truck'].includes(v.id))

export function CarSounds() {
  const round = useRound('car-sounds', 6)
  const [target, setTarget] = useState(() => pick(POOL))
  const [choices, setChoices] = useState(() => shuffle([target, ...shuffle(POOL.filter((v) => v.id !== target.id)).slice(0, 3)]))

  function nextQ() {
    const t = pick(POOL)
    setTarget(t)
    setChoices(shuffle([t, ...shuffle(POOL.filter((v) => v.id !== t.id)).slice(0, 3)]))
  }

  useEffect(() => {
    speak(`${target.sound} 어떤 탈것일까요?`)
  }, [target])

  function answer(id: string) {
    if (round.done) return
    if (id === target.id) {
      speak(`맞아요! ${target.ko}`)
      round.win('정답!')
      setTimeout(nextQ, 600)
    } else {
      speak('다시 들어 볼까요?')
    }
  }

  return (
    <GameShell title="자동차 소리" subtitle="소리를 듣고 탈것을 맞춰요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">{target.sound}</div>
        <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => speak(target.sound)}>
          소리 다시 듣기 🔊
        </button>
      </div>
      <div className="play-area">
        <div className="grid-2">
          {choices.map((v) => (
            <button key={v.id} type="button" className="card" onClick={() => answer(v.id)}>
              {v.img ? (
                <img src={v.img} alt="" width={72} height={72} style={{ margin: '0 auto', objectFit: 'contain' }} />
              ) : (
                <div className="card-emoji">{v.emoji}</div>
              )}
              <div className="card-title" style={{ textAlign: 'center' }}>
                {v.ko}
              </div>
            </button>
          ))}
        </div>
        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
            한 판 더!
          </button>
        )}
      </div>
    </GameShell>
  )
}
