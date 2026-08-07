import { useEffect, useState } from 'react'
import { PLAY_COLORS, pick } from '../data/colors'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { PaintSubject } from '../components/PaintSubject'
import { useRound } from './useRound'

const COLORS = PLAY_COLORS.slice(0, 4)
const KINDS = ['car', 'bus', 'fire', 'police'] as const

export function ColorFollow() {
  const round = useRound('color-follow', 5)
  const [seq, setSeq] = useState<string[]>(() => [pick(COLORS).id])
  const [phase, setPhase] = useState<'watch' | 'play'>('watch')
  const [flash, setFlash] = useState<string | null>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (phase !== 'watch' || round.done) return
    let i = 0
    speak('잘 보고 따라 해요')
    const timer = window.setInterval(() => {
      if (i >= seq.length) {
        clearInterval(timer)
        setFlash(null)
        setPhase('play')
        setStep(0)
        speak('이제 같은 순서로 눌러요')
        return
      }
      const id = seq[i]!
      setFlash(id)
      speak(COLORS.find((c) => c.id === id)!.ko)
      i += 1
      setTimeout(() => setFlash(null), 450)
    }, 900)
    return () => clearInterval(timer)
  }, [seq, phase, round.done])

  function tap(id: string) {
    if (phase !== 'play' || round.done) return
    if (id !== seq[step]) {
      round.fail()
      speak('다시 보아요')
      setPhase('watch')
      setStep(0)
      return
    }
    const next = step + 1
    setFlash(id)
    sfx.tap()
    setTimeout(() => setFlash(null), 250)
    if (next >= seq.length) {
      speak('잘했어요!')
      round.win('순서를 기억했어요!')
      setTimeout(() => {
        setSeq((s) => [...s, pick(COLORS).id].slice(-5))
        setPhase('watch')
        setStep(0)
      }, 700)
    } else {
      setStep(next)
    }
  }

  return (
    <GameShell title="부릉 따라하기" subtitle="색깔 순서를 보고 똑같이 눌러요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">{phase === 'watch' ? '잘 보세요' : '따라 눌러요'}</div>
      </div>
      <div className="play-area">
        <div className="grid-2">
          {COLORS.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className={`follow-pad photo${flash === c.id ? ' lit' : ''}`}
              style={{
                background: `${c.hex}44`,
                boxShadow: flash === c.id ? `0 0 0 6px ${c.hex}` : `0 0 0 4px ${c.hex}`,
              }}
              onClick={() => tap(c.id)}
              disabled={phase !== 'play'}
            >
              <PaintSubject kind={KINDS[i]!} color={c.hex} size={96} />
              <span className="toy-label">{c.ko.replace('색', '')}</span>
            </button>
          ))}
        </div>
        {round.done && (
          <button
            type="button"
            className="btn btn-sunny btn-block"
            style={{ marginTop: '0.8rem' }}
            onClick={() => {
              round.reset()
              setSeq([pick(COLORS).id])
              setPhase('watch')
            }}
          >
            한 판 더!
          </button>
        )}
      </div>
    </GameShell>
  )
}
