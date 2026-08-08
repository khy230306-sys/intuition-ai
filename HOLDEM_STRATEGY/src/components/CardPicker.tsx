import clsx from 'clsx'
import {
  type Card,
  type Rank,
  type Suit,
  RANKS,
  SUITS,
  RANK_LABEL,
  SUIT_LABEL,
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
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-2 sm:items-center sm:justify-center sm:p-4">
      <div className="he-enter flex max-h-[92dvh] w-full max-w-lg flex-col rounded-2xl border border-line bg-panel p-3 shadow-2xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="he-title text-lg text-accent">카드 선택</div>
          <button
            type="button"
            className="min-h-10 rounded-lg border border-line px-3 text-sm"
            onClick={onClose}
          >
            닫기
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-auto pb-1">
          {SUITS.map((suit) => (
            <div key={suit}>
              <div
                className={clsx(
                  'mb-1 text-xs font-semibold',
                  suit === 'h' || suit === 'd' ? 'text-[#ff8b8b]' : 'text-mute',
                )}
              >
                {SUIT_LABEL[suit]}
              </div>
              <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1">
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
                        'min-h-9 rounded-md border text-xs font-semibold sm:min-h-10 sm:text-sm',
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
