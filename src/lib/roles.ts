import type { Role, TeamRole } from './api'

// What each team role is called and does. The organiser (orgadmin) can do everything and invites the others.
export const ROLE_INFO: Record<Role, { label: string; description: string }> = {
  superadmin: { label: 'BallotPolls admin', description: 'Runs the platform.' },
  orgadmin: { label: 'Organisation admin', description: 'Full access, including team and withdrawals.' },
  results_checker: { label: 'Results Checker', description: 'Can only view live results (no revenue).' },
  electoral_commission: { label: 'Electoral Commission', description: 'Can create and manage elections, candidates and categories (no revenue).' },
}

export const TEAM_ROLE_OPTIONS: { value: TeamRole; label: string }[] = [
  { value: 'electoral_commission', label: ROLE_INFO.electoral_commission.label },
  { value: 'results_checker', label: ROLE_INFO.results_checker.label },
]

// The pages of the organiser dashboard each role may open. A page is allowed when its path is, or starts with, one of these.
const PAGES: Record<string, string[]> = {
  orgadmin: ['/dashboard', '/elections', '/candidates', '/categories', '/results', '/withdrawals', '/settings'],
  electoral_commission: ['/elections', '/candidates', '/categories', '/settings'],
  results_checker: ['/results', '/settings'],
}

export const canOpen = (role: Role, pathname: string) =>
  (PAGES[role] ?? PAGES.orgadmin).some((p) => pathname === p || pathname.startsWith(`${p}/`))

// Where a role lands after signing in, and where it is sent when it asks for a page it may not open.
export const homeFor = (role: Role) => (role === 'superadmin' ? '/admin' : role === 'results_checker' ? '/results' : role === 'electoral_commission' ? '/elections' : '/dashboard')
