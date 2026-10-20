import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CheckCheck, Menu } from 'lucide-react'
import { useAuth } from '../store/auth'
import { useNotifications } from '../store/notifications'
import { useDismiss } from '../lib/useDismiss'
import { timeAgo } from '../lib/format'
import type { AppNotification } from '../lib/api'
import { Avatar, EmptyState } from './ui'

const SECTIONS: [path: string, title: string][] = [
  ['/elections', 'Elections'],
  ['/candidates', 'Candidates'],
  ['/categories', 'Categories'],
  ['/results', 'Live results'],
  ['/withdrawals', 'Withdrawals'],
  ['/settings', 'Settings'],
]

// The page's place in the app: its section, plus the page inside it when there is one
// (Elections / New election). The section links back to its list.
const breadcrumb = (path: string): { section: string; to?: string; page?: string } => {
  const hit = SECTIONS.find(([p]) => path === p || path.startsWith(`${p}/`))
  if (!hit) return { section: 'Overview' }
  const [base, section] = hit
  const rest = path.slice(base.length).split('/').filter(Boolean)
  if (rest.length === 0) return { section }
  let page: string | undefined
  if (base === '/elections') {
    page = rest[0] === 'new' ? 'New election' : rest[1] === 'edit' ? 'Edit election' : rest[1] === 'candidates' ? 'Add candidates' : 'Election'
  } else if (base === '/candidates') {
    page = rest[0] === 'new' ? 'Add candidate' : 'Edit candidate'
  }
  return page ? { section, to: base, page } : { section }
}

const POLL_MS = 60_000

export default function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { pathname } = useLocation()
  const org = useAuth((s) => s.user?.organisation?.name)
  const crumb = breadcrumb(pathname)

  return (
    <div className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b border-line bg-white px-3 sm:gap-4 md:px-10">
      {/* On phones the sidebar is a drawer, opened from here. */}
      <button type="button" onClick={onMenu} aria-label="Open menu" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-ink hover:bg-ground md:hidden">
        <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1 truncate text-sm text-muted">
        <span className="hidden sm:inline">
          {org} <span aria-hidden="true">/</span>{' '}
        </span>
        {crumb.page ? (
          <>
            <Link to={crumb.to!} className="hover:text-ink hover:underline">
              {crumb.section}
            </Link>{' '}
            <span aria-hidden="true">/</span>{' '}
            <strong aria-current="page" className="font-semibold text-ink">
              {crumb.page}
            </strong>
          </>
        ) : (
          <strong aria-current="page" className="font-semibold text-ink">
            {crumb.section}
          </strong>
        )}
      </nav>
      <div className="flex items-center gap-2">
        <NotificationsMenu />
        <span aria-hidden="true" className="mx-1.5 h-7 w-px bg-line" />
        <ProfileMenu />
      </div>
    </div>
  )
}

/* ---------------- Notifications ---------------- */

const kindStyle: Record<AppNotification['kind'], string> = {
  success: 'bg-brand text-white',
  warning: 'bg-danger text-white',
  info: 'bg-accent text-ink',
}

function KindIcon({ kind }: { kind: AppNotification['kind'] }) {
  const p = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (kind === 'success') return <svg {...p}><path d="M5 12.5l4.5 4.5L19 7" /></svg>
  if (kind === 'warning') return <svg {...p}><path d="M12 6v8M12 18h.01" /></svg>
  return <svg {...p}><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l2.5 1.5" /></svg>
}

