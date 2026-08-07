import clsx from 'clsx'
import {
  type Card,
  type Rank,
  type Suit,
  RANKS,
  SUITS,
  RANK_LABEL,
  SUIT_LABEL,
  SUIT_NAME,
  cardEquals,
} from '@/engine/cards'

export function CardPicker({
  used,
  onPick,
  onClose,
}: {
  used: Card[]
  onPick: (card: Card) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/55 p-3 sm:place-items-center">
      <div className="he-enter w-full max-w-lg rounded-3xl border border-line bg-panel p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="he-title text-xl text-accent">카드 선택</div>
            <p className="text-sm text-mute">숫자 → 무늬 순으로 고르세요</p>
          </div>
          <button
            type="button"
            className="min-h-11 rounded-xl border border-line px-4 text-sm"
            onClick={onClose}
          >
            닫기
          </button>
        </div>

        <div className="space-y-4">
          {SUITS.map((suit) => (
            <div key={suit}>
              <div
                className={clsx(
                  'mb-2 text-sm font-semibold',
                  suit === 'h' || suit === 'd' ? 'text-[#ff8b8b]' : 'text-ink',
                )}
              >
                {SUIT_LABEL[suit]} {SUIT_NAME[suit]}
              </div>
              <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-[repeat(13,minmax(0,1fr))]">
                {RANKS.map((rank) => {
                  const card: Card = { rank: rank as Rank, suit: suit as Suit }
                  const disabled = used.some((u) => cardEquals(u, card))
                  return (
                    <button
                      key={`${rank}${suit}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => onPick(card)}
                      className={clsx(
                        'min-h-11 rounded-lg border text-sm font-semibold',
                        disabled
                          ? 'border-line/40 bg-panel-2/40 text-mute/40'
                          : suit === 'h' || suit === 'd'
                            ? 'border-[#5a2a2a] bg-[#2a1518] text-[#ffb4b4]'
                            : 'border-line bg-panel-2 text-ink',
                      )}
                    >
                      {RANK_LABEL[rank]}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
