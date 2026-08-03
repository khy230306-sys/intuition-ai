import { useEffect, useState } from 'react'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { useRound } from './useRound'

/** Simple 3-beat patterns kids can copy */
const PATTERNS = [
  [1, 1, 1],
  [1, 0, 1],
  [1, 1, 0, 1],
  [1, 0, 1, 0, 1],
]

export function RhythmTap() {
  const round = useRound('rhythm-tap', 5)
  const [pattern, setPattern] = useState(PATTERNS[0]!)
  const [phase, setPhase] = useState<'listen' | 'play'>('listen')
  const [lit, setLit] = useState(false)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (phase !== 'listen' || round.done) return
    let i = 0
    speak('박자를 들어요')
    const timer = window.setInterval(() => {
      if (i >= pattern.length) {
        clearInterval(timer)
        setLit(false)
        setPhase('play')
        setIdx(0)
        speak('똑같이 눌러요')
        return
      }
      if (pattern[i]) {
        setLit(true)
        speak('톡')
        setTimeout(() => setLit(false), 280)
      }
      i += 1
    }, 650)
    return () => clearInterval(timer)
  }, [pattern, phase, round.done])

  function tap() {
    if (phase !== 'play' || round.done) return
    // skip rests: advance until next beat or end
    let expect = idx
    while (expect < pattern.length && !pattern[expect]) expect += 1
    if (expect >= pattern.length) return
    setLit(true)
    setTimeout(() => setLit(false), 200)
    const next = expect + 1
    // check if remaining are all rests / done
    let done = next >= pattern.length
    if (!done) {
      let j = next
      while (j < pattern.length && !pattern[j]) j += 1
      done = j >= pattern.length
    }
    if (done) {
      speak('멋져요!')
      round.win('박자 성공!')
      setTimeout(() => {
        setPattern(PATTERNS[(round.score + 1) % PATTERNS.length]!)
        setPhase('listen')
        setIdx(0)
      }, 600)
    } else {
      setIdx(next)
    }
  }

  return (
    <GameShell title="톡톡 리듬" subtitle="박자를 듣고 똑같이 눌러요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">{phase === 'listen' ? '👂 들어요' : '👆 따라 쳐요'}</div>
      </div>
      <div className="play-area" style={{ display: 'grid', placeItems: 'center', minHeight: '16rem' }}>
        <button
          type="button"
          className={`rhythm-drum${lit ? ' lit' : ''}`}
          onClick={tap}
          disabled={phase !== 'play'}
        >
          🥁
        </button>
        {round.done && (
          <button
            type="button"
            className="btn btn-sunny"
            style={{ marginTop: '1rem' }}
            onClick={() => {
              round.reset()
              setPattern(PATTERNS[0]!)
              setPhase('listen')
            }}
          >
            또 해요!
          </button>
        )}
      </div>
    </GameShell>
  )
}
