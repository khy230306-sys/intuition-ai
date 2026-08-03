import { useState } from 'react'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { useRound } from './useRound'

const STEPS = [
  { id: 'water', label: '물 뿌리기', emoji: '💦' },
  { id: 'soap', label: '비누칠', emoji: '🧼' },
  { id: 'scrub', label: '닦기', emoji: '🧽' },
  { id: 'rinse', label: '헹구기', emoji: '🚿' },
  { id: 'dry', label: '말리기', emoji: '🌬️' },
  { id: 'shine', label: '반짝!', emoji: '✨' },
]

export function CarWash() {
  const round = useRound('car-wash', 2)
  const [step, setStep] = useState(0)

  function doStep(i: number) {
    if (i !== step) {
      speak('순서대로 해 보아요')
      return
    }
    speak(STEPS[i]!.label)
    const next = i + 1
    setStep(next)
    if (next >= STEPS.length) {
      round.win('반짝반짝 깨끗해요!')
      setTimeout(() => setStep(0), 800)
    }
  }

  const clean = step >= STEPS.length - 1

  return (
    <GameShell title="자동차 세차" subtitle="순서대로 세차해요" progress={step / STEPS.length}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="play-area">
        <div className={`dirty-car${clean ? ' clean' : ''}`} aria-hidden>
          🚙
        </div>
        <div className="grid-3" style={{ marginTop: '0.8rem' }}>
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="card"
              style={{ opacity: i < step ? 0.45 : 1, outline: i === step ? '3px solid var(--sunny)' : undefined }}
              onClick={() => doStep(i)}
            >
              <div className="card-emoji">{s.emoji}</div>
              <div className="card-title" style={{ fontSize: '0.95rem' }}>
                {s.label}
              </div>
            </button>
          ))}
        </div>
        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
            다른 차 세차!
          </button>
        )}
      </div>
    </GameShell>
  )
}
