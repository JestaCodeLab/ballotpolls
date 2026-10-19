import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { useConfirmStore } from '../store/confirm'
import { Button } from './ui'

// Mounted once in App. Shown whenever confirmDelete() is awaiting an answer.
export default function ConfirmDialog() {
  const pending = useConfirmStore((s) => s.pending)
  const close = useConfirmStore((s) => s.close)
  const dialog = useRef<HTMLDivElement>(null)
  const cancelBtn = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  // Focus starts on Cancel so Enter or Space cannot delete by accident; focus goes back afterwards.
  useEffect(() => {
    if (pending) {
      returnFocus.current = document.activeElement as HTMLElement | null
      cancelBtn.current?.focus()
    } else if (returnFocus.current) {
      returnFocus.current.focus?.()
      returnFocus.current = null
    }
  }, [pending])

  if (!pending) return null

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return close(false)
    if (e.key !== 'Tab') return
    const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [])
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
      <div
        ref={dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-desc"
        onKeyDown={onKeyDown}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-danger">
          <Trash2 size={22} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <h2 id="confirm-delete-title" className="mt-4 font-display text-2xl font-bold tracking-tight">
          {pending.title}
        </h2>
        <p id="confirm-delete-desc" className="mt-2 text-[15px] leading-relaxed text-muted">
          {pending.message}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button ref={cancelBtn} variant="secondary" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => close(true)}>
            {pending.confirmLabel ?? 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  )
}
