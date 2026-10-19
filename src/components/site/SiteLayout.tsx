import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BarChart3, ChevronDown, LayoutGrid, LogOut, Mail, Settings } from 'lucide-react'
import WhatsAppIcon from './WhatsAppIcon'
import { Logo } from '../Layout'
import { useAuth } from '../../store/auth'
import { useNotifications } from '../../store/notifications'
import { Avatar } from '../ui'
import { useDismiss } from '../../lib/useDismiss'
import { SUPPORT_EMAIL, WHATSAPP_URL } from '../../lib/site'

const link = 'inline-flex min-h-11 items-center rounded-[10px] px-3.5 text-[15px] hover:bg-ground'
const linkOn = ({ isActive }: { isActive: boolean }) => `${link} ${isActive ? 'bg-brand-tint font-semibold text-[#0b5a43] hover:bg-brand-tint' : 'text-ink'}`

// The public website's frame: header with Home, Elections and a Contact menu, and a footer. Pages go in the middle.
export default function SiteLayout() {
  const user = useAuth((s) => s.user)
  const { pathname } = useLocation()

  // Each new page starts at the top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[10px] focus:bg-white focus:px-4 focus:py-3 focus:font-semibold">
        Skip to content
      </a>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex min-h-[76px] max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-2 md:px-8">
          <Link to="/" aria-label="Tally home" className="text-ink">
            <Logo />
          </Link>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
            <NavLink to="/" end className={linkOn}>
              Home
            </NavLink>
            <NavLink to="/events" className={linkOn}>
              Elections
            </NavLink>
            <NavLink to="/verify" className={linkOn}>
              Verify payment
            </NavLink>
            <ContactMenu />
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <SiteProfileMenu />
            ) : (
              <>
                <Link to="/login" className="inline-flex min-h-11 items-center rounded-[10px] px-4 text-[15px] font-semibold text-ink hover:bg-ground">
                  Sign in
                </Link>
                <Link to="/register" className="inline-flex min-h-11 items-center rounded-[10px] bg-brand px-5 text-[15px] font-semibold text-white hover:bg-brand-dark">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-ink text-[#b7c7bf]">
        <div className="mx-auto max-w-[1200px] px-5 pb-8 pt-12 md:px-8">
          <div className="flex flex-wrap justify-between gap-8">
            <div className="max-w-sm">
              <div className="text-white">
                <Logo />
              </div>
              <p className="mt-3.5 text-[15px] leading-relaxed">Run an election anyone can vote in from a basic phone. Voters dial a short code and pay by mobile money.</p>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap content-start gap-x-7 gap-y-2 text-[15px]">
              <Link to="/" className="text-[#e8efeb] hover:underline">Home</Link>
              <Link to="/events" className="text-[#e8efeb] hover:underline">Elections</Link>
              <Link to="/verify" className="text-[#e8efeb] hover:underline">Verify payment</Link>
              {SUPPORT_EMAIL && <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#e8efeb] hover:underline">Email us</a>}
              {WHATSAPP_URL && (
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-[#e8efeb] hover:underline">
                  WhatsApp
                </a>
              )}
              <Link to="/login" className="text-[#e8efeb] hover:underline">Sign in</Link>
              <Link to="/register" className="text-[#e8efeb] hover:underline">Register</Link>
            </nav>
          </div>
          <div className="mt-9 border-t border-white/15 pt-5 text-[13px]">Developed by Jesta Digital Solutions</div>
        </div>
      </footer>
    </div>
  )
}

// "Contact" with a small menu: email and WhatsApp. An option only shows if its setting is filled in; with neither, the
// whole menu is left out rather than showing a dead button.
function ContactMenu() {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, wrap, close)

  useEffect(() => {
    if (open) wrap.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }, [open])

  if (!SUPPORT_EMAIL && !WHATSAPP_URL) return null

  const onKey = (e: KeyboardEvent) => {
    const items = Array.from(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(i + 1) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i - 1 + items.length) % items.length]?.focus()
    } else if (e.key === 'Escape') {
      close()
      trigger.current?.focus()
    } else if (e.key === 'Tab') close()
  }

  const row = 'flex min-h-12 items-center gap-3 rounded-[10px] px-3 text-[15px] text-ink hover:bg-ground focus-visible:bg-ground focus-visible:outline-none'
  return (
    <div ref={wrap} className="relative">
      <button ref={trigger} type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`${link} gap-1.5 text-ink`}>
        Contact
        <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" aria-label="Contact" onKeyDown={onKey} className="absolute left-0 top-full z-40 mt-2 w-56 rounded-[14px] border border-line bg-white p-1.5 shadow-xl shadow-ink/15">
          {SUPPORT_EMAIL && (
            <a role="menuitem" href={`mailto:${SUPPORT_EMAIL}`} onClick={close} className={row}>
              <Mail size={18} strokeWidth={1.8} aria-hidden="true" className="text-brand" />
              Email
            </a>
          )}
          {WHATSAPP_URL && (
            <a role="menuitem" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" onClick={close} className={row}>
              <WhatsAppIcon size={18} className="text-[#25D366]" />
              WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// For someone who is signed in: their name and picture, opening a menu back into the account (dashboard, live results,
// settings) and a way to sign out, without leaving the public website.
function SiteProfileMenu() {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const resetNotifications = useNotifications((s) => s.reset)
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, wrap, close)

  useEffect(() => {
    if (open) wrap.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }, [open])

  if (!user) return null

  const onKey = (e: KeyboardEvent) => {
    const items = Array.from(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(i + 1) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i - 1 + items.length) % items.length]?.focus()
    } else if (e.key === 'Escape') {
      close()
      trigger.current?.focus()
    } else if (e.key === 'Tab') close()
  }

  const row = 'flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[15px] text-ink hover:bg-ground focus:bg-ground focus:outline-none'
  const icon = 'text-muted'
  const links = [
    { to: '/dashboard', label: 'Dashboard', Icon: LayoutGrid },
    { to: '/results', label: 'Live results', Icon: BarChart3 },
    { to: '/settings', label: 'Settings', Icon: Settings },
  ]

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}`}
        onClick={() => setOpen((o) => !o)}
        className={`flex min-h-11 items-center gap-2.5 rounded-[10px] py-0 pl-1.5 pr-2 text-left ${open ? 'bg-brand-tint' : 'hover:bg-ground'}`}
      >
        <Avatar name={user.name} size={34} />
        <span className="hidden text-sm font-semibold sm:block">{user.firstName || user.name}</span>
        <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" aria-label="Account" onKeyDown={onKey} className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-[14px] border border-line bg-white shadow-xl shadow-ink/15">
          <div className="flex items-center gap-3 border-b border-[#eef2f0] px-[18px] py-4">
            <Avatar name={user.name} size={44} />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold">{user.name}</div>
              <div className="truncate text-[13px] text-muted">{user.email}</div>
            </div>
          </div>
          <div className="p-1.5">
            {links.map(({ to, label, Icon }) => (
              <Link key={to} role="menuitem" to={to} onClick={close} className={row}>
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" className={icon} />
                {label}
              </Link>
            ))}
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
              <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
