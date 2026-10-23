import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AlignLeft, BarChart3, LayoutGrid, Settings, User, Vote, Wallet, X } from 'lucide-react'
import { useAuth } from '../store/auth'
import Topbar from './Topbar'
import ProductTour from './ProductTour'
import InstallBanner from './InstallBanner'
import { useDashboardTitle } from '../lib/useDashboardTitle'

// Tab titles for the organiser dashboard.
const TITLES: [string, string][] = [
  ['/dashboard', 'Overview'],
  ['/elections', 'Elections'],
  ['/elections/new', 'New election'],
  ['/candidates', 'Candidates'],
  ['/candidates/new', 'Add candidate'],
  ['/categories', 'Categories'],
  ['/results', 'Live results'],
  ['/withdrawals', 'Withdrawals'],
  ['/settings', 'Settings'],
]

const links = [
  { to: '/dashboard', label: 'Overview', icon: LayoutGrid, end: true, tour: 'overview' },
  { to: '/elections', label: 'Elections', icon: Vote, tour: 'elections' },
  { to: '/candidates', label: 'Candidates', icon: User, tour: 'candidates' },
  { to: '/categories', label: 'Categories', icon: AlignLeft, tour: 'categories' },
  { to: '/results', label: 'Live results', icon: BarChart3, tour: 'results' },
  { to: '/withdrawals', label: 'Withdrawals', icon: Wallet, tour: 'withdrawals' },
]

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-ink">
        <Vote size={19} strokeWidth={2.2} aria-hidden="true" />
      </div>
      <span className="font-display text-xl font-bold">BallotPolls</span>
    </div>
  )
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 whitespace-nowrap rounded-[10px] px-3 py-3 text-[15px] ${isActive ? 'bg-white/[0.12] font-semibold text-white' : 'text-[#c5d3cc] hover:bg-white/[0.06]'}`

// The menu: organisation, pages and Settings. Used twice: as the fixed sidebar on wide screens and inside the drawer
// that opens from the top bar on phones. Only the sidebar carries the product tour's markers.
function SidebarBody({ onNavigate, tour }: { onNavigate?: () => void; tour?: boolean }) {
  const org = useAuth((s) => s.user?.organisation)
  return (
    <>
      <div className="px-2">
        <Logo />
      </div>
      <div className="rounded-[10px] bg-white/[0.07] px-3 py-2.5">
        <div className="text-xs text-[#a9bbb3]">Organisation</div>
        <div className="mt-0.5 truncate font-semibold">{org?.name}</div>
      </div>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={navClass} onClick={onNavigate} data-tour={tour ? l.tour : undefined}>
            <l.icon size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
            {l.label}
          </NavLink>
        ))}
      </nav>
      <NavLink to="/settings" onClick={onNavigate} className={(s) => `${navClass(s)} mt-auto`}>
        <Settings size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
        Settings
      </NavLink>
    </>
  )
}

export default function Layout() {
  const showTour = useAuth((s) => s.user?.showTour)
  const { pathname } = useLocation()
  useDashboardTitle(TITLES)
  const [menuOpen, setMenuOpen] = useState(false)

  // Going to another page closes the phone menu. While it is open, Escape closes it and the page behind does not scroll.
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

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {showTour && <ProductTour />}
      <aside className="hidden shrink-0 flex-col gap-6 bg-ink px-4 py-6 text-[#e8efeb] md:sticky md:top-0 md:flex md:h-screen md:w-60 md:self-start md:overflow-y-auto">
        <SidebarBody tour />
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
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 px-5 py-8 md:px-10 md:py-9">
          <div className="flex flex-col gap-6">
            <InstallBanner />
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
