import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Clock } from 'lucide-react'
import { useDismiss } from '../lib/useDismiss'
import { from12h, formatTime, pad, to12h, type Period, type Time12 } from '../lib/datetime'
import { triggerClass } from './DatePicker'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)
const PERIODS: Period[] = ['AM', 'PM']
const DEFAULT: Time12 = { hour: 9, minute: 0, period: 'AM' }

interface Props {
  value: string // 'HH:mm' (24-hour) or ''
  onChange: (hhmm: string) => void
  ariaLabel: string
  disabled?: boolean
  placeholder?: string
}

// Hour, minute and AM/PM columns. Picking in any column updates the time straight away.
// Up/Down change the value in a column, Left/Right jump between columns, Escape closes.
export default function TimePicker({ value, onChange, ariaLabel, disabled, placeholder = 'Time' }: Props) {
  const [open, setOpen] = useState(false)
  const [above, setAbove] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, wrap, close)

  const current = value ? to12h(value) : DEFAULT
  const set = (patch: Partial<Time12>) => onChange(from12h({ ...current, ...patch }))

  const toggle = () => {
    if (open) return close()
    const r = trigger.current!.getBoundingClientRect()
    const below = window.innerHeight - r.bottom
    const NEED = 340 // height of the picker
    setAbove(below < NEED && r.top >= NEED) // flip up only when it really fits there
    setAlignRight(r.left + 260 > window.innerWidth)
    setOpen(true)
  }

  // On open, scroll each column to its selected row and put focus on the hour.
  useEffect(() => {
    if (!open || !pop.current) return
    pop.current.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    pop.current.querySelectorAll<HTMLElement>('[role="listbox"]').forEach((col) => {
      const sel = col.querySelector<HTMLElement>('[aria-selected="true"]')
      if (sel) col.scrollTop = sel.offsetTop - col.clientHeight / 2 + sel.clientHeight / 2
    })
    pop.current.querySelector<HTMLElement>('[data-col="hour"] [tabindex="0"]')?.focus()
  }, [open])

  const focusOption = (col: string, val: string | number) =>
    requestAnimationFrame(() => pop.current?.querySelector<HTMLElement>(`[data-col="${col}"] [data-val="${val}"]`)?.focus())

  const columns = ['hour', 'minute', 'period']
  const onOptionKey = (e: KeyboardEvent, col: string, items: (number | string)[], val: number | string, pick: (v: never) => void) => {
    const i = items.indexOf(val)
    let next: number | string | undefined
    if (e.key === 'ArrowDown') next = items[Math.min(i + 1, items.length - 1)]
    else if (e.key === 'ArrowUp') next = items[Math.max(i - 1, 0)]
    else if (e.key === 'Home') next = items[0]
    else if (e.key === 'End') next = items[items.length - 1]
    if (next !== undefined) {
      e.preventDefault()
      pick(next as never)
      focusOption(col, next)
      return
    }
    const ci = columns.indexOf(col)
    const side = e.key === 'ArrowRight' ? columns[ci + 1] : e.key === 'ArrowLeft' ? columns[ci - 1] : undefined
    if (side) {
      e.preventDefault()
      pop.current?.querySelector<HTMLElement>(`[data-col="${side}"] [tabindex="0"]`)?.focus()
    }
  }

  const option = (col: string, items: (number | string)[], val: number | string, selected: boolean, label: string, pick: (v: never) => void, tabbable: boolean) => (
    <button
      key={val}
      type="button"
      role="option"
      data-val={val}
      aria-selected={selected}
      tabIndex={tabbable ? 0 : -1}
      onClick={() => pick(val as never)}
      onKeyDown={(e) => onOptionKey(e, col, items, val, pick)}
      className={`flex h-10 w-full shrink-0 items-center justify-center rounded-[10px] text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${selected ? 'bg-brand font-semibold text-white hover:bg-brand-dark' : 'text-ink hover:bg-brand-tint'}`}
    >
      {label}
    </button>
  )

  const hasValue = Boolean(value)
  const colClass = 'flex h-56 flex-col gap-0.5 overflow-y-auto rounded-[10px] p-0.5'

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={value ? `${ariaLabel}, ${formatTime(value)}` : `${ariaLabel}, not set`}
        onClick={toggle}
        className={triggerClass}
      >
        <span className={`min-w-0 truncate ${value ? 'text-ink' : 'text-muted'}`}>{value ? formatTime(value) : placeholder}</span>
        <Clock size={18} strokeWidth={1.8} className="shrink-0 text-muted" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={pop}
          role="dialog"
          aria-label={`Choose ${ariaLabel.toLowerCase()}`}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              close()
              trigger.current?.focus()
            }
          }}
          className={`absolute z-50 w-[248px] rounded-[14px] border border-line bg-white p-3 shadow-xl shadow-ink/15 ${above ? 'bottom-full mb-2' : 'top-full mt-2'} ${alignRight ? 'right-0' : 'left-0'}`}
        >
          <div className="mb-1 grid grid-cols-[1fr_1fr_0.8fr] gap-2 text-center text-xs font-semibold text-muted">
            <span>Hour</span>
            <span>Minute</span>
            <span>AM / PM</span>
          </div>
          <div className="grid grid-cols-[1fr_1fr_0.8fr] gap-2">
            <div role="listbox" aria-label="Hour" data-col="hour" className={colClass}>
              {HOURS.map((h) => option('hour', HOURS, h, hasValue && current.hour === h, String(h), (v: number) => set({ hour: v }), hasValue ? current.hour === h : h === DEFAULT.hour))}
            </div>
            <div role="listbox" aria-label="Minute" data-col="minute" className={colClass}>
              {MINUTES.map((m) => option('minute', MINUTES, m, hasValue && current.minute === m, pad(m), (v: number) => set({ minute: v }), hasValue ? current.minute === m : m === 0))}
            </div>
            <div role="listbox" aria-label="AM or PM" data-col="period" className={colClass}>
              {PERIODS.map((p) => option('period', PERIODS, p, hasValue && current.period === p, p, (v: Period) => set({ period: v }), hasValue ? current.period === p : p === DEFAULT.period))}
            </div>
          </div>
          <div className="mt-2 flex justify-end border-t border-[#eef2f0] pt-2">
            <button type="button" onClick={() => { close(); trigger.current?.focus() }} className="min-h-10 rounded-[10px] px-4 text-sm font-semibold text-brand hover:bg-brand-tint">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
