import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type BulkDeleteResult, type Candidate } from '../lib/api'
import { reportBulkDelete } from '../lib/bulk'
import { Pencil, SearchX, Trash2, Users } from 'lucide-react'
import { Avatar, EmptyState, IconButton, IconLink, LinkButton, PageHeader, Select } from '../components/ui'
import Pagination from '../components/Pagination'
import { usePaged } from '../lib/usePaged'
import DataTable, { type Column } from '../components/DataTable'
import ViewToggle from '../components/ViewToggle'
import { useViewMode } from '../lib/useViewMode'
import { initials, tone } from '../lib/format'
import { toast } from '../store/toast'
import { confirmDelete } from '../store/confirm'
import { CandidateGridSkeleton, Loading, TableViewSkeleton } from '../components/Loading'

export default function Candidates() {
  const [items, setItems] = useState<Candidate[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useViewMode('candidates')

  const load = useCallback(async () => {
    setItems((await api.get<Candidate[]>('/candidates')).data)
  }, [])

  useEffect(() => {
    load()
      .catch((e) => toast.fromError(e))
      .finally(() => setLoaded(true))
  }, [load])

  // The filter lists the categories candidates actually stand in, so every choice shows at least one person.
  const categoryNames = useMemo(
    () => [...new Set(items.flatMap((c) => c.categories ?? []))].sort((a, b) => a.localeCompare(b)),
    [items],
  )
  const shown = items.filter(
    (c) => c.name.toLowerCase().includes(query.trim().toLowerCase()) && (!category || (c.categories ?? []).includes(category)),
  )

  const grid = usePaged(shown, 12, [12, 24, 48, 96])

  const remove = async (c: Candidate) => {
    const ok = await confirmDelete({
      title: `Delete ${c.name}?`,
      message: 'This also removes them from elections that have not started. This cannot be undone.',
      confirmLabel: 'Delete candidate',
    })
    if (!ok) return
    try {
      await api.delete(`/candidates/${c._id}`)
      toast.success('Candidate deleted', c.name)
      await load()
    } catch (err) {
      toast.fromError(err)
    }
  }

  const bulkDelete = async (rows: Candidate[]) => {
    try {
      const { data } = await api.post<BulkDeleteResult>('/candidates/bulk-delete', { ids: rows.map((c) => c._id) })
      reportBulkDelete(data, ['candidate', 'candidates'])
      await load()
    } catch (err) {
      toast.fromError(err)
    }
  }

  const columns: Column<Candidate>[] = [
    {
      key: 'name',
      header: 'Candidate',
      sortValue: (c) => c.name,
      cell: (c) => (
        <Link to={`/candidates/${c._id}`} className="flex items-center gap-3 font-semibold hover:underline">
          <Avatar name={c.name} src={c.imageUrl} size={36} />
          <span className="truncate">{c.name}</span>
        </Link>
      ),
    },
    {
      key: 'categories',
      header: 'Categories',
      sortValue: (c) => (c.categories ?? []).length,
      cell: (c) =>
        (c.categories ?? []).length ? (
          <div className="flex flex-wrap gap-1.5">
            {(c.categories ?? []).map((cat) => (
              <span key={cat} className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-medium text-[#0b5a43]">
                {cat}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted">Not nominated yet</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-24',
      cell: (c) => (
        <IconLink to={`/candidates/${c._id}`} label={`Edit ${c.name}`}>
          <Pencil size={16} strokeWidth={1.8} aria-hidden="true" />
        </IconLink>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Candidates"
        subtitle="Your reusable library. Assign candidates to categories inside each election."
        action={<LinkButton to="/candidates/new">Add candidate</LinkButton>}
      />
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label="Search candidates"
          placeholder="Search by name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-[46px] w-full max-w-md flex-1 rounded-[10px] border border-field bg-white px-3.5 outline-none focus:border-brand"
        />
        <Select
          label="Filter by category"
          hideLabel
          value={category}
          onChange={setCategory}
          options={[{ value: '', label: 'All categories' }, ...categoryNames.map((n) => ({ value: n, label: n }))]}
          className="ml-auto w-full sm:w-64"
        />
        <ViewToggle value={view} onChange={setView} />
      </div>

      {!loaded && (
        <Loading label="Loading candidates">{view === 'table' ? <TableViewSkeleton /> : <CandidateGridSkeleton />}</Loading>
      )}
      {loaded && view === 'table' && shown.length > 0 && <DataTable
          caption="Candidates"
          columns={columns}
          rows={shown}
          rowKey={(c) => c._id}
          initialSort={{ key: 'name', dir: 'asc' }}
          minWidth={600}
          bulkDelete={{
            noun: ['candidate', 'candidates'],
            rowLabel: (c) => c.name,
            confirmMessage: () => 'They will also be removed from elections that have not started. Anyone in an election that has started is kept. This cannot be undone.',
            onDelete: bulkDelete,
          }}
        />}
      <section className={`grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 ${view === 'table' ? 'hidden' : ''}`}>
        {(view === 'cards' ? grid.pageItems : []).map((c) => (
          <div key={c._id} className="group relative overflow-hidden rounded-[14px] border border-line bg-white transition-shadow hover:shadow-md">
          <Link to={`/candidates/${c._id}`} className="flex flex-col">
            {c.imageUrl ? (
              <img src={c.imageUrl} alt={c.name} className="aspect-[4/3] w-full object-cover object-top" />
            ) : (
              <div role="img" aria-label={`No photo for ${c.name}`} className={`flex aspect-[4/3] items-center justify-center font-display text-5xl font-bold text-ink/55 ${tone(c.name)}`}>
                {initials(c.name)}
              </div>
            )}
            <div className="flex flex-col gap-2 px-4 pb-3.5 pt-3">
              <div className="text-base font-semibold">{c.name}</div>
              <div className="flex flex-wrap gap-1.5">
                {(c.categories ?? []).map((cat) => (
                  <span key={cat} className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-medium text-[#0b5a43]">
                    {cat}
                  </span>
                ))}
                {(c.categories ?? []).length === 0 && <span className="text-xs text-muted">Not nominated yet</span>}
              </div>
            </div>
          </Link>
          {/* Edit and delete appear over the photo on hover or keyboard focus. Where there is no hover (touch screens) they are always shown. */}
          <div className="absolute right-2 top-2 flex gap-1.5 shadow-sm transition-opacity group-focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
            <IconLink to={`/candidates/${c._id}`} label={`Edit ${c.name}`}>
              <Pencil size={16} strokeWidth={1.8} aria-hidden="true" />
            </IconLink>
            <IconButton label={`Delete ${c.name}`} tone="danger" onClick={() => remove(c)}>
              <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
            </IconButton>
          </div>
          </div>
        ))}
      </section>
      {loaded && view === 'cards' && shown.length > 0 && (
        <div className="rounded-[14px] border border-line bg-white">
          <Pagination {...grid.pagination} noun="candidates" />
        </div>
      )}
      {loaded && shown.length === 0 &&
        (items.length ? (
          <EmptyState icon={SearchX} title="No candidates match">
            Check the spelling, or clear the search box and the category filter.
          </EmptyState>
        ) : (
          <EmptyState icon={Users} title="No candidates yet" action={<LinkButton to="/candidates/new">Add candidate</LinkButton>}>
            Add the people who will be on the ballot. You can reuse them in every election.
          </EmptyState>
        ))}
    </>
  )
}
