import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, CalendarDays, Coins, Radio, Vote, Wallet } from 'lucide-react'
import { api, type AdminStats } from '../../lib/api'
import { Card, EmptyState, LinkButton, PageHeader } from '../../components/ui'
import { Loading, Skeleton, StatCardsSkeleton } from '../../components/Loading'
import { PaymentChip } from '../../components/admin/parts'
import { formatDateTime, ghs } from '../../lib/format'
import { toast } from '../../store/toast'

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
  const max = Math.max(1, ...(stats?.series.map((d) => d.votes) ?? []))

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

      <section className="grid items-start gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-1 font-display text-xl font-bold">Votes in the last 14 days</h2>
          <p className="mb-5 text-sm text-muted">Counted votes per day.</p>
          {!stats ? (
            <Skeleton className="h-44 w-full" />
          ) : (
            <div
              role="img"
              aria-label={`Votes per day for the last 14 days: ${stats.series.map((d) => `${d.date} ${d.votes}`).join(', ')}`}
              className="flex h-44 items-end gap-1.5"
            >
              {stats.series.map((d) => (
                <div key={d.date} className="group relative flex h-full flex-1 items-end" title={`${d.date}: ${d.votes} votes · ${ghs(d.revenue)}`}>
                  <div className="w-full rounded-t-md bg-brand" style={{ height: `${Math.max(d.votes ? 4 : 1, (d.votes / max) * 100)}%`, opacity: d.votes ? 1 : 0.25 }} />
                </div>
              ))}
            </div>
          )}
          {stats && (
            <div className="mt-2 flex justify-between text-xs text-muted" aria-hidden="true">
              <span>{stats.series[0]?.date.slice(5)}</span>
              <span>{stats.series.at(-1)?.date.slice(5)}</span>
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Latest payments</h2>
            <Link to="/admin/payments" className="text-sm font-semibold text-brand hover:underline">
              All
            </Link>
          </div>
          {stats && stats.recentPayments.length === 0 && (
            <EmptyState size="sm" icon={CalendarDays} title="No payments yet">
              Payments appear here as voters pay.
            </EmptyState>
          )}
          <ul>
            {stats?.recentPayments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 border-t border-line py-3 first:border-t-0">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{p.election ?? p.reference}</div>
                  <div className="text-xs text-muted">
                    {p.reference} · {formatDateTime(p.createdAt)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold">{ghs(p.amount)}</div>
                  <PaymentChip status={p.status} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </>
  )
}
