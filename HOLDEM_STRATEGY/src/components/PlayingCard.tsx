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
  size?: 'xs' | 'sm' | 'md' | 'lg'
}) {
  const red = card?.suit === 'h' || card?.suit === 'd'
  const sizes = {
    xs: 'h-11 w-8 text-[11px] rounded-lg',
    sm: 'h-14 w-10 text-sm rounded-xl',
    md: 'h-16 w-12 text-base rounded-xl',
    lg: 'h-20 w-14 text-lg rounded-xl',
  }
  const suitSize = {
    xs: 'text-base',
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-2xl',
  }

  if (!card) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          'border border-dashed border-line bg-panel/60 font-medium text-mute',
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
        'relative border bg-[#f7f3ea] font-semibold shadow-sm transition',
        sizes[size],
        red ? 'text-[#c62828]' : 'text-[#132027]',
        selected && 'ring-2 ring-accent he-live',
        dimmed && 'opacity-40',
      )}
    >
      <span className="absolute left-1 top-0.5 leading-none">{RANK_LABEL[card.rank]}</span>
      <span className={clsx('absolute inset-0 grid place-items-center leading-none', suitSize[size])}>
        {SUIT_LABEL[card.suit]}
      </span>
      {size !== 'xs' ? (
        <span className="absolute bottom-0.5 right-1 rotate-180 leading-none">
          {RANK_LABEL[card.rank]}
        </span>
      ) : null}
    </button>
  )
}