function NotificationsMenu() {
  const { items, unreadCount, load, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, wrap, close)

  useEffect(() => {
    load()
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [load])

  // Escape should hand focus back to the bell.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && trigger.current?.focus()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o)
          if (!open) load()
        }}
        className={`relative flex h-11 w-11 items-center justify-center rounded-[10px] ${open ? 'bg-brand-tint text-[#0b5a43]' : 'text-ink hover:bg-ground'}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6M10 19a2 2 0 004 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-[7px] top-[7px] flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-ink">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-full z-40 mt-2 w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-[14px] border border-line bg-white shadow-xl shadow-ink/15">
          <div className="flex items-center justify-between border-b border-[#eef2f0] py-1.5 pl-[18px] pr-2">
            <h2 className="font-display text-lg font-bold">Notifications</h2>
            <button type="button" onClick={markAllRead} disabled={unreadCount === 0} className="min-h-11 rounded-[10px] px-2.5 text-[13px] font-semibold text-brand hover:bg-brand-tint disabled:text-muted disabled:hover:bg-transparent">
              Mark all as read
            </button>
          </div>
          {items.length === 0 ? (
            <EmptyState size="sm" icon={CheckCheck} title="You are all caught up">
              New activity will show up here.
            </EmptyState>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="border-t border-[#eef2f0] first:border-t-0">
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className={`flex w-full items-start gap-3 px-[18px] py-3.5 text-left ${n.read ? 'bg-white' : 'bg-[#f4f9f6]'} hover:bg-ground`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${kindStyle[n.kind]}`}>
                      <KindIcon kind={n.kind} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm leading-snug ${n.read ? 'font-medium' : 'font-semibold'}`}>{n.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">{timeAgo(n.createdAt)}</span>
                    </span>
                    {!n.read && <span role="img" aria-label="Unread" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------- Profile ---------------- */

function ProfileMenu() {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const resetNotifications = useNotifications((s) => s.reset)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, wrap, close)

  const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])

  useEffect(() => {
    if (open) items()[0]?.focus()
  }, [open])

  const onMenuKey = (e: React.KeyboardEvent) => {
    const list = items()
    const i = list.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      list[(i + 1) % list.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      list[(i - 1 + list.length) % list.length]?.focus()
    } else if (e.key === 'Escape') {
      close()
      trigger.current?.focus()
    } else if (e.key === 'Tab') {
      close()
    }
  }

  const go = (hash: string) => {
    close()
    navigate({ pathname: '/settings', hash })
  }

  if (!user) return null
  const row = 'flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[15px] hover:bg-ground focus:bg-ground focus:outline-none'
  const icon = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex min-h-11 items-center gap-2.5 rounded-[10px] py-0 pl-1.5 pr-2 text-left ${open ? 'bg-brand-tint' : 'hover:bg-ground'}`}
      >
        <Avatar name={user.name} size={34} />
        <span className="hidden leading-tight sm:block">
          <span className="block text-sm font-semibold">{user.name}</span>
          <span className="block text-xs text-muted">Organisation admin</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b6b65" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={open ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
        </svg>
      </button>

      {open && (
        <div ref={menu} role="menu" aria-label="Profile" onKeyDown={onMenuKey} className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-[14px] border border-line bg-white shadow-xl shadow-ink/15">
          <div className="flex items-center gap-3 border-b border-[#eef2f0] px-[18px] py-4">
            <Avatar name={user.name} size={44} />
            <div className="min-w-0">
              <div className="text-[15px] font-semibold">{user.name}</div>
              <div className="truncate text-[13px] text-muted">{user.email}</div>
            </div>
          </div>
          <div className="p-1.5">
            <button role="menuitem" type="button" onClick={() => go('#profile')} className={row}>
              <svg {...icon} className="text-muted"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>
              Profile settings
            </button>
            <button role="menuitem" type="button" onClick={() => go('#organisation')} className={row}>
              <svg {...icon} className="text-muted"><path d="M4 20V8l8-4 8 4v12M9 20v-6h6v6" /></svg>
              Organisation
            </button>
            <Link role="menuitem" to="/" onClick={close} className={row}>
              <svg {...icon} className="text-muted"><path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z" /></svg>
              Go to homepage
            </Link>
          </div>
          <div className="border-t border-[#eef2f0] p-1.5">
            <button
              role="menuitem"
              type="button"
              onClick={async () => {
                close()
                await logout()
                resetNotifications()
              }}
              className={`${row} font-semibold text-danger`}
            >
              <svg {...icon}><path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" /></svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
