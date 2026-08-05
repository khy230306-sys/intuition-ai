import { useEffect, useState } from 'react'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { PaintSubject } from '../components/PaintSubject'
import { useRound } from './useRound'

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
  const [flashI, setFlashI] = useState<number | null>(null)

  const beatsNeeded = pattern.filter(Boolean).length

  useEffect(() => {
    if (phase !== 'listen' || round.done) return
    let i = 0
    speak('박자를 들어요')
    const timer = window.setInterval(() => {
      if (i >= pattern.length) {
        clearInterval(timer)
        setLit(false)
        setFlashI(null)
        setPhase('play')
        setIdx(0)
        speak('똑같이 눌러요')
        return
      }
      setFlashI(i)
      if (pattern[i]) {
        setLit(true)
        sfx.drum()
        setTimeout(() => setLit(false), 280)
      }
      i += 1
    }, 650)
    return () => clearInterval(timer)
  }, [pattern, phase, round.done])

  function tap() {
    if (phase !== 'play' || round.done) return
    let expect = idx
    while (expect < pattern.length && !pattern[expect]) expect += 1
    if (expect >= pattern.length) return

    // Player should only tap on beat slots — rests are auto-skipped after a tap
    setLit(true)
    sfx.drum()
    setTimeout(() => setLit(false), 200)
    setFlashI(expect)

    const beatsDone = pattern.slice(0, expect + 1).filter(Boolean).length
    const next = expect + 1

    if (beatsDone >= beatsNeeded) {
      sfx.win()
      speak('멋져요!')
      round.win('박자 성공!')
      setTimeout(() => {
        setPattern(PATTERNS[(round.score + 1) % PATTERNS.length]!)
        setPhase('listen')
        setIdx(0)
        setFlashI(null)
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
        <div className="prompt-big">{phase === 'listen' ? '잘 들어요' : '따라 쳐요'}</div>
      </div>
      <div className="beat-strip" aria-hidden>
        {pattern.map((b, i) => (
          <span key={i} className={`beat-dot${b ? ' hit' : ' rest'}${flashI === i ? ' on' : ''}`} />
        ))}
      </div>
      <div className="play-area" style={{ display: 'grid', placeItems: 'center', minHeight: '14rem' }}>
        <button type="button" className={`rhythm-drum photo${lit ? ' lit' : ''}`} onClick={tap} disabled={phase !== 'play'}>
          <PaintSubject kind="drum" color="#FF2D55" size={120} />
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
