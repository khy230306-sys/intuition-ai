import { useEffect, useRef, useState } from 'react'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { PaintSubject } from '../components/PaintSubject'
import { useRound } from './useRound'

type Phase = 'wait' | 'go' | 'too-soon'

export function WaitGo() {
  const round = useRound('wait-go', 6)
  const [phase, setPhase] = useState<Phase>('wait')
  const [light, setLight] = useState<'red' | 'yellow' | 'green'>('red')
  const [pos, setPos] = useState(8)
  const [roundKey, setRoundKey] = useState(0)
  const timers = useRef<number[]>([])

  function clearTimers() {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }

  function startSequence() {
    clearTimers()
    setPhase('wait')
    setLight('red')
    sfx.wait()
    speak('빨간불! 기다려요')
    timers.current.push(
      window.setTimeout(() => {
        setLight('yellow')
        speak('노란불')
      }, 1600),
    )
    timers.current.push(
      window.setTimeout(
        () => {
          setLight('green')
          setPhase('go')
          sfx.go()
          speak('초록불! 지금!')
        },
        2600 + Math.random() * 1400,
      ),
    )
  }

  useEffect(() => {
    if (round.done) return
    startSequence()
    return clearTimers
  }, [round.score, round.done, roundKey])

  function tap() {
    if (round.done) return
    if (phase === 'wait' || phase === 'too-soon') {
      clearTimers()
      setPhase('too-soon')
      sfx.wrong()
      speak('아직이에요! 기다려요')
      window.setTimeout(() => {
        setRoundKey((k) => k + 1)
      }, 900)
      return
    }
    if (phase === 'go') {
      setPos((p) => Math.min(78, p + 14))
      sfx.vroom()
      speak('부릉!')
      round.win('참았다가 출발!')
    }
  }

  return (
    <GameShell title="참았다가 출발" subtitle="초록불에만 눌러요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">
          {phase === 'go' ? '지금 출발!' : phase === 'too-soon' ? '아직이에요' : '기다려요…'}
        </div>
      </div>
      <div className="play-area">
        <div className="traffic" aria-label={`신호등 ${light}`}>
          <div className={`light red${light === 'red' ? ' on' : ''}`} />
          <div className={`light yellow${light === 'yellow' ? ' on' : ''}`} />
          <div className={`light green${light === 'green' ? ' on' : ''}`} />
        </div>
        <div className="road">
          <span className="racer photo" style={{ left: `${pos}%` }}>
            <PaintSubject kind="car" color={phase === 'go' ? '#22C55E' : '#FF2D55'} size={52} />
          </span>
        </div>
        <button
          type="button"
          className={`btn btn-lg btn-block${phase === 'go' ? ' btn-leaf' : ' btn-ghost'}`}
          style={{ marginTop: '0.9rem' }}
          onClick={tap}
        >
          {phase === 'go' ? '출발!' : '아직 안 돼요'}
        </button>
        {round.done && (
          <button
            type="button"
            className="btn btn-sunny btn-block"
            style={{ marginTop: '0.6rem' }}
            onClick={() => {
              round.reset()
              setPos(8)
              setRoundKey((k) => k + 1)
            }}
          >
            다시!
          </button>
        )}
      </div>
    </GameShell>
  )
}
