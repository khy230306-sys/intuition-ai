import type { PropsWithChildren } from 'react'
import { Button } from '@/components/ui/Button'

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: PropsWithChildren<{
  open: boolean
  title: string
  onClose: () => void
  footer?: React.ReactNode
}>) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-line bg-panel p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="닫기">
            닫기
          </Button>
        </div>
        <div>{children}</div>
        {footer ? <div className="mt-4 flex flex-wrap gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            확인
          </Button>
        </>
      }
    >
      <p className="text-sm text-mute">{message}</p>
    </Modal>
  )
}
