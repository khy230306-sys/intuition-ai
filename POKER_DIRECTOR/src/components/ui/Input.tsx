import clsx from 'clsx'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'w-full min-h-12 rounded-xl border border-line bg-felt-2 px-3 text-base text-white outline-none focus:border-gold',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        'w-full rounded-xl border border-line bg-felt-2 px-3 py-3 text-base text-white outline-none focus:border-gold',
        className,
      )}
      {...props}
    />
  )
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm text-mute">
      {children}
    </label>
  )
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        'w-full min-h-12 rounded-xl border border-line bg-felt-2 px-3 text-base text-white outline-none focus:border-gold',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
