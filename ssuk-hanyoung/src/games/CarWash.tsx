import { useState } from 'react'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { PaintSubject } from '../components/PaintSubject'
import { useRound } from './useRound'

const STEPS = [
  { id: 'water', label: '물', hint: '물을 뿌려요' },
  { id: 'soap', label: '비누', hint: '비누칠해요' },
  { id: 'scrub', label: '닦기', hint: '싹싹 닦아요' },
  { id: 'rinse', label: '헹구기', hint: '헹궈요' },
  { id: 'dry', label: '말리기', hint: '말려요' },
  { id: 'shine', label: '반짝', hint: '반짝!' },
]

export function CarWash() {
  const round = useRound('car-wash', 2)
  const [step, setStep] = useState(0)

  function doStep(i: number) {
    if (i !== step) {
      round.fail()
      speak('순서대로 해 보아요')
      return
    }
    sfx.tap()
    speak(STEPS[i]!.hint)
    const next = i + 1
    setStep(next)
    if (next >= STEPS.length) {
      sfx.win()
      round.win('반짝반짝!')
      setTimeout(() => setStep(0), 800)
    }
  }

  const dirt = Math.max(0, 1 - step / STEPS.length)

  return (
    <GameShell title="세차 놀이" subtitle="순서대로 닦아요" progress={step / STEPS.length}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="play-area">
        <div className="wash-stage" aria-hidden>
          <div className="wash-car" style={{ filter: `grayscale(${dirt * 0.7}) brightness(${0.75 + (1 - dirt) * 0.35})` }}>
            <PaintSubject kind="car" color="#2F6BFF" size={150} />
          </div>
          {step > 0 && step < STEPS.length && <div className="wash-bubbles">방울방울</div>}
        </div>
        <div className="grid-3" style={{ marginTop: '0.8rem' }}>
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="card"
              style={{ opacity: i < step ? 0.4 : 1, outline: i === step ? '3px solid var(--sunny)' : undefined }}
              onClick={() => doStep(i)}
            >
              <div className="card-title" style={{ fontSize: '1.05rem', textAlign: 'center' }}>
                {i + 1}. {s.label}
              </div>
            </button>
          ))}
        </div>
        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
            또 세차!
          </button>
        )}
      </div>
    </GameShell>
  )
}
