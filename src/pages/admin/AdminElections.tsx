import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import type { AdminElection } from '../../lib/api'
import { EmptyState, PageHeader, StatusChip } from '../../components/ui'
import DataTable, { type Column } from '../../components/DataTable'
import { TableViewSkeleton } from '../../components/Loading'
import { SearchBox, useAdminList } from '../../components/admin/parts'
import { formatDateTime, ghs } from '../../lib/format'

const columns: Column<AdminElection>[] = [
  { key: 'name', header: 'Election', sortValue: (e) => e.name, mobileWide: true, cell: (e) => <Link to={`/admin/elections/${e.id}`} className="font-semibold hover:underline">{e.name}</Link> },
  { key: 'org', header: 'Organisation', sortValue: (e) => e.organisation ?? '', cell: (e) => e.organisation ?? '—' },
  { key: 'code', header: 'Code', className: 'font-mono', cell: (e) => e.eventCode },
  { key: 'status', header: 'Status', sortValue: (e) => e.status, cell: (e) => <StatusChip status={e.status} /> },
  { key: 'closes', header: 'Closes', sortValue: (e) => e.endsAt, className: 'whitespace-nowrap', cell: (e) => formatDateTime(e.endsAt) },
  { key: 'price', header: 'Price', align: 'right', sortValue: (e) => e.pricePerVote, cell: (e) => ghs(e.pricePerVote) },
  { key: 'votes', header: 'Votes', align: 'right', sortValue: (e) => e.votes, cell: (e) => e.votes.toLocaleString() },
  { key: 'revenue', header: 'Revenue', align: 'right', sortValue: (e) => e.revenue, cell: (e) => ghs(e.revenue) },
]

export default function AdminElections() {
  const [q, setQ] = useState('')
  const { rows, total, loaded, pagination } = useAdminList<AdminElection>('elections', { q: q.trim() || undefined })

  return (
    <>
      <PageHeader title="Elections" subtitle="Every election across all organisations." />
      <SearchBox value={q} onChange={setQ} label="Search elections" placeholder="Search by name or event code" />
      {!loaded ? (
        <TableViewSkeleton />
      ) : total === 0 ? (
        <EmptyState icon={CalendarDays} title={q ? 'No match' : 'No elections yet'}>
          {q ? 'Try a different name or event code.' : 'Elections appear here once organisations create them.'}
        </EmptyState>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(e) => e.id} caption="Elections" serverPagination={pagination} noun="elections" minWidth={980} />
      )}
    </>
  )
}
