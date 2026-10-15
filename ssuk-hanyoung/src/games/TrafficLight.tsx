import { useEffect, useState } from 'react'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { PaintSubject } from '../components/PaintSubject'
import { useRound } from './useRound'

type Light = 'red' | 'yellow' | 'green'

export function TrafficLight() {
  const round = useRound('traffic-light', 8)
  const [light, setLight] = useState<Light>('red')
  const [pos, setPos] = useState(8)

  useEffect(() => {
    const id = window.setInterval(() => {
      setLight((cur) => {
        const next = cur === 'red' ? 'green' : cur === 'green' ? 'yellow' : 'red'
        if (next === 'green') {
          sfx.go()
          speak('초록불!')
        }
        if (next === 'red') {
          sfx.wait()
          speak('빨간불!')
        }
        if (next === 'yellow') speak('노란불!')
        return next
      })
    }, 2600)
    return () => clearInterval(id)
  }, [])

  function drive() {
    if (round.done) return
    if (light === 'green') {
      setPos((p) => Math.min(78, p + 14))
      sfx.vroom()
      speak('부릉!')
      round.win('잘 달렸어요!')
    } else if (light === 'yellow') {
      sfx.wait()
      speak('조금 더 기다려요')
    } else {
      sfx.wrong()
      speak('빨간불! 멈춰요!')
    }
  }

  return (
    <GameShell title="신호등" subtitle="초록불에만 출발!" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="play-area">
        <div className="traffic" aria-label={`신호등 ${light}`}>
          <div className={`light red${light === 'red' ? ' on' : ''}`} />
          <div className={`light yellow${light === 'yellow' ? ' on' : ''}`} />
          <div className={`light green${light === 'green' ? ' on' : ''}`} />
        </div>
        <div className="road">
          <span className="racer photo" style={{ left: `${pos}%` }}>
            <PaintSubject kind="car" color={light === 'green' ? '#22C55E' : '#FF2D55'} size={52} />
          </span>
        </div>
        <button
          type="button"
          className={`btn btn-lg btn-block${light === 'green' ? ' btn-leaf' : ' btn-ghost'}`}
          style={{ marginTop: '0.9rem' }}
          onClick={drive}
        >
          {light === 'green' ? '출발!' : '기다려요'}
        </button>
        {round.done && (
          <button
            type="button"
            className="btn btn-sunny btn-block"
            style={{ marginTop: '0.6rem' }}
            onClick={() => {
              round.reset()
              setPos(8)
            }}
          >
            다시!
          </button>
        )}
      </div>
    </GameShell>
  )
}
