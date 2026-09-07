import { useRef, useState } from 'react'
import { speak } from '../lib/speech'
import { sfx } from '../lib/sfx'
import { addStars } from '../lib/store'
import { GameShell } from '../components/GameShell'
import { PaintSubject } from '../components/PaintSubject'

const SOUNDS = [
  { id: 'horn', kind: 'car', color: '#FF2D55', ko: '빵빵', say: '빵빵!', play: () => sfx.horn() },
  { id: 'vroom', kind: 'car', color: '#FF7A00', ko: '부릉', say: '부릉부릉!', play: () => sfx.vroom() },
  { id: 'siren', kind: 'police', color: '#2F6BFF', ko: '삐뽀', say: '삐뽀삐뽀!', play: () => sfx.siren() },
  { id: 'fire', kind: 'fire', color: '#FF2D55', ko: '위잉', say: '위이잉!', play: () => sfx.siren() },
  { id: 'bus', kind: 'bus', color: '#FFD400', ko: '버스', say: '버스가 출발해요!', play: () => sfx.horn() },
  { id: 'truck', kind: 'truck', color: '#FF7A00', ko: '트럭', say: '털털털!', play: () => sfx.vroom() },
  { id: 'amb', kind: 'ambulance', color: '#FFF8E7', ko: '삐용', say: '삐용삐용!', play: () => sfx.siren() },
  { id: 'tractor', kind: 'tractor', color: '#22C55E', ko: '트랙터', say: '덜컹덜컹!', play: () => sfx.drum() },
  { id: 'cheer', kind: 'star', color: '#FFD400', ko: '야호', say: '야호! 잘했어요!', play: () => sfx.cheer() },
]

export function SoundBoard() {
  const [active, setActive] = useState<string | null>(null)
  const taps = useRef(0)

  function play(s: (typeof SOUNDS)[number]) {
    setActive(s.id)
    s.play()
    speak(s.say)
    taps.current += 1
    if (taps.current % 6 === 0) {
      addStars(1, 'sound-board')
      sfx.win()
    }
    setTimeout(() => setActive(null), 350)
  }

  return (
    <GameShell title="사운드보드" subtitle="크게 눌러 보아요">
      <div className="prompt">
        <div className="prompt-big">빵빵! 삐뽀!</div>
      </div>
      <div className="play-area">
        <div className="grid-3">
          {SOUNDS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`sound-btn photo-btn${active === s.id ? ' on' : ''}`}
              onClick={() => play(s)}
            >
              <PaintSubject kind={s.kind} color={s.color} size={72} />
              <span className="card-title">{s.ko}</span>
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  )
}
