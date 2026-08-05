import { useMemo, useState } from 'react'
import { PLAY_COLORS, pick } from '../data/colors'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { PaintSubject } from '../components/PaintSubject'
import { useRound } from './useRound'

const BODIES = [
  { id: 'sedan', label: '승용차', kind: 'car' },
  { id: 'bus', label: '버스', kind: 'bus' },
  { id: 'truck', label: '트럭', kind: 'truck' },
  { id: 'police', label: '경찰차', kind: 'police' },
]

export function CarBuilder() {
  const round = useRound('car-builder', 4)
  const target = useMemo(() => {
    void round.score
    return {
      body: pick(BODIES),
      color: pick(PLAY_COLORS),
    }
  }, [round.score])
  const [body, setBody] = useState<(typeof BODIES)[number] | null>(null)
  const [color, setColor] = useState<(typeof PLAY_COLORS)[number] | null>(null)

  function check(nextBody = body, nextColor = color) {
    if (!nextBody || !nextColor) return
    if (nextBody.id === target.body.id && nextColor.id === target.color.id) {
      speak('완성! 멋진 자동차예요!')
      round.win('조립 성공!')
      setBody(null)
      setColor(null)
    } else if (nextBody.id === target.body.id || nextColor.id === target.color.id) {
      speak('거의 다 왔어요!')
    } else {
      speak('다시 골라 볼까요?')
    }
  }

  const previewColor = color?.hex ?? '#d9d2c5'
  const previewKind = body?.kind ?? 'car'

  return (
    <GameShell title="자동차 조립" subtitle="요청한 차와 색깔을 맞춰요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">
          {target.color.ko} {target.body.label}를 만들어요
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <PaintSubject kind={target.body.kind} color={target.color.hex} size={64} />
        </div>
        <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => speak(`${target.color.ko} ${target.body.label}`)}>
          다시 듣기
        </button>
      </div>
      <div className="play-area">
        <div className="paint-car" style={{ background: `${previewColor}33` }} aria-label="조립 중인 자동차">
          <div style={{ display: 'grid', placeItems: 'center', minHeight: '8rem' }}>
            <PaintSubject kind={previewKind} color={previewColor} size={130} />
          </div>
        </div>
        <h3 className="section-title" style={{ marginTop: '0.8rem' }}>
          1. 차 고르기
        </h3>
        <div className="parts">
          {BODIES.map((b) => (
            <button
              key={b.id}
              type="button"
              className="part photo"
              style={{ outline: body?.id === b.id ? '3px solid var(--sunny)' : undefined }}
              onClick={() => {
                setBody(b)
                speak(b.label)
                check(b, color)
              }}
            >
              <PaintSubject kind={b.kind} color={color?.hex ?? '#FFD60A'} size={48} />
              <span>{b.label}</span>
            </button>
          ))}
        </div>
        <h3 className="section-title">2. 색깔 고르기</h3>
        <div className="grid-3">
          {PLAY_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="color-swatch"
              style={{
                background: c.hex,
                color: c.id === 'yellow' ? '#1a1510' : '#fff',
                outline: color?.id === c.id ? '3px solid var(--sunny)' : undefined,
              }}
              onClick={() => {
                setColor(c)
                speak(c.ko)
                check(body, c)
              }}
            >
              {c.ko}
            </button>
          ))}
        </div>
        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
            또 조립!
          </button>
        )}
      </div>
    </GameShell>
  )
}
