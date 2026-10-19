// Dates are handled as plain local calendar dates ('2026-10-18') and times as 24-hour 'HH:mm',
// so no time zone arithmetic can shift a day.

const pad = (n: number) => String(n).padStart(2, '0')

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const parseISODate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayISO = () => toISODate(new Date())

export const addDays = (iso: string, n: number) => {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

// Moves by whole months and clamps the day (31 Jan + 1 month = 28/29 Feb).
export const addMonths = (iso: string, n: number) => {
  const d = parseISODate(iso)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
  return toISODate(d)
}

export const startOfMonth = (iso: string) => iso.slice(0, 8) + '01'

// Monday = 0 ... Sunday = 6
export const weekdayIndex = (iso: string) => (parseISODate(iso).getDay() + 6) % 7

// Six weeks of dates (Monday first) covering the month that contains `iso`.
export const monthGrid = (iso: string): string[][] => {
  const first = startOfMonth(iso)
  const start = addDays(first, -weekdayIndex(first))
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))
}

export const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export const formatMonthYear = (iso: string) =>
  parseISODate(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

export const formatShortDate = (iso: string) =>
  parseISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatLongDate = (iso: string) =>
  parseISODate(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export type Period = 'AM' | 'PM'
export interface Time12 {
  hour: number // 1-12
  minute: number // 0-59
  period: Period
}

export const to12h = (hhmm: string): Time12 => {
  const [h, m] = hhmm.split(':').map(Number)
  return { hour: h % 12 === 0 ? 12 : h % 12, minute: m, period: h >= 12 ? 'PM' : 'AM' }
}

export const from12h = ({ hour, minute, period }: Time12) =>
  `${pad((hour % 12) + (period === 'PM' ? 12 : 0))}:${pad(minute)}`

export const formatTime = (hhmm: string) => {
  const t = to12h(hhmm)
  return `${t.hour}:${pad(t.minute)} ${t.period}`
}

export { pad }
