import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../store/auth'
import { useSearchParams } from 'react-router-dom'
import { BarChart3, Coins, Pencil, Trash2, Vote } from 'lucide-react'
import { api, errorMessage, type Category, type Election, type Nomination } from '../lib/api'
import { Avatar, Card, EmptyState, IconButton, IconLink, LinkButton, PageHeader, Select, StatIcon } from '../components/ui'
import { ghs } from '../lib/format'
import { toast } from '../store/toast'
import { confirmDelete } from '../store/confirm'
import { ChartSkeleton, Loading, Skeleton } from '../components/Loading'

const POLL_MS = 10_000

const countdown = (ms: number) => {
  const mins = Math.max(0, Math.floor(ms / 60000))
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  return `${d ? `${d}d ` : ''}${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
}

// Rounds the axis up to a tidy maximum (1, 2 or 5 times a power of ten) with at most 5 gridline steps.
const niceAxis = (top: number) => {
  if (top <= 0) return { max: 5, step: 1 }
  const mag = Math.pow(10, Math.floor(Math.log10(top / 4)))
  const step = [1, 2, 5, 10].map((m) => m * mag).find((x) => top / x <= 5)!
  return { max: Math.ceil(top / step) * step, step }
}

const CHART_H = 260
// Each candidate gets at least this much width, so long lists scroll sideways instead of squeezing.
const COL_MIN = 64

// The same page serves organisers (their own elections) and super admins (every election, with its organisation named).
export default function Results({ admin = false }: { admin?: boolean }) {
  // Results checkers see votes only, never money.
  const showRevenue = useAuth((s) => s.user?.role !== 'results_checker')
  // ?election=<id> opens the page on that election, e.g. from its details page.
  const [params] = useSearchParams()
  const wanted = params.get('election')
  const [elections, setElections] = useState<Election[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [electionId, setElectionId] = useState<string>('')
  const [noms, setNoms] = useState<Nomination[]>([])
  const [categoryId, setCategoryId] = useState<string>('')
  const [now, setNow] = useState(() => Date.now())
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([api.get<Election[]>(admin ? '/admin/live/elections' : '/elections'), admin ? Promise.resolve({ data: [] as Category[] }) : api.get<Category[]>('/categories')])
      .then(([e, c]) => {
        setElections(e.data)
        setCategories(c.data)
        // Start on the one asked for, otherwise the election that is live, otherwise the most recent one.
        setElectionId((e.data.find((x) => x.id === wanted) ?? e.data.find((x) => x.status === 'live') ?? e.data[0])?.id ?? '')
      })
      .catch((err) => {
        toast.fromError(err)
        setElections([])
      })
  }, [wanted, admin])

  const election = elections?.find((e) => e.id === electionId)
  const live = election?.status === 'live'

  const loadVotes = useCallback(async () => {
    if (!electionId) return
    try {
      if (admin) {
        const { data } = await api.get<{ categories: Category[]; nominations: Nomination[] }>(`/admin/live/elections/${electionId}`)
        setNoms(data.nominations)
        setCategories(data.categories)
      } else {
        const { data } = await api.get<Nomination[]>(`/elections/${electionId}/nominations`)
        setNoms(data)
      }
      setUpdatedAt(Date.now())
    } catch (err) {
      toast.fromError(err)
    }
  }, [electionId, admin])

  useEffect(() => {
    loadVotes()
    if (!live) return
    const t = setInterval(loadVotes, POLL_MS)
    return () => clearInterval(t)
  }, [loadVotes, live])

  // Keeps the countdown and "updated … ago" text moving between refreshes.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(t)
  }, [])

  const tabs = useMemo(() => {
    const name = new Map(categories.map((c) => [c._id, c.name]))
    const ids = [...new Set(noms.map((n) => n.categoryId))]
    return ids.map((id) => ({ id, name: name.get(id) ?? 'Category' })).sort((a, b) => a.name.localeCompare(b.name))
  }, [noms, categories])

  const activeId = tabs.some((t) => t.id === categoryId) ? categoryId : (tabs[0]?.id ?? '')
  const rows = useMemo(
    () => noms.filter((n) => n.categoryId === activeId).sort((a, b) => b.voteCount - a.voteCount),
    [noms, activeId],
  )
  const categoryTotal = rows.reduce((s, n) => s + n.voteCount, 0)
  const totalVotes = noms.reduce((s, n) => s + n.voteCount, 0)
  const axis = niceAxis(rows[0]?.voteCount ?? 0)
  const ticks = Array.from({ length: Math.round(axis.max / axis.step) + 1 }, (_, i) => i * axis.step)

  if (elections === null)
    return (
      <>
        <PageHeader title="Live results" />
        <Loading label="Loading results">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-[14px] border border-line bg-white p-5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="mt-3 h-8 w-32" />
                </div>
              ))}
            </div>
            <ChartSkeleton />
          </div>
        </Loading>
      </>
    )

  if (!election)
    return (
      <>
        <PageHeader title="Live results" />
        <EmptyState
          icon={BarChart3}
          title="No elections yet"
          action={admin ? undefined : <LinkButton to="/elections/new">Create an election</LinkButton>}
        >
          Once an election is open for voting, results appear here and update as votes come in.
        </EmptyState>
      </>
    )

  const removeElection = async () => {
    if (!(await confirmDelete({ title: `Delete ${election.name}?`, message: 'Voting stops and the election disappears for the organisation. If it has payments, its votes and payments are kept and you can restore it from the Deleted tab on the Elections page; otherwise it is permanently removed.', confirmLabel: 'Delete election' }))) return
    try {
      await api.delete(`/admin/elections/${election.id}`)
      toast.success('Election deleted', election.name)
      const rest = (elections ?? []).filter((x) => x.id !== election.id)
      setElections(rest)
      setElectionId(rest[0]?.id ?? '')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const ago = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null
  const clock =
    election.status === 'live'
      ? { label: 'Voting closes in', value: countdown(new Date(election.endsAt).getTime() - now) }
      : election.status === 'upcoming'
        ? { label: 'Voting opens in', value: countdown(new Date(election.startsAt).getTime() - now) }
        : { label: 'Voting', value: 'Closed' }

  return (
    <>
      <PageHeader
        title="Live results"
        subtitle={
          <span className="flex items-start gap-2">
            {live && <span aria-hidden="true" className="mt-[7px] h-[9px] w-[9px] shrink-0 rounded-full bg-accent ring-4 ring-accent/30" />}
            <span className="min-w-0">
              {election.name}
              {live && ago !== null && <> · updated {ago < 5 ? 'just now' : `${ago} seconds ago`}</>}
            </span>
          </span>
        }
        action={
          <div className="flex items-center gap-4">
            {admin && (
              <div className="flex gap-2">
                <IconLink to={`/admin/elections/${election.id}/edit`} label={`Edit ${election.name}`}>
                  <Pencil size={16} strokeWidth={1.8} aria-hidden="true" />
                </IconLink>
                <IconButton label={`Delete ${election.name}`} tone="danger" onClick={removeElection}>
                  <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
                </IconButton>
              </div>
            )}
            <div className="text-left sm:text-right">
              <div className="text-[13px] text-muted">{clock.label}</div>
              <div className="font-display text-3xl font-bold tracking-tight tabular-nums">{clock.value}</div>
            </div>
          </div>
        }
      />

      {elections.length > 1 && (
        <div className="max-w-sm">
          <Select
            label="Election"
            value={electionId}
            onChange={setElectionId}
            options={elections.map((e) => ({ value: e.id, label: `${e.name}${e.organisation ? ` · ${e.organisation}` : ''} (${e.status})` }))}
          />
        </div>
      )}

      <section className={`grid gap-4 ${showRevenue ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm text-muted">Total votes</div>
            <StatIcon icon={Vote} />
          </div>
          <div className="mt-1.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">{totalVotes.toLocaleString()}</div>
        </Card>
        {showRevenue && <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm text-muted">Revenue (confirmed)</div>
            <StatIcon icon={Coins} />
          </div>
          <div className="mt-1.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">{ghs(totalVotes * election.pricePerVote)}</div>
        </Card>}
      </section>

      {tabs.length === 0 ? (
        <Card>
          <EmptyState size="sm" icon={BarChart3} title="No candidates nominated yet">
            Assign candidates to categories in this election and their votes will show here.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div role="tablist" aria-label="Categories" className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={t.id === activeId}
                onClick={() => setCategoryId(t.id)}
                className={`min-h-11 rounded-full border px-[18px] text-sm font-semibold ${t.id === activeId ? 'border-ink bg-ink text-white' : 'border-field bg-white hover:bg-ground'}`}
              >
                {t.name}
              </button>
            ))}
          </div>

          <Card className="p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-[22px] font-bold">{tabs.find((t) => t.id === activeId)?.name}</h2>
              <span className="text-sm text-muted">{categoryTotal.toLocaleString()} votes in this category</span>
            </div>

            <div className="overflow-x-auto">
              <div className="flex gap-2 sm:gap-3" style={{ minWidth: 48 + rows.length * COL_MIN }}>
                <div aria-hidden="true" className="relative w-8 shrink-0 sm:w-11" style={{ height: CHART_H }}>
                  {ticks.map((t) => (
                    <span
                      key={t}
                      className="absolute right-0 translate-y-1/2 text-xs tabular-nums text-muted"
                      style={{ bottom: `${(t / axis.max) * 100}%` }}
                    >
                      {t.toLocaleString()}
                    </span>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="relative" style={{ height: CHART_H }}>
                    {ticks.map((t) => (
                      <div
                        key={t}
                        aria-hidden="true"
                        className={`absolute inset-x-0 h-px ${t === 0 ? 'bg-field' : 'bg-[#e6ede9]'}`}
                        style={{ bottom: `${(t / axis.max) * 100}%` }}
                      />
                    ))}
                    <div className="absolute inset-0 flex items-end">
                      {rows.map((n, i) => {
                        const h = (n.voteCount / axis.max) * 100
                        const share = categoryTotal ? Math.round((n.voteCount / categoryTotal) * 100) : 0
                        return (
                          <button
                            key={n.id}
                            type="button"
                            aria-label={`${n.candidate.name}, ${n.voteCount.toLocaleString()} votes, ${share}% of category`}
                            className="group relative flex h-full min-w-0 flex-1 items-end justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                          >
                            <span
                              className="w-9 rounded-t-[4px] bg-brand transition-colors sm:w-14 group-hover:bg-brand-dark group-focus-visible:bg-brand-dark"
                              style={{ height: `${h}%` }}
                            />
                            <span
                              className="absolute inset-x-0 mb-1.5 text-center text-sm font-semibold tabular-nums"
                              style={{ bottom: `${h}%` }}
                            >
                              {n.voteCount.toLocaleString()}
                            </span>
                            <span
                              role="tooltip"
                              className="pointer-events-none absolute left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-ink px-3 py-2.5 text-left text-[13px] leading-snug text-white shadow-lg group-hover:block group-focus-visible:block"
                              style={{ bottom: `calc(${h}% + 34px)` }}
                            >
                              <strong className="block text-sm">{n.candidate.name}</strong>
                              {n.voteCount.toLocaleString()} votes · {share}% of category
                              <br />
                              <span className="text-[#b7c7bf]">
                                Rank {i + 1} of {rows.length}
                              </span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="mt-3 flex">
                    {rows.map((n) => (
                      <div key={n.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 px-2 text-center">
                        <Avatar name={n.candidate.name} src={n.candidate.imageUrl} size={36} />
                        <div className="text-sm font-semibold leading-snug">{n.candidate.name}</div>
                        <div className="text-[13px] text-muted">
                          {categoryTotal ? Math.round((n.voteCount / categoryTotal) * 100) : 0}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <table className="sr-only">
              <caption>Votes per candidate, {tabs.find((t) => t.id === activeId)?.name}</caption>
              <thead>
                <tr>
                  <th scope="col">Candidate</th>
                  <th scope="col">Votes</th>
                  <th scope="col">Share</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((n) => (
                  <tr key={n.id}>
                    <th scope="row">{n.candidate.name}</th>
                    <td>{n.voteCount}</td>
                    <td>{categoryTotal ? Math.round((n.voteCount / categoryTotal) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  )
}
