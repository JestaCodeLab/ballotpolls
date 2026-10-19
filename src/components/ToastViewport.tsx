import { useEffect, useRef } from 'react'
import { useToasts, type ToastItem, type ToastKind } from '../store/toast'

const styles: Record<ToastKind, { badge: string; label: string }> = {
  success: { badge: 'bg-brand text-white', label: 'Success' },
  error: { badge: 'bg-danger text-white', label: 'Error' },
  info: { badge: 'bg-accent text-ink', label: 'Notice' },
}

function Icon({ kind }: { kind: ToastKind }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (kind === 'success')
    return (
      <svg {...common}>
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
    )
  if (kind === 'error')
    return (
      <svg {...common}>
        <path d="M12 6v8M12 18h.01" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M12 11v6M12 7h.01" />
    </svg>
  )
}

function Toast({ item }: { item: ToastItem }) {
  const dismiss = useToasts((s) => s.dismiss)
  const s = styles[item.kind]

  // Dismisses itself after `duration`. Hovering or focusing the toast pauses the clock so it can be read.
  const remaining = useRef(item.duration)
  const startedAt = useRef(0)
  const timer = useRef<number | undefined>(undefined)
  const resume = () => {
    if (timer.current !== undefined) return
    startedAt.current = Date.now()
    timer.current = window.setTimeout(() => dismiss(item.id), remaining.current)
  }
  const pause = () => {
    if (timer.current === undefined) return
    window.clearTimeout(timer.current)
    timer.current = undefined
    remaining.current -= Date.now() - startedAt.current
  }
  useEffect(() => {
    resume()
    return pause
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      // Errors interrupt screen readers; success and info wait their turn.
      role={item.kind === 'error' ? 'alert' : 'status'}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      className="toast-in pointer-events-auto rounded-[14px] border border-line bg-white shadow-lg shadow-ink/10"
    >
      {/* Icon, text and dismiss button each have a 44px-tall first row, so they share one centre line. */}
      <div className="flex items-start gap-3 py-1.5 pl-4 pr-1.5">
        <span className="flex h-11 shrink-0 items-center">
          <span className={`flex h-7 w-7 items-center justify-center rounded-full ${s.badge}`}>
            <Icon kind={item.kind} />
          </span>
        </span>
        <div className="flex min-h-11 min-w-0 flex-1 flex-col justify-center py-2.5">
          <p className="font-sans text-[15px] font-semibold leading-snug text-ink">
            <span className="sr-only">{s.label}: </span>
            {item.title}
          </p>
          {item.description && <p className="mt-0.5 text-sm leading-snug text-muted">{item.description}</p>}
        </div>
        <button
          type="button"
          onClick={() => dismiss(item.id)}
          aria-label="Dismiss notification"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-muted hover:bg-ground hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function ToastViewport() {
  const toasts = useToasts((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed inset-x-4 top-20 z-[60] flex flex-col gap-3 sm:left-auto sm:right-6 sm:w-[380px]">
      {toasts.map((t) => (
        <Toast key={t.id} item={t} />
      ))}
    </div>
  )
}
