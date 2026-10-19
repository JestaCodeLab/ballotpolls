import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { PublicCandidate, PublicElection } from '../../lib/api'
import ElectionCover from '../ElectionCover'
import { StatusChip } from '../ui'
import { formatRange, ghs, initials, tone } from '../../lib/format'

// A card for one election in a grid: cover, status, dates, price and the event code. The whole card is the link.
export function EventCard({ e }: { e: PublicElection }) {
  return (
    <Link to={`/events/${e.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink transition-shadow hover:shadow-lg">
      <div className="relative">
        <ElectionCover src={e.coverImageUrl} name={e.name} className="aspect-video w-full" />
        <span className="absolute left-3.5 top-3.5">
          <StatusChip status={e.status} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-xl font-bold leading-snug tracking-tight group-hover:underline">{e.name}</h3>
        <p className="text-sm text-muted">{formatRange(e.startsAt, e.endsAt)}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-sm">
          <span className="font-semibold">{ghs(e.pricePerVote)} per vote</span>
          <span className="rounded-md bg-accent px-2 py-0.5 text-[13px] font-bold tracking-wider text-ink">{e.eventCode}</span>
        </div>
      </div>
    </Link>
  )
}

// A candidate's picture: their photo, or their initials on a soft colour when there is none.
export function CandidatePhoto({ name, src, className = '' }: { name: string; src?: string; className?: string }) {
  return src ? (
    <img src={src} alt={`Photo of ${name}`} loading="lazy" className={`bg-[#e6ede9] object-cover object-top ${className}`} />
  ) : (
    <div role="img" aria-label={`No photo for ${name}`} className={`flex items-center justify-center font-display font-bold text-ink/50 ${tone(name)} ${className}`}>
      {initials(name)}
    </div>
  )
}

// A candidate in a grid: photo, name and their vote code. Links to the candidate's own page.
export function CandidateCard({ electionSlug, c, showVotes = true }: { electionSlug: string; c: PublicCandidate; showVotes?: boolean }) {
  return (
    <Link to={`/events/${electionSlug}/candidates/${c.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink transition-shadow hover:shadow-lg">
      <CandidatePhoto name={c.name} src={c.imageUrl} className="aspect-[4/3] w-full text-5xl" />
      <div className="flex flex-col gap-2.5 px-4 pb-4 pt-3.5">
        <h3 className="text-[17px] font-semibold leading-snug group-hover:underline">{c.name}</h3>
        <div className="flex items-end justify-between gap-3">
          {showVotes ? (
            <div>
              <div className="font-display text-[28px] font-bold leading-none tracking-tight text-[#0b5a43]">{c.votes.toLocaleString()}</div>
              <div className="mt-1 text-xs font-medium text-muted">{c.votes === 1 ? 'vote' : 'votes'}</div>
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2 text-[13px] text-muted">
            Code <span className="rounded-lg bg-ground px-2.5 py-0.5 text-base font-bold text-ink">{String(c.code).padStart(2, '0')}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// A label and a date in a small green icon tile: "Voting opens" / "12 Oct 2026, 9:00 AM".
export function DateTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-tint text-brand">{icon}</span>
      <div>
        <div className="text-[13px] text-muted">{label}</div>
        <div className="font-semibold">{value}</div>
      </div>
    </div>
  )
}

export function Section({ className = '', children }: { className?: string; children: ReactNode }) {
  return <section className={`mx-auto w-full max-w-[1200px] px-5 md:px-8 ${className}`}>{children}</section>
}

export function EventGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading elections" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white" aria-hidden="true">
          <div className="skeleton aspect-video w-full" />
          <div className="space-y-3 p-5">
            <div className="skeleton h-6 w-3/4 rounded-lg" />
            <div className="skeleton h-4 w-2/3 rounded-lg" />
            <div className="skeleton h-5 w-1/2 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
