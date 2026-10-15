import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { playClickSound } from '../app/sound'
import { useSettings } from '../storage/SettingsContext'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: Variant
  fullWidth?: boolean
}

export function Button({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  onClick,
  type = 'button',
  ...rest
}: ButtonProps) {
  const { settings } = useSettings()

  return (
    <button
      type={type}
      className={[
        styles.button,
        styles[variant],
        fullWidth ? styles.full : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={(event) => {
        playClickSound(settings.soundEnabled)
        onClick?.(event)
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
