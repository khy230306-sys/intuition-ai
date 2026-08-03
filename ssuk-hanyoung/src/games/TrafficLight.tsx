import { useEffect, useState } from 'react'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
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
        if (next === 'green') speak('초록불! 부릉부릉!')
        if (next === 'red') speak('빨간불! 멈춰요!')
        if (next === 'yellow') speak('노란불! 조심해요!')
        return next
      })
    }, 2600)
    return () => clearInterval(id)
  }, [])

  function drive() {
    if (round.done) return
    if (light === 'green') {
      setPos((p) => Math.min(78, p + 14))
      speak('부릉부릉!')
      round.win('잘 달렸어요!')
    } else if (light === 'yellow') {
      speak('조금 더 기다려요')
    } else {
      speak('빨간불이에요! 멈춰요!')
    }
  }

  return (
    <GameShell title="신호등 놀이" subtitle="초록불에만 출발해요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="play-area">
        <div className="traffic" aria-label={`신호등 ${light}`}>
          <div className={`light red${light === 'red' ? ' on' : ''}`} />
          <div className={`light yellow${light === 'yellow' ? ' on' : ''}`} />
          <div className={`light green${light === 'green' ? ' on' : ''}`} />
        </div>
        <div className="road">
          <span className="racer" style={{ left: `${pos}%` }}>
            🚗
          </span>
        </div>
        <button type="button" className="btn btn-leaf btn-lg btn-block" style={{ marginTop: '0.9rem' }} onClick={drive}>
          부릉부릉 출발! 🚗
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
