import { Link } from 'react-router-dom'
import { getProfile, STICKERS } from '../lib/store'
import { speak } from '../lib/speech'
import { GameShell } from '../components/GameShell'
import { CharImg } from '../components/GameArt'

export function StickerBook() {
  const profile = getProfile()
  const owned = new Set(profile.stickers)

  return (
    <GameShell title="스티커 차고" subtitle="별을 모으면 스티커가 생겨요">
      <div className="prompt">
        <div className="prompt-big">
          모은 스티커 {profile.stickers.length}/{STICKERS.length}
        </div>
        <div className="prompt-sub">놀이를 많이 할수록 차고가 꽉 차요</div>
      </div>
      <div className="play-area">
        <div className="grid-3">
          {STICKERS.map((s) => {
            const has = owned.has(s.id)
            return (
              <button
                key={s.id}
                type="button"
                className={`sticker-slot${has ? ' has' : ''}`}
                onClick={() => speak(has ? `${s.ko} 스티커!` : '아직 없어요. 별을 모아 보아요')}
              >
                <span style={{ filter: has ? 'none' : 'grayscale(1)', opacity: has ? 1 : 0.35 }}>
                  <CharImg src={s.src} size={64} />
                </span>
                <span className="card-title" style={{ fontSize: '0.9rem' }}>
                  {has ? s.ko : '???'}
                </span>
              </button>
            )
          })}
        </div>
        <Link to="/games" className="btn btn-sunny btn-block" style={{ marginTop: '0.9rem' }}>
          놀러 가서 스티커 모으기
        </Link>
      </div>
    </GameShell>
  )
}
