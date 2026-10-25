import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage, type BulkDeleteResult, type Election, type ElectionStatus } from '../lib/api'
import { reportBulkDelete } from '../lib/bulk'
import { CircleStop, Eye, Pencil, Search, SearchX, Trash2, Vote } from 'lucide-react'
import { EmptyState, IconButton, IconLink, LinkButton, PageHeader, StatusChip } from '../components/ui'
import Pagination from '../components/Pagination'
import { usePaged } from '../lib/usePaged'
import { formatDateTime, ghs } from '../lib/format'
import { toast } from '../store/toast'
import { confirmDelete } from '../store/confirm'
import { deleteElectionMessage } from '../lib/electionDelete'
import { ElectionRowsSkeleton, Loading, TableViewSkeleton } from '../components/Loading'
import DataTable, { type Column } from '../components/DataTable'
import ViewToggle from '../components/ViewToggle'
import ElectionCover from '../components/ElectionCover'
import { useViewMode } from '../lib/useViewMode'

type Filter = 'all' | ElectionStatus
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'closed', label: 'Closed' },
]

export default function Elections() {
  const [items, setItems] = useState<Election[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [view, setView] = useViewMode('elections')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api
      .get<Election[]>('/elections')
      .then((r) => setItems(r.data))
      .catch((e) => toast.fromError(e))
      .finally(() => setLoaded(true))
  }, [])

  // Ends voting now, before the closing time. It cannot be undone.
  const closeNow = async (e: Election) => {
    const ok = await confirmDelete({
      title: `Close voting for ${e.name}?`,
      message: 'Voting ends right now, before the closing time you set. Voters will not be able to vote any more, and it cannot be reopened.',
      confirmLabel: 'Close voting',
    })
    if (!ok) return
    try {
      const { data } = await api.post<Election>(`/elections/${e.id}/close`)
      setItems((all) => all.map((x) => (x.id === e.id ? { ...x, status: data.status, endsAt: data.endsAt } : x)))
      toast.success('Voting closed', e.name)
    } catch (err) {
      toast.fromError(err)
    }
  }

  const remove = async (e: Election) => {
    const ok = await confirmDelete({
      title: `Delete ${e.name}?`,
      message: deleteElectionMessage(e, e.totalVotes ?? 0),
      confirmLabel: 'Delete election',
    })
    if (!ok) return
    try {
      await api.delete(`/elections/${e.id}`)
      setItems((all) => all.filter((x) => x.id !== e.id))
      toast.success('Election deleted')
    } catch (err) {
      toast.fromError(err)
    }
  }

  // Search matches the election name or its event code. The tab counts follow the search.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter((e) => e.name.toLowerCase().includes(q) || e.eventCode.toLowerCase().includes(q)) : items
  }, [items, query])
  const counts = useMemo(
    () => ({
      all: matches.length,
      live: matches.filter((e) => e.status === 'live').length,
      upcoming: matches.filter((e) => e.status === 'upcoming').length,
      closed: matches.filter((e) => e.status === 'closed').length,
    }),
    [matches],
  )
  const shown = filter === 'all' ? matches : matches.filter((e) => e.status === filter)
  const cards = usePaged(shown)

  const bulkDelete = async (rows: Election[]) => {
    try {
      const { data } = await api.post<BulkDeleteResult>('/elections/bulk-delete', { ids: rows.map((e) => e.id) })
      reportBulkDelete(data, ['election', 'elections'])
      const gone = new Set(rows.map((e) => e.id).filter((id) => !data.skipped.some((s) => s.id === id)))
      setItems((all) => all.filter((e) => !gone.has(e.id)))
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const STATUS_ORDER: Record<ElectionStatus, number> = { live: 0, upcoming: 1, closed: 2 }
  const columns: Column<Election>[] = [
    {
      key: 'name',
      header: 'Election',
      sortValue: (e) => e.name,
      cell: (e) => (
        <div className="flex items-center gap-3">
          <ElectionCover src={e.coverImageUrl} name={e.name} className="h-9 w-16 rounded-md" />
          <Link to={`/elections/${e.id}`} title={e.name} className="block max-w-[16rem] truncate font-semibold hover:underline">
            {e.name}
          </Link>
        </div>
      ),
    },
    { key: 'status', header: 'Status', sortValue: (e) => STATUS_ORDER[e.status], cell: (e) => <StatusChip status={e.status} /> },
    { key: 'starts', header: 'Starts', sortValue: (e) => new Date(e.startsAt).getTime(), className: 'whitespace-nowrap text-muted', cell: (e) => formatDateTime(e.startsAt) },
    { key: 'price', header: 'Price per vote', sortValue: (e) => e.pricePerVote, className: 'whitespace-nowrap', cell: (e) => ghs(e.pricePerVote) },
    {
      key: 'setup',
      header: 'Categories / candidates',
      sortValue: (e) => e.candidateCount ?? 0,
      className: 'whitespace-nowrap',
      cell: (e) => `${e.categoryCount ?? 0} / ${e.candidateCount ?? 0}`,
    },
    {
      key: 'code',
      header: 'Event code',
      sortValue: (e) => e.eventCode,
      cell: (e) => <span className="inline-block rounded bg-accent px-2 py-0.5 text-[13px] font-bold tracking-wider text-ink">{e.eventCode}</span>,
    },
    { key: 'votes', header: 'Votes', align: 'right', sortValue: (e) => e.totalVotes ?? 0, cell: (e) => (e.totalVotes ?? 0).toLocaleString() },
    { key: 'actions', header: 'Actions', className: 'w-[172px]', cell: (e) => <ElectionActions e={e} onDelete={remove} onClose={closeNow} /> },
  ]

  return (
    <>
      <PageHeader
        title="Elections"
        subtitle="Each election has its own schedule, price per vote and event code."
        action={<LinkButton to="/elections/new">New election</LinkButton>}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="tablist" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`min-h-11 rounded-full border px-[18px] text-sm font-semibold ${filter === f.key ? 'border-ink bg-ink text-white' : 'border-field bg-white'}`}
          >
            {f.label}{loaded ? ` (${counts[f.key]})` : ''}
          </button>
        ))}
      </div>
      <div className="flex w-full items-center gap-3 sm:w-auto">
      <div className="relative w-full sm:w-72">
        <Search size={18} strokeWidth={1.8} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          aria-label="Search elections"
          placeholder="Search by name or code"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-11 w-full rounded-[10px] border border-field bg-white pl-10 pr-3.5 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <ViewToggle value={view} onChange={setView} />
      </div>
      </div>

      <section className="flex flex-col gap-3.5">
        {!loaded && (
          <Loading label="Loading elections">{view === 'table' ? <TableViewSkeleton /> : <ElectionRowsSkeleton />}</Loading>
        )}
        {loaded && view === 'table' && shown.length > 0 && (
          <DataTable
            caption="Elections"
            columns={columns}
            rows={shown}
            rowKey={(e) => e.id}
            initialSort={{ key: 'starts', dir: 'desc' }}
            minWidth={1020}
            bulkDelete={{
              noun: ['election', 'elections'],
              rowLabel: (e) => e.name,
              confirmMessage: (rows) => {
                const votes = rows.reduce((n, e) => n + (e.totalVotes ?? 0), 0)
                return votes > 0 ? `Together they have ${votes.toLocaleString()} votes, and their results will no longer be shown. The elections and their nominations will be removed from your account.` : 'The elections and their nominations will be removed from your account.'
              },
              onDelete: bulkDelete,
            }}
          />
        )}
        {(view === 'cards' ? cards.pageItems : []).map((e) => (
          <article key={e.id} className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[14px] border border-line bg-white px-6 py-5">
            <ElectionCover src={e.coverImageUrl} name={e.name} className="h-[68px] w-[120px] rounded-lg" />
            <div className="min-w-[240px] flex-[2]">
              <div className="flex flex-wrap items-center gap-3">
                <Link to={`/elections/${e.id}`} title={e.name} className="block max-w-[min(100%,22rem)] truncate font-display text-xl font-bold hover:underline">
                  {e.name}
                </Link>
                <StatusChip status={e.status} />
                <span aria-hidden="true" className="h-4 w-px bg-field" />
                <span className="whitespace-nowrap text-sm text-muted">{formatDateTime(e.startsAt)}</span>
              </div>
            </div>
            <Stat label="Price per vote" value={ghs(e.pricePerVote)} />
            <Stat label="Categories / candidates" value={`${e.categoryCount ?? 0} / ${e.candidateCount ?? 0}`} />
            <Stat label="Event code" value={e.eventCode} highlight />
            <Stat label="Votes" value={(e.totalVotes ?? 0).toLocaleString()} />
            <ElectionActions e={e} onDelete={remove} onClose={closeNow} />
          </article>
        ))}
        {loaded && view === 'cards' && shown.length > 0 && (
          <div className="rounded-[14px] border border-line bg-white">
            <Pagination {...cards.pagination} noun="elections" />
          </div>
        )}
        {loaded && shown.length === 0 &&
          (items.length ? (
            <EmptyState icon={SearchX} title={query.trim() ? 'No elections match your search' : 'No elections match this filter'}>
              {query.trim() ? 'Check the spelling, or search by the event code instead.' : 'Try another status to see the rest.'}
            </EmptyState>
          ) : (
            <EmptyState icon={Vote} title="No elections yet" action={<LinkButton to="/elections/new">New election</LinkButton>}>
              Create your first election to set a voting window, a price per vote and an event code.
            </EmptyState>
          ))}
      </section>
    </>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="min-w-[100px] flex-1">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 font-semibold">
        {/* The event code names the election on the website, so it gets the same yellow chip used on the election page. */}
        {highlight ? <span className="inline-block rounded bg-accent px-2 py-0.5 text-[13px] font-bold tracking-wider text-ink">{value}</span> : value}
      </div>
    </div>
  )
}

// View, edit and delete for one election. A fixed width keeps the icons lined up down the list even when some
// actions do not apply.
function ElectionActions({ e, onDelete, onClose }: { e: Election; onDelete: (e: Election) => void; onClose: (e: Election) => void }) {
  return (
    <div className="flex w-[164px] shrink-0 justify-start gap-1">
      <IconLink to={`/elections/${e.id}`} label={`View ${e.name}`}>
        <Eye size={16} strokeWidth={1.8} aria-hidden="true" />
      </IconLink>
      {/* A closed election can no longer be edited, but any election can be deleted. */}
      {e.status !== 'closed' && (
        <IconLink to={`/elections/${e.id}/edit`} label={`Edit ${e.name}`}>
          <Pencil size={16} strokeWidth={1.8} aria-hidden="true" />
        </IconLink>
      )}
      {/* Voting can be ended early while it is open. */}
      {e.status === 'live' && (
        <IconButton label={`Close voting for ${e.name} now`} onClick={() => onClose(e)}>
          <CircleStop size={16} strokeWidth={1.8} aria-hidden="true" />
        </IconButton>
      )}
      <IconButton label={`Delete ${e.name}`} tone="danger" onClick={() => onDelete(e)}>
        <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
      </IconButton>
    </div>
  )
}
