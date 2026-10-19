import { NavLink, Outlet } from 'react-router-dom'
import { AlignLeft, BarChart3, LayoutGrid, Settings, User, Vote, Wallet } from 'lucide-react'
import { useAuth } from '../store/auth'
import Topbar from './Topbar'
import ProductTour from './ProductTour'

const links = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true, tour: 'overview' },
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
      </div>
      <span className="font-display text-xl font-bold">BallotPolls</span>
    </div>
  )
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 whitespace-nowrap rounded-[10px] px-3 py-3 text-[15px] ${isActive ? 'bg-white/[0.12] font-semibold text-white' : 'text-[#c5d3cc] hover:bg-white/[0.06]'}`

export default function Layout() {
  const org = useAuth((s) => s.user?.organisation)
  const showTour = useAuth((s) => s.user?.showTour)
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {showTour && <ProductTour />}
      <aside className="flex shrink-0 flex-col gap-6 bg-ink px-4 py-6 text-[#e8efeb] md:sticky md:top-0 md:h-screen md:w-60 md:self-start md:overflow-y-auto">
        <div className="px-2">
          <Logo />
        </div>
        <div className="rounded-[10px] bg-white/[0.07] px-3 py-2.5">
          <div className="text-xs text-[#a9bbb3]">Organisation</div>
          <div className="mt-0.5 truncate font-semibold">{org?.name}</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={navClass} data-tour={l.tour}>
              <l.icon size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/settings" className={(s) => `${navClass(s)} md:mt-auto`}>
          <Settings size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
          Settings
        </NavLink>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
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
