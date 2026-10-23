import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// A small label that appears over an icon-only control on hover or keyboard focus. It is drawn on <body>, so a table or
// card that clips its contents can never cut it off. It sits above the control, or below when there is no room above.
export default function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [at, setAt] = useState<{ x: number; y: number; below: boolean } | null>(null)

  useEffect(() => {
    if (!at) return
    const hide = () => setAt(null)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [at])

  const show = (e: { currentTarget: HTMLElement }) => {
    const r = e.currentTarget.getBoundingClientRect()
    const below = r.top < 44
    setAt({ x: Math.min(Math.max(r.left + r.width / 2, 80), window.innerWidth - 80), y: below ? r.bottom + 8 : r.top - 8, below })
  }

  return (
    <span className="inline-flex" onMouseEnter={show} onMouseLeave={() => setAt(null)} onFocus={show} onBlur={() => setAt(null)} onPointerDown={() => setAt(null)}>
      {children}
      {at &&
        createPortal(
          // The control already carries this text as its accessible name, so screen readers skip the bubble.
          <span
            aria-hidden="true"
            style={{ left: at.x, top: at.y, transform: at.below ? 'translateX(-50%)' : 'translate(-50%, -100%)' }}
            className="pointer-events-none fixed z-[80] max-w-[240px] rounded-md bg-ink px-2.5 py-1.5 text-center text-xs font-medium leading-snug text-white shadow-lg"
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  )
}
