import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Building2, CalendarDays, ChevronDown, ChevronRight, CreditCard, LayoutGrid, LogOut, Menu, MessageSquare, Users, Wallet, X } from 'lucide-react'
import { useAuth } from '../../store/auth'
import { Logo } from '../Layout'
import { Avatar } from '../ui'
import { useDashboardTitle } from '../../lib/useDashboardTitle'

const TITLES: [string, string][] = [
  ['/admin', 'Overview'],
  ['/admin/organisations', 'Organisations'],
  ['/admin/users', 'Organisers'],
  ['/admin/elections', 'Elections'],
  ['/admin/payments', 'Payments'],
  ['/admin/withdrawals', 'Withdrawals'],
  ['/admin/sms/credit/return', 'Payment'],
  ['/admin/sms/credit', 'Buy credit'],
  ['/admin/sms/report', 'Delivery report'],
  ['/admin/sms', 'Send SMS'],
]

const links = [
  { to: '/admin', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/admin/organisations', label: 'Organisations', icon: Building2 },
  { to: '/admin/users', label: 'Organisers', icon: Users },
  { to: '/admin/elections', label: 'Elections', icon: CalendarDays },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: Wallet },
]

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 whitespace-nowrap rounded-[10px] px-3 py-3 text-[15px] ${isActive ? 'bg-white/[0.12] font-semibold text-white' : 'text-[#c5d3cc] hover:bg-white/[0.06]'}`

const smsLinks = [
  { to: '/admin/sms', label: 'Send SMS', end: true },
  { to: '/admin/sms/credit', label: 'Buy credit' },
  { to: '/admin/sms/report', label: 'Delivery report' },
]

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation()
  // The SMS menu is open while one of its pages is showing.
  const smsOpen = pathname.startsWith('/admin/sms')
  return (
    <>
      <div className="px-2">
        <Logo />
      </div>
      <div className="rounded-[10px] bg-white/[0.07] px-3 py-2.5">
        <div className="text-xs text-[#a9bbb3]">Signed in as</div>
        <div className="mt-0.5 font-semibold">Super admin</div>
      </div>
      <nav aria-label="Super admin" className="flex flex-col gap-1">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={navClass} onClick={onNavigate}>
            <l.icon size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
            {l.label}
          </NavLink>
        ))}
        <NavLink to="/admin/sms" onClick={onNavigate} aria-expanded={smsOpen} className={() => navClass({ isActive: smsOpen })}>
          <MessageSquare size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
          <span className="flex-1">SMS</span>
          {smsOpen ? <ChevronDown size={16} strokeWidth={2} aria-hidden="true" /> : <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />}
        </NavLink>
        {smsOpen &&
          smsLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={onNavigate}
              className={({ isActive }) => `ml-[21px] block border-l-2 py-2.5 pl-5 pr-3 text-sm ${isActive ? 'border-accent font-semibold text-white' : 'border-transparent text-[#c5d3cc] hover:text-white'}`}
            >
              {l.label}
            </NavLink>
          ))}
      </nav>
    </>
  )
}

export default function AdminLayout() {
  const user = useAuth((s) => s.user)!
  const logout = useAuth((s) => s.logout)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  useDashboardTitle(TITLES, 'BallotPolls Admin')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', onKey)
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = before
    }
  }, [menuOpen])

  const signOut = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden shrink-0 flex-col gap-6 bg-ink px-4 py-6 text-[#e8efeb] md:sticky md:top-0 md:flex md:h-screen md:w-60 md:self-start md:overflow-y-auto">
        <SidebarBody />
      </aside>
      {menuOpen && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[55] md:hidden">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-ink px-4 py-6 text-[#e8efeb] shadow-2xl">
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-[10px] text-[#c5d3cc] hover:bg-white/[0.08]">
              <X size={20} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <SidebarBody onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b border-line bg-white px-3 sm:gap-4 md:px-10">
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-ink hover:bg-ground md:hidden">
            <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1 truncate text-sm font-semibold text-muted">BallotPolls administration</div>
          <div className="flex items-center gap-2">
            <Avatar name={user.name} size={34} />
            <span className="hidden text-sm font-semibold sm:block">{user.name}</span>
            <button type="button" onClick={signOut} className="flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-sm font-semibold text-ink hover:bg-ground">
              <LogOut size={17} strokeWidth={1.8} aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
              <span className="sr-only sm:hidden">Sign out</span>
            </button>
          </div>
        </div>
        <main className="flex-1 px-5 py-8 md:px-10 md:py-9">
          <div className="flex flex-col gap-6">
            <Outlet />
          </div>
        </main>
        <footer className="mt-12 border-t border-line bg-white px-5 py-6 text-center text-[13px] text-muted md:px-10">
          Powered by Jesta Digital Solutions · {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  )
}
