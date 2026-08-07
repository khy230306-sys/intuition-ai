import clsx from 'clsx'
import { type Card, RANK_LABEL, SUIT_LABEL } from '@/engine/cards'

export function PlayingCard({
  card,
  selected,
  dimmed,
  onClick,
  size = 'md',
}: {
  card?: Card | null
  selected?: boolean
  dimmed?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}) {
  const red = card?.suit === 'h' || card?.suit === 'd'
  const sizes = {
    sm: 'h-14 w-10 text-sm',
    md: 'h-20 w-14 text-lg',
    lg: 'h-24 w-[4.25rem] text-xl',
  }

  if (!card) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          'rounded-xl border border-dashed border-line bg-panel/60 font-medium text-mute',
          sizes[size],
        )}
      >
        +
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'relative rounded-xl border bg-[#f7f3ea] font-semibold shadow-sm transition',
        sizes[size],
        red ? 'text-[#c62828]' : 'text-[#132027]',
        selected && 'ring-2 ring-accent he-live',
        dimmed && 'opacity-45',
      )}
    >
      <span className="absolute left-1.5 top-1 leading-none">{RANK_LABEL[card.rank]}</span>
      <span className="absolute inset-0 grid place-items-center text-2xl leading-none">
        {SUIT_LABEL[card.suit]}
      </span>
      <span className="absolute bottom-1 right-1.5 rotate-180 leading-none">{RANK_LABEL[card.rank]}</span>
    </button>
  )
}
