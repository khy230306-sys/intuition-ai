import clsx from 'clsx'
import type { PropsWithChildren } from 'react'

export function Card({
  children,
  className,
  onClick,
}: PropsWithChildren<{ className?: string; onClick?: () => void }>) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-line/80 bg-panel/90 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]',
        onClick && 'cursor-pointer active:scale-[0.99]',
        className,
      )}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter') onClick()
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
}

export function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <Card className={clsx(accent && 'border-gold/40')}>
      <div className="text-xs uppercase tracking-wide text-mute">{label}</div>
      <div className={clsx('pd-num mt-2 text-2xl font-bold', accent ? 'text-gold' : 'text-white')}>
        {value}
      </div>
    </Card>
  )
}
