import { useEffect, useState } from 'react'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { useRound } from './useRound'

type Phase = 'wait' | 'go' | 'too-soon'

export function WaitGo() {
  const round = useRound('wait-go', 6)
  const [phase, setPhase] = useState<Phase>('wait')
  const [light, setLight] = useState<'red' | 'yellow' | 'green'>('red')
  const [pos, setPos] = useState(10)

  useEffect(() => {
    if (round.done) return
    setPhase('wait')
    setLight('red')
    speak('빨간불! 기다려요')
    const t1 = window.setTimeout(() => {
      setLight('yellow')
      speak('노란불…')
    }, 1800)
    const t2 = window.setTimeout(() => {
      setLight('green')
      setPhase('go')
      speak('초록불! 지금!')
    }, 2800 + Math.random() * 1200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [round.score, round.done])

  function tap() {
    if (round.done) return
    if (phase === 'wait') {
      setPhase('too-soon')
      speak('아직이에요! 기다려요')
      return
    }
    if (phase === 'go') {
      setPos((p) => Math.min(82, p + 12))
      speak('부릉!')
      round.win('참았다가 출발!')
    }
  }

  return (
    <GameShell title="참았다가 출발" subtitle="초록불이 될 때까지 기다려요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">
          {phase === 'go' ? '지금 출발!' : phase === 'too-soon' ? '아직이에요' : '기다리는 중…'}
        </div>
        <div className="prompt-sub">참을수록 잘해요 · 집중 놀이</div>
      </div>
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
        <button type="button" className="btn btn-leaf btn-lg btn-block" style={{ marginTop: '0.9rem' }} onClick={tap}>
          {phase === 'go' ? '출발! 🚗' : '아직 누르면 안 돼요'}
        </button>
        {round.done && (
          <button
            type="button"
            className="btn btn-sunny btn-block"
            style={{ marginTop: '0.6rem' }}
            onClick={() => {
              round.reset()
              setPos(10)
            }}
          >
            다시!
          </button>
        )}
      </div>
    </GameShell>
  )
}
