import { formatShortDate, formatTime, pad, toISODate } from './datetime'

export const ghs = (n: number) => `GHS ${n.toFixed(2)}`

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

// "19 Oct 2026, 9:00 AM": the same wording the date and time pickers use, in the viewer's local time.
export const formatDateTime = (iso: string) => {
  const d = new Date(iso)
  return `${formatShortDate(toISODate(d))}, ${formatTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`)}`
}

export const formatRange = (a: string, b: string) => `${formatDateTime(a)} to ${formatDateTime(b)}`

// <input type="datetime-local"> works in local time without a zone.
export const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const fromLocalInput = (value: string) => new Date(value).toISOString()

// A candidate's number as voters see it: "2", not "02".
export const codeLabel = (n: number) => String(n)

const TONES = ['bg-[#d6e8df]', 'bg-[#f6e2b8]', 'bg-[#dce3f2]', 'bg-[#f0d8d2]']
export const tone = (key: string) => TONES[[...key].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length]

export const timeAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return formatDateTime(iso)
}

// "2d 06h 14m" until a moment, never below zero.
export const formatCountdown = (ms: number) => {
  const mins = Math.max(0, Math.floor(ms / 60000))
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  return `${d ? `${d}d ` : ''}${String(h).padStart(2, '0')}h ${String(mins % 60).padStart(2, '0')}m`
}
