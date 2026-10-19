import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDismiss } from '../lib/useDismiss'
import {
  WEEKDAYS,
  addDays,
  addMonths,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  monthGrid,
  startOfMonth,
  todayISO,
  weekdayIndex,
} from '../lib/datetime'

export const triggerClass =
  'flex min-h-[46px] w-full items-center justify-between gap-2 rounded-[10px] border border-field bg-white px-3.5 text-left text-[15px] outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 disabled:bg-ground disabled:text-muted'

interface Props {
  value: string // 'YYYY-MM-DD' or ''
  onChange: (iso: string) => void
  ariaLabel: string
  min?: string
  max?: string
  disabled?: boolean
  placeholder?: string
}

// A calendar popover in the project's style. Arrow keys move by day and week, PageUp/PageDown by month,
// Home/End to the start/end of the week, Enter or Space picks, Escape closes.
export default function DatePicker({ value, onChange, ariaLabel, min, max, disabled, placeholder = 'Date' }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(todayISO()) // any date inside the month being shown
  const [focus, setFocus] = useState(todayISO()) // the date that holds keyboard focus
  const [above, setAbove] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, wrap, close)

  const today = todayISO()
  const blocked = useCallback((iso: string) => Boolean((min && iso < min) || (max && iso > max)), [min, max])
  const clamp = (iso: string) => (min && iso < min ? min : max && iso > max ? max : iso)

  const toggle = () => {
    if (open) return close()
    const start = clamp(value || today)
    setView(start)
    setFocus(start)
    // Open upwards / right-aligned when there is no room, so the calendar is never cut off.
    const r = trigger.current!.getBoundingClientRect()
    const below = window.innerHeight - r.bottom
    const NEED = 420 // height of the calendar
    setAbove(below < NEED && r.top >= NEED) // flip up only when it really fits there
    setAlignRight(r.left + 300 > window.innerWidth)
    setOpen(true)
  }

  // If it fits neither above nor below, scroll the page so the whole calendar is visible.
  useEffect(() => {
    if (open) pop.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [open])

  // Keep the keyboard-focused day in view and focused.
  useEffect(() => {
    if (!open) return
    pop.current?.querySelector<HTMLButtonElement>(`[data-date="${focus}"]`)?.focus()
  }, [open, focus, view])

  const moveFocus = (iso: string) => {
    if (blocked(iso)) return
    setFocus(iso)
    if (startOfMonth(iso) !== startOfMonth(view)) setView(iso)
  }

  const onGridKey = (e: KeyboardEvent) => {
    const keys: Record<string, () => string> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => addMonths(focus, -1),
      PageDown: () => addMonths(focus, 1),
      Home: () => addDays(focus, -weekdayIndex(focus)),
      End: () => addDays(focus, 6 - weekdayIndex(focus)),
    }
    const next = keys[e.key]
    if (next) {
      e.preventDefault()
      moveFocus(next())
    }
  }

  const choose = (iso: string) => {
    if (blocked(iso)) return
    onChange(iso)
    close()
    trigger.current?.focus()
  }

  const prevMonth = addMonths(startOfMonth(view), -1)
  const nextMonth = addMonths(startOfMonth(view), 1)
  const canPrev = !min || monthGrid(prevMonth).flat().some((d) => d >= min && startOfMonth(d) === prevMonth)
  const canNext = !max || monthGrid(nextMonth).flat().some((d) => d <= max && startOfMonth(d) === nextMonth)

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={value ? `${ariaLabel}, ${formatLongDate(value)}` : `${ariaLabel}, not set`}
        onClick={toggle}
        className={triggerClass}
      >
        <span className={`min-w-0 truncate ${value ? 'text-ink' : 'text-muted'}`}>{value ? formatShortDate(value) : placeholder}</span>
        <Calendar size={18} strokeWidth={1.8} className="shrink-0 text-muted" aria-hidden="true" />
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
          className={`absolute z-50 w-[296px] rounded-[14px] border border-line bg-white p-3 shadow-xl shadow-ink/15 ${above ? 'bottom-full mb-2' : 'top-full mt-2'} ${alignRight ? 'right-0' : 'left-0'}`}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              disabled={!canPrev}
              onClick={() => setView(prevMonth)}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] text-ink hover:bg-ground disabled:text-field disabled:hover:bg-transparent"
            >
              <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <div aria-live="polite" className="font-display text-base font-bold">
              {formatMonthYear(view)}
            </div>
            <button
              type="button"
              aria-label="Next month"
              disabled={!canNext}
              onClick={() => setView(nextMonth)}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] text-ink hover:bg-ground disabled:text-field disabled:hover:bg-transparent"
            >
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          <div role="grid" aria-label={formatMonthYear(view)} onKeyDown={onGridKey}>
            <div role="row" className="grid grid-cols-7">
              {WEEKDAYS.map((d) => (
                <div key={d} role="columnheader" className="flex h-8 items-center justify-center text-xs font-semibold text-muted">
                  {d}
                </div>
              ))}
            </div>
            {monthGrid(view).map((week) => (
              <div key={week[0]} role="row" className="grid grid-cols-7">
                {week.map((iso) => {
                  const inMonth = startOfMonth(iso) === startOfMonth(view)
                  const selected = iso === value
                  const isToday = iso === today
                  const off = blocked(iso)
                  return (
                    <button
                      key={iso}
                      type="button"
                      role="gridcell"
                      data-date={iso}
                      aria-selected={selected}
                      aria-current={isToday ? 'date' : undefined}
                      aria-label={formatLongDate(iso)}
                      disabled={off}
                      tabIndex={iso === focus ? 0 : -1}
                      onClick={() => choose(iso)}
                      className={`m-px flex h-10 items-center justify-center rounded-[10px] text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                        selected
                          ? 'bg-brand font-semibold text-white hover:bg-brand-dark'
                          : off
                            ? 'text-field'
                            : `hover:bg-brand-tint ${inMonth ? 'text-ink' : 'text-muted/60'} ${isToday ? 'font-bold text-brand ring-1 ring-inset ring-brand' : ''}`
                      }`}
                    >
                      {Number(iso.slice(8))}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-[#eef2f0] pt-2">
            <button
              type="button"
              disabled={blocked(today)}
              onClick={() => choose(today)}
              className="min-h-10 rounded-[10px] px-3 text-sm font-semibold text-brand hover:bg-brand-tint disabled:text-field disabled:hover:bg-transparent"
            >
              Today
            </button>
            <button type="button" onClick={() => { close(); trigger.current?.focus() }} className="min-h-10 rounded-[10px] px-3 text-sm font-semibold text-muted hover:bg-ground">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
