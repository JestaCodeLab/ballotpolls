import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, CalendarDays, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { api, errorMessage, type AdminElection } from '../../lib/api'
import { EmptyState, IconButton, IconLink, LinkButton, PageHeader, StatusChip } from '../../components/ui'
import DataTable, { type Column } from '../../components/DataTable'
import { TableViewSkeleton } from '../../components/Loading'
import { RefreshButton, SearchBox, useAdminList } from '../../components/admin/parts'
import { confirmDelete } from '../../store/confirm'
import { toast } from '../../store/toast'
import { formatDateTime, ghs } from '../../lib/format'

type Tab = 'active' | 'deleted'

export default function AdminElections() {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('active')
  const { rows, total, loaded, loading, reload, pagination } = useAdminList<AdminElection>('elections', { q: q.trim() || undefined, deleted: tab === 'deleted' ? 'true' : undefined })
  const [busy, setBusy] = useState<string | null>(null)

  const remove = async (e: AdminElection) => {
    if (!(await confirmDelete({ title: `Delete ${e.name}?`, message: e.votes > 0 || e.revenue > 0 ? `Voting stops and the election disappears for the organisation. Its votes and payments are kept, so earnings do not change, and you can restore it from the Deleted tab.` : `This permanently removes the election, its nominations and its event code ${e.eventCode}. The organisation is told by notification. This cannot be undone.`, confirmLabel: 'Delete election' }))) return
    setBusy(e.id)
    try {
      await api.delete(`/admin/elections/${e.id}`)
      toast.success('Election deleted', e.name)
      reload()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  // Brings back an election an organiser deleted. It returns with its nominations, votes and event code.
  const restore = async (e: AdminElection) => {
    if (!(await confirmDelete({ title: `Restore ${e.name}?`, message: `${e.organisation ?? 'The organisation'} will see it again, with its nominations, votes and event code ${e.eventCode}.`, confirmLabel: 'Restore election' }))) return
    setBusy(e.id)
    try {
      await api.post(`/admin/elections/${e.id}/restore`)
      toast.success('Election restored', e.name)
      reload()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const base: Column<AdminElection>[] = [
    { key: 'name', header: 'Election', mobileWide: true, cell: (e) => (tab === 'deleted' ? <span className="font-semibold">{e.name}</span> : <Link to={`/admin/elections/${e.id}`} className="font-semibold hover:underline">{e.name}</Link>) },
    { key: 'org', header: 'Organisation', cell: (e) => e.organisation ?? '—' },
    { key: 'code', header: 'Code', className: 'font-mono', cell: (e) => e.eventCode },
    { key: 'status', header: 'Status', cell: (e) => <StatusChip status={e.status} /> },
    tab === 'deleted'
      ? { key: 'deleted', header: 'Deleted', className: 'whitespace-nowrap', cell: (e) => (e.deletedAt ? formatDateTime(e.deletedAt) : '—') }
      : { key: 'closes', header: 'Closes', className: 'whitespace-nowrap', cell: (e) => formatDateTime(e.endsAt) },
    { key: 'price', header: 'Price', align: 'right', cell: (e) => ghs(e.pricePerVote) },
    { key: 'votes', header: 'Votes', align: 'right', cell: (e) => e.votes.toLocaleString() },
    { key: 'revenue', header: 'Revenue', align: 'right', cell: (e) => ghs(e.revenue) },
  ]
  const columns: Column<AdminElection>[] =
    tab === 'deleted'
      ? [
          ...base,
          {
            key: 'actions',
            header: 'Actions',
            hideHeader: true,
            align: 'right',
            cell: (e) => (
              <IconButton label={`Restore ${e.name}`} tone="brand" disabled={busy === e.id} onClick={() => restore(e)}>
                <RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" />
              </IconButton>
            ),
          },
        ]
      : [
          ...base,
          {
            key: 'actions',
            header: 'Actions',
            hideHeader: true,
            align: 'right' as const,
            cell: (e: AdminElection) => (
              <div className="flex justify-end gap-2">
                {/* Nobody can have voted before voting opens. */}
                {e.status !== 'upcoming' && (
                  <IconLink to={`/admin/results?election=${e.id}`} label={`View results for ${e.name}`} tone="brand">
                    <BarChart3 size={16} strokeWidth={1.8} aria-hidden="true" />
                  </IconLink>
                )}
                <IconLink to={`/admin/elections/${e.id}/edit`} label={`Edit ${e.name}`}>
                  <Pencil size={16} strokeWidth={1.8} aria-hidden="true" />
                </IconLink>
                <IconButton label={`Delete ${e.name}`} tone="danger" disabled={busy === e.id} onClick={() => remove(e)}>
                  <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
                </IconButton>
              </div>
            ),
          },
        ]

  return (
    <>
      <PageHeader title="Elections" subtitle="Every election across all organisations." action={<LinkButton to="/admin/elections/new">New election</LinkButton>} />

      <div role="tablist" aria-label="Election list" className="flex gap-1 border-b border-line">
        {(['active', 'deleted'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px min-h-12 border-b-[3px] px-5 text-[15px] font-semibold ${tab === t ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {t === 'active' ? 'Elections' : 'Deleted'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={q} onChange={setQ} label="Search elections" placeholder="Search by name or event code" />
        <RefreshButton onClick={reload} busy={loading} />
      </div>
      {!loaded ? (
        <TableViewSkeleton />
      ) : total === 0 ? (
        <EmptyState icon={CalendarDays} title={q ? 'No match' : tab === 'deleted' ? 'Nothing deleted' : 'No elections yet'}>
          {q ? 'Try a different name or event code.' : tab === 'deleted' ? 'Elections that organisers delete appear here, and can be restored.' : 'Elections appear here once organisations create them.'}
        </EmptyState>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(e) => e.id} caption={tab === 'deleted' ? 'Deleted elections' : 'Elections'} serverPagination={pagination} noun="elections" minWidth={980} />
      )}
    </>
  )
}
