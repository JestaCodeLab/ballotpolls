import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  description?: ReactNode
  onClose: () => void
  children: ReactNode
  // Buttons pinned to the bottom of the window.
  footer?: ReactNode
  size?: 'md' | 'lg' | 'xl'
  // Cannot be closed: no close button, and Escape or a click outside do nothing. For a step the person must finish.
  locked?: boolean
}

const widths = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

// The shared window for the "do it here without leaving the page" steps: dims the page, keeps keyboard focus inside,
// closes on Escape or a click outside, and scrolls its own content when it is long.
export default function Modal({ title, description, onClose, children, footer, size = 'md', locked }: Props) {
  const id = useId()
  const dialog = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null)

  useEffect(() => {
    dialog.current?.querySelector<HTMLElement>('input:not(:disabled), textarea, [role="combobox"]:not(:disabled), button:not(:disabled)')?.focus()
    const back = returnFocus.current
    return () => back?.focus?.()
    // Runs once, when the window opens.
  }, [])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return locked ? undefined : onClose()
    if (e.key !== 'Tab') return
    const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('input:not(:disabled), textarea:not(:disabled), button:not(:disabled), [role="combobox"]:not(:disabled), a[href]') ?? [])
    if (!items.length) return
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
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-ink/60 p-4" onMouseDown={(e) => !locked && e.target === e.currentTarget && onClose()}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onKeyDown={onKeyDown}
        className={`flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-2xl ${widths[size]}`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-6">
          <div>
            <h2 id={`${id}-title`} className="font-display text-2xl font-bold tracking-tight">
              {title}
            </h2>
            {description && <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>}
          </div>
          {!locked && (
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-muted hover:bg-ground hover:text-ink">
              <X size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}
