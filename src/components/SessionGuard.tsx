import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Clock } from 'lucide-react'
import { useAuth } from '../store/auth'
import { useNotifications } from '../store/notifications'
import { toast } from '../store/toast'
import { Button } from './ui'

// How long before the session ends the warning appears.
const WARN_MS = Number(import.meta.env.VITE_SESSION_WARN_MINUTES ?? 5) * 60_000
const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Five minutes before the session ends, asks whether to stay signed in or log out. The session is never
// extended silently: only an explicit "Stay logged in" renews it. Renders nothing the rest of the time.
export default function SessionGuard() {
  const signedIn = useAuth((s) => Boolean(s.user))
  const expiresIso = useAuth((s) => s.user?.sessionExpiresAt)
  const extendSession = useAuth((s) => s.extendSession)
  const refresh = useAuth((s) => s.refresh)
  const logout = useAuth((s) => s.logout)
  const resetNotifications = useNotifications((s) => s.reset)
  const expiresAt = expiresIso ? Date.parse(expiresIso) : null

  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const checkedFor = useRef<number | null>(null)
  const stayBtn = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  // One tick a second while signed in, so the countdown and the expiry are exact.
  useEffect(() => {
    if (!expiresAt) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [expiresAt])

  const left = expiresAt ? expiresAt - now : null
  const expired = left !== null && left <= 0
  const warning = left !== null && left > 0 && left <= WARN_MS

  // Time ran out: sign out here and say why. (The server already refuses the old session.)
  useEffect(() => {
    if (!expired) return
    ;(async () => {
      await logout().catch(() => {})
      resetNotifications()
      toast.info('Your session has expired', 'Please sign in again to continue.')
    })()
  }, [expired, logout, resetNotifications])

  // Another tab may have renewed the session. Ask the server once before bothering the person.
  useEffect(() => {
    if (warning && checkedFor.current !== expiresAt) {
      checkedFor.current = expiresAt
      refresh()
    }
  }, [warning, expiresAt, refresh])

  // Move focus into the dialog when it opens and give it back when it closes.
  useEffect(() => {
    if (warning) {
      returnFocus.current = document.activeElement as HTMLElement | null
      stayBtn.current?.focus()
    } else if (returnFocus.current) {
      returnFocus.current.focus?.()
      returnFocus.current = null
    }
  }, [warning])

  if (!signedIn || !warning || left === null) return null

  const stay = async () => {
    setBusy(true)
    try {
      await extendSession()
      toast.success('You are still signed in')
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const leave = async () => {
    await logout()
    resetNotifications()
  }

  // Keep Tab inside the dialog; Escape is deliberately not a shortcut for either choice.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [])
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
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-ink/60 p-4">
      <div
        ref={dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-title"
        aria-describedby="session-desc"
        onKeyDown={onKeyDown}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fdf1d6] text-[#8a5d00]">
          <Clock size={24} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <h2 id="session-title" className="mt-4 font-display text-2xl font-bold tracking-tight">
          Your session is about to expire
        </h2>
        <p id="session-desc" className="mt-2 text-[15px] leading-relaxed text-muted">
          For your security, sessions end automatically after a set time. Do you want to stay logged in?
        </p>
        <div role="timer" aria-live="off" className="mt-4 flex items-baseline justify-between rounded-xl bg-ground px-4 py-3">
          <span className="text-sm text-muted">Signing you out in</span>
          <span className="font-display text-2xl font-bold tabular-nums">{mmss(left)}</span>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={leave} disabled={busy}>
            Log out
          </Button>
          <Button ref={stayBtn} onClick={stay} disabled={busy}>
            {busy ? 'Extending…' : 'Stay logged in'}
          </Button>
        </div>
      </div>
    </div>
  )
}
