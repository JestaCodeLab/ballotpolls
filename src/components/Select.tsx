import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  // Extra classes for the wrapper, e.g. a minimum width.
  className?: string
  // Keeps the label for screen readers but hides it, for compact filter rows.
  hideLabel?: boolean
}

const MAX_PANEL = 288
const GAP = 8
const EDGE = 12

// A dropdown that replaces the browser's own <select>. The list is drawn in a portal on <body> with fixed
// positioning, so no card, scroll box or later element can clip it or paint over it. It opens upward when
// there is more room above, and scrolls inside itself when the list is long.
export default function Select({ label, value, options, onChange, placeholder = 'Select…', disabled, className = '', hideLabel }: Props) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const typed = useRef({ text: '', at: 0 })
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<CSSProperties | null>(null)

  const selected = options.findIndex((o) => o.value === value)
  const current = selected >= 0 ? options[selected] : undefined

  const count = options.length
  const place = useCallback(() => {
    const el = trigger.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - GAP - EDGE
    const above = r.top - GAP - EDGE
    // The list's natural height: about 44px per row plus padding, capped.
    const want = Math.min(MAX_PANEL, count * 44 + 12)
    const up = below < want && above > below
    const room = Math.max(120, Math.min(want, up ? above : below))
    setPos({
      position: 'fixed',
      left: Math.max(EDGE, Math.min(r.left, window.innerWidth - r.width - EDGE)),
      width: r.width,
      maxHeight: room,
      ...(up ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }),
    })
  }, [count])

  const openList = () => {
    if (disabled) return
    setActive(Math.max(0, selected))
    setOpen(true)
  }

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) trigger.current?.focus()
  }

  const choose = (i: number) => {
    const o = options[i]
    if (o) onChange(o.value)
    close()
  }

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  // Keep the list attached to its field while the page scrolls or the window resizes; close on a click elsewhere.
  useEffect(() => {
    if (!open) return
    const onMove = () => place()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panel.current?.contains(t) && !trigger.current?.contains(t)) close(false)
    }
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    document.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open, place])

  // Focus the list when it opens and keep the highlighted row in view.
  const placed = pos !== null
  useEffect(() => {
    if (open && placed) panel.current?.focus({ preventScroll: true })
  }, [open, placed])

  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const onTriggerKey = (e: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      openList()
    }
  }

  const onListKey = (e: KeyboardEvent) => {
    const last = options.length - 1
    if (e.key === 'ArrowDown') setActive((a) => Math.min(last, a + 1))
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(last)
    else if (e.key === 'Enter' || e.key === ' ') choose(active)
    else if (e.key === 'Escape') {
      e.stopPropagation()
      close()
    } else if (e.key === 'Tab') close(false)
    else if (e.key.length === 1) {
      // Typing jumps to the next option that starts with what was typed.
      const now = Date.now()
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + e.key.toLowerCase(), at: now }
      const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text))
      if (hit >= 0) setActive(hit)
      return
    } else return
    e.preventDefault()
  }

  return (
    <div className={`text-sm ${className}`}>
      <span id={`${id}-label`} className={hideLabel ? 'sr-only' : 'mb-1.5 block font-medium'}>
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label ${id}-value`}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onTriggerKey}
        className="flex min-h-[46px] w-full items-center justify-between gap-2 rounded-[10px] border border-field bg-white px-3.5 text-left text-[15px] outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 disabled:bg-ground disabled:text-muted"
      >
        <span id={`${id}-value`} className={`min-w-0 truncate ${current ? 'text-ink' : 'text-muted'}`}>
          {current?.label ?? placeholder}
        </span>
        <ChevronDown size={18} strokeWidth={1.8} aria-hidden="true" className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panel}
            id={`${id}-list`}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={`${id}-label`}
            aria-activedescendant={`${id}-opt-${active}`}
            onKeyDown={onListKey}
            style={pos}
            className="z-[80] overflow-y-auto overscroll-contain rounded-[14px] border border-line bg-white p-1.5 shadow-xl shadow-ink/15 outline-none"
          >
            {options.map((o, i) => (
              <div
                key={o.value}
                id={`${id}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === selected}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[10px] px-3 text-[15px] ${i === active ? 'bg-ground' : ''} ${i === selected ? 'font-semibold text-[#0b5a43]' : ''}`}
              >
                <span className="min-w-0 truncate">{o.label}</span>
                {i === selected && <Check size={16} strokeWidth={2.2} aria-hidden="true" className="shrink-0 text-brand" />}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
