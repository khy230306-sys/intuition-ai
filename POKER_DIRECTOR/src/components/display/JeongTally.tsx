import { splitJeong } from '@/utils/buyInTally'
import clsx from 'clsx'

/** Hand-ledger style 正 tally (5 strokes = one 正). */
export function JeongTally({
  count,
  className,
  markClassName,
}: {
  count: number
  className?: string
  markClassName?: string
}) {
  const { full, rest } = splitJeong(count)

  return (
    <span
      className={clsx(
        'inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 font-display tracking-tight',
        className,
      )}
      aria-label={`바인 ${count}`}
    >
      {Array.from({ length: full }, (_, i) => (
        <span key={`f-${i}`} className={clsx('text-[1.35em] leading-none', markClassName)}>
          正
        </span>
      ))}
      {rest > 0 ? <PartialJeong strokes={rest} className={markClassName} /> : null}
      {count <= 0 ? <span className={clsx('opacity-30', markClassName)}>—</span> : null}
    </span>
  )
}

function PartialJeong({ strokes, className }: { strokes: number; className?: string }) {
  const n = Math.min(4, Math.max(1, strokes))
  return (
    <span
      className={clsx('relative inline-block h-[1.15em] w-[1.15em] align-middle', className)}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" className="h-full w-full overflow-visible">
        {/* 1 top */}
        {n >= 1 ? (
          <line x1="6" y1="8" x2="34" y2="8" stroke="currentColor" strokeWidth="3.2" strokeLinecap="square" />
        ) : null}
        {/* 2 left vertical */}
        {n >= 2 ? (
          <line x1="12" y1="8" x2="12" y2="32" stroke="currentColor" strokeWidth="3.2" strokeLinecap="square" />
        ) : null}
        {/* 3 middle */}
        {n >= 3 ? (
          <line x1="12" y1="20" x2="30" y2="20" stroke="currentColor" strokeWidth="3.2" strokeLinecap="square" />
        ) : null}
        {/* 4 short vertical */}
        {n >= 4 ? (
          <line x1="22" y1="8" x2="22" y2="32" stroke="currentColor" strokeWidth="3.2" strokeLinecap="square" />
        ) : null}
      </svg>
    </span>
  )
}
