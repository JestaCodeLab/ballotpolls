import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import type { AdminUser } from '../../lib/api'
import { EmptyState, PageHeader } from '../../components/ui'
import DataTable, { type Column } from '../../components/DataTable'
import { TableViewSkeleton } from '../../components/Loading'
import { OrgChip, SearchBox, useAdminList } from '../../components/admin/parts'
import { formatDateTime } from '../../lib/format'
import { formatPhone, toLocalPhone } from '../../lib/phone'

const columns: Column<AdminUser>[] = [
  { key: 'name', header: 'Name', sortValue: (u) => u.name, mobileWide: true, cell: (u) => <Link to={`/admin/users/${u.id}`} className="font-semibold hover:underline">{u.name}</Link> },
  { key: 'email', header: 'Email', sortValue: (u) => u.email, cell: (u) => u.email },
  { key: 'phone', header: 'Phone', className: 'whitespace-nowrap', cell: (u) => formatPhone(toLocalPhone(u.phone)) },
  { key: 'org', header: 'Organisation', sortValue: (u) => u.organisation?.name ?? '', cell: (u) => (u.organisation ? <Link to={`/admin/organisations/${u.organisation.id}`} className="hover:underline">{u.organisation.name}</Link> : '—') },
  {
    key: 'verified',
    header: 'Phone verified',
    sortValue: (u) => (u.phoneVerified ? 1 : 0),
    cell: (u) => <span className={u.phoneVerified ? 'text-[#0b5a43]' : 'text-[#6b4300]'}>{u.phoneVerified ? 'Yes' : 'Not yet'}</span>,
  },
  { key: 'status', header: 'Access', cell: (u) => (u.organisation ? <OrgChip status={u.organisation.status} /> : '—') },
  { key: 'joined', header: 'Joined', sortValue: (u) => u.createdAt ?? '', className: 'whitespace-nowrap', cell: (u) => (u.createdAt ? formatDateTime(u.createdAt) : '—') },
]

export default function AdminUsers() {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const { rows, total, loaded, pagination } = useAdminList<AdminUser>('users', { q: q.trim() || undefined })

  return (
    <>
      <PageHeader title="Organisers" subtitle="The people who sign in to run an organisation's events." />
      <SearchBox value={q} onChange={setQ} label="Search organisers" placeholder="Search by name, email or phone" />
      {!loaded ? (
        <TableViewSkeleton />
      ) : total === 0 ? (
        <EmptyState icon={Users} title={q ? 'No match' : 'No organisers yet'}>
          {q ? 'Try a different name, email or phone number.' : 'Organisers appear here when they register.'}
        </EmptyState>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(u) => u.id} caption="Organisers" onRowClick={(u) => navigate(`/admin/users/${u.id}`)} serverPagination={pagination} noun="organisers" minWidth={900} />
      )}
    </>
  )
}
