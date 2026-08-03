import { useMemo, useState } from 'react'
import { PLAY_COLORS, pick } from '../data/colors'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { Confetti } from '../components/Confetti'
import { useRound } from './useRound'

const BODIES = [
  { id: 'sedan', label: '승용차', emoji: '🚗' },
  { id: 'bus', label: '버스', emoji: '🚌' },
  { id: 'truck', label: '트럭', emoji: '🚚' },
  { id: 'police', label: '경찰차', emoji: '🚓' },
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

  return (
    <GameShell title="자동차 조립" subtitle="요청한 차와 색깔을 맞춰요" progress={round.progress}>
      <Confetti show={round.confetti} />
      {round.toast && <div className="toast">{round.toast}</div>}
      <div className="prompt">
        <div className="prompt-big">
          {target.color.ko} {target.body.label}를 만들어요
        </div>
        <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => speak(`${target.color.ko} ${target.body.label}`)}>
          다시 듣기 🔊
        </button>
      </div>
      <div className="play-area">
        <div
          className="paint-car"
          style={{ background: 'linear-gradient(#dbeafe,#fff)' }}
          aria-label="조립 중인 자동차"
        >
          <div className="cabin" />
          <div className="body" style={{ background: color?.hex || '#ddd' }} />
          <div className="wheel l" />
          <div className="wheel r" />
          <div style={{ position: 'absolute', inset: 0, placeItems: 'center', fontSize: '3rem', display: 'grid' }}>
            {body?.emoji || '❓'}
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
              className="part"
              style={{ outline: body?.id === b.id ? '3px solid var(--sunny)' : undefined }}
              onClick={() => {
                setBody(b)
                speak(b.label)
                check(b, color)
              }}
            >
              {b.emoji} {b.label}
            </button>
          ))}
        </div>
        <h3 className="section-title">2. 색깔 고르기</h3>
        <div className="grid-3">
          {PLAY_COLORS.slice(0, 6).map((c) => (
            <button
              key={c.id}
              type="button"
              className="swatch"
              style={{ background: c.hex, outline: color?.id === c.id ? '4px solid #1a1510' : undefined }}
              onClick={() => {
                setColor(c)
                speak(c.ko)
                check(body, c)
              }}
            />
          ))}
        </div>
        {round.done && (
          <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.8rem' }} onClick={round.reset}>
            또 만들어요!
          </button>
        )}
      </div>
    </GameShell>
  )
}
