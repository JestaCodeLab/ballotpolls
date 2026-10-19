import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './Layout'
import { useSeo } from '../lib/useSeo'

export default function AuthShell({ mode, children }: { mode?: 'login' | 'register'; children: ReactNode }) {
  // Sign-in, register and reset pages are not for search results.
  useSeo({ title: 'Sign in | Tally', description: 'Sign in to Tally.', noindex: true })
  const tab = (active: boolean) =>
    `flex min-h-11 flex-1 items-center justify-center rounded-[9px] text-[15px] font-semibold ${active ? 'bg-white text-ink shadow-sm' : 'text-muted'}`
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <section className="flex flex-1 flex-col justify-between gap-12 bg-ink p-8 text-[#e8efeb] lg:p-14">
        <Link to="/" aria-label="Tally home" className="w-fit rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          <Logo />
        </Link>
        <div>
          <h2 className="max-w-lg font-display text-4xl font-bold leading-[1.05] tracking-tight lg:text-[52px]">
            Run an election anyone can vote in from a basic phone.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-[#b7c7bf]">
            Set up categories and candidates, open voting for a set window, and watch results come in live. Voters dial a
            short code and pay by mobile money.
          </p>
        </div>
        <div className="hidden flex-wrap gap-7 text-sm text-[#b7c7bf] lg:flex">
          {['USSD voting', 'Mobile money payments', 'Live results'].map((t) => (
            <span key={t} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent" />
              {t}
            </span>
          ))}
        </div>
      </section>
      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {mode && (
            <div role="tablist" className="mb-7 flex gap-1 rounded-xl bg-[#e6ede9] p-1">
              <Link to="/login" role="tab" aria-selected={mode === 'login'} className={tab(mode === 'login')}>
                Sign in
              </Link>
              <Link to="/register" role="tab" aria-selected={mode === 'register'} className={tab(mode === 'register')}>
                Register
              </Link>
            </div>
          )}
          {children}
        </div>
      </section>
    </div>
  )
}
