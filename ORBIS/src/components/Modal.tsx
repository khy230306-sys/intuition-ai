import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'
import styles from './Modal.module.css'

type ModalProps = {
  open: boolean
  title: string
  body: string
  detail?: string
  confirmLabel: string
  kicker?: string
  onClose: () => void
  children?: ReactNode
}

export function Modal({
  open,
  title,
  body,
  detail,
  confirmLabel,
  kicker,
  onClose,
  children,
}: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      previous?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p className={styles.body}>{body}</p>
        {detail ? <p className={styles.detail}>{detail}</p> : null}
        {children}
        <div className={styles.actions}>
          <Button variant="primary" onClick={onClose}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
