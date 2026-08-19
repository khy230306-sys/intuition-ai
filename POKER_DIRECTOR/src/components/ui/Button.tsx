import clsx from 'clsx'
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'gold'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-gold text-black hover:bg-gold-soft',
  secondary: 'bg-panel-2 border border-line text-white hover:bg-line/40',
  danger: 'bg-danger text-white hover:bg-rose-500',
  ghost: 'bg-transparent text-mute hover:text-white hover:bg-white/5',
  gold: 'bg-gradient-to-b from-gold-soft to-gold text-black font-semibold',
}

const sizes = {
  sm: 'min-h-11 px-3 text-sm',
  md: 'min-h-12 px-4 text-sm',
  lg: 'min-h-14 px-5 text-base',
}

export function Button({
  children,
  className,
  variant = 'secondary',
  size = 'md',
  block,
  ...props
}: PropsWithChildren<Props>) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
