import { useMemo, useState } from 'react'
import { PLAY_COLORS, pick } from '../data/colors'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { KIND_NATURAL, NaturalSubject, PaintSubject } from '../components/PaintSubject'
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
      sfx.win()
      speak('완성! 멋진 자동차예요!')
      round.win('조립 성공!')
      setBody(null)
      setColor(null)
    } else if (nextBody.id === target.body.id || nextColor.id === target.color.id) {
      sfx.tap()
      speak('거의 다 왔어요!')
    } else {
      sfx.wrong()
      speak('다시 골라 볼까요?')
    }
  }

  const previewKind = body?.kind ?? target.body.kind
  const previewColor = color?.hex ?? KIND_NATURAL[previewKind] ?? '#d9d2c5'

  return (
    <GameShell title="자동차 만들기" subtitle="차랑 색깔을 맞춰요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">
          {target.color.ko} {target.body.label}
        </div>
        <div className="builder-target">
          <PaintSubject kind={target.body.kind} color={target.color.hex} size={88} />
        </div>
        <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => speak(`${target.color.ko} ${target.body.label}`)}>
          다시 듣기
        </button>
      </div>
      <div className="play-area">
        <div className="builder-stage" style={{ background: `radial-gradient(circle at 50% 80%, #fff 0 28%, ${previewColor}44 29% 100%)` }}>
          <PaintSubject key={`${previewKind}-${previewColor}`} kind={previewKind} color={previewColor} size={168} className="paint-pop" />
        </div>
        <h3 className="section-title" style={{ marginTop: '0.8rem' }}>
          1. 차 고르기
        </h3>
        <div className="builder-bodies">
          {BODIES.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`builder-body${body?.id === b.id ? ' on' : ''}`}
              onClick={() => {
                setBody(b)
                sfx.tap()
                speak(b.label)
                check(b, color)
              }}
            >
              <NaturalSubject kind={b.kind} size={72} />
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
                sfx.paint()
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
            또 만들기!
          </button>
        )}
      </div>
    </GameShell>
  )
}
