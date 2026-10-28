import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, CalendarDays, Coins, Radio, Vote, Wallet } from 'lucide-react'
import { api, type AdminStats } from '../../lib/api'
import { Card, EmptyState, LinkButton, PageHeader } from '../../components/ui'
import { Loading, Skeleton, StatCardsSkeleton } from '../../components/Loading'
import { PaymentChip } from '../../components/admin/parts'
import { formatDateTime, ghs } from '../../lib/format'
import { toast } from '../../store/toast'

// 2026-10-28 -> 28 Oct
const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null)

  useEffect(() => {
    api
      .get<AdminStats>('/admin/stats')
      .then((r) => setStats(r.data))
      .catch((e) => toast.fromError(e))
  }, [])

  const cards = stats && [
    { label: 'Revenue', value: ghs(stats.revenue), icon: Coins },
    { label: 'Votes cast', value: stats.votes.toLocaleString(), icon: Vote },
    { label: 'Organisations', value: String(stats.organisations), icon: Building2, note: stats.suspendedOrganisations ? `${stats.suspendedOrganisations} suspended` : undefined },
    { label: 'Live elections', value: String(stats.liveElections), icon: Radio, note: `${stats.elections} in total` },
  ]
  // Y axis: round the top up to a tidy number (1, 2, 5 times a power of ten per step) so the labels read cleanly.
  const peak = Math.max(1, ...(stats?.series.map((d) => d.votes) ?? []))
  const rough = peak / 4
  const mag = 10 ** Math.floor(Math.log10(rough))
  const step = Math.max(1, ([1, 2, 5, 10].find((m) => m * mag >= rough) ?? 10) * mag)
  const top = step * 4
  const ticks = [4, 3, 2, 1, 0].map((i) => i * step)

  return (
    <>
      <PageHeader title="Platform overview" subtitle="Every organisation, election and payment on BallotPolls." />

      {stats && stats.pendingWithdrawals > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#fcefd0] px-4 py-3.5 text-[#6b4300]">
          <span className="flex items-center gap-2.5 text-[15px] font-medium">
            <Wallet size={18} strokeWidth={1.8} aria-hidden="true" />
            {stats.pendingWithdrawals} withdrawal{stats.pendingWithdrawals > 1 ? 's' : ''} waiting for approval · {ghs(stats.pendingWithdrawalsAmount)}
          </span>
          <LinkButton to="/admin/withdrawals" variant="secondary" className="min-h-9 px-4 text-sm">
            Review
          </LinkButton>
        </div>
      )}

      {!cards ? (
        <Loading label="Loading figures">
          <StatCardsSkeleton />
        </Loading>
      ) : (
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm text-muted">{s.label}</div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                  <s.icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
              </div>
              <div className="mt-1 font-display text-3xl font-bold tracking-tight">{s.value}</div>
              {s.note && <div className="mt-1 text-sm text-muted">{s.note}</div>}
            </Card>
          ))}
        </section>
      )}

      <Card>
        <h2 className="mb-1 font-display text-xl font-bold">Votes in the last 14 days</h2>
        <p className="mb-5 text-sm text-muted">Counted votes per day.</p>
        {!stats ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <div
            role="img"
            aria-label={`Votes per day for the last 14 days: ${stats.series.map((d) => `${d.date} ${d.votes}`).join(', ')}`}
            className="flex gap-3"
          >
            {/* Y axis: the vote counts the gridlines stand for. */}
            <div className="flex w-10 shrink-0 flex-col justify-between pb-7 text-right text-xs tabular-nums text-muted" aria-hidden="true">
              {ticks.map((t) => (
                <span key={t} className="-my-2 leading-4">
                  {t.toLocaleString()}
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="relative h-52">
                {ticks.map((t, i) => (
                  <div key={t} className="absolute inset-x-0 border-t border-line" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} aria-hidden="true" />
                ))}
                <div className="relative flex h-full items-end gap-1 sm:gap-2">
                  {stats.series.map((d) => (
                    <div key={d.date} className="flex h-full flex-1 items-end" title={`${dayLabel(d.date)}: ${d.votes.toLocaleString()} votes · ${ghs(d.revenue)}`}>
                      <div className="w-full rounded-t-md bg-brand" style={{ height: `${Math.max(d.votes ? 2 : 0.5, (d.votes / top) * 100)}%`, opacity: d.votes ? 1 : 0.25 }} />
                    </div>
                  ))}
                </div>
              </div>
              {/* X axis: one date under every bar on wide screens, every other one on phones. */}
              <div className="mt-2 flex gap-1 sm:gap-2" aria-hidden="true">
                {stats.series.map((d, i) => (
                  <span key={d.date} className={`min-w-0 flex-1 text-center text-[11px] leading-4 text-muted sm:text-xs ${i % 2 ? 'invisible sm:visible' : ''}`}>
                    {dayLabel(d.date)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Latest payments</h2>
          <Link to="/admin/payments" className="text-sm font-semibold text-brand hover:underline">
            View all
          </Link>
        </div>
        {stats && stats.recentPayments.length === 0 && (
          <EmptyState size="sm" icon={CalendarDays} title="No payments yet">
            Payments appear here as voters pay.
          </EmptyState>
        )}
        <ul>
          {stats?.recentPayments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line py-3 first:border-t-0">
              <div className="min-w-0 flex-1 basis-56">
                <div className="truncate text-sm font-semibold">{p.election ?? p.reference}</div>
                <div className="text-xs text-muted">{p.reference}</div>
              </div>
              <div className="text-sm text-muted sm:w-44">{formatDateTime(p.createdAt)}</div>
              <div className="ml-auto flex items-center gap-4 sm:w-52 sm:justify-end">
                <span className="text-sm font-semibold">{ghs(p.amount)}</span>
                <PaymentChip status={p.status} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
