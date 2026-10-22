import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import type { AdminPayment, PaymentStatus } from '../../lib/api'
import { EmptyState, PageHeader, Select } from '../../components/ui'
import DataTable, { type Column } from '../../components/DataTable'
import { TableViewSkeleton } from '../../components/Loading'
import { PaymentChip, SearchBox, useAdminList } from '../../components/admin/parts'
import { formatDateTime, ghs } from '../../lib/format'
import { formatPhone, toLocalPhone } from '../../lib/phone'

const columns: Column<AdminPayment>[] = [
  { key: 'ref', header: 'Reference', className: 'whitespace-nowrap font-mono', cell: (p) => p.reference },
  { key: 'when', header: 'Date', sortValue: (p) => p.createdAt, className: 'whitespace-nowrap', cell: (p) => formatDateTime(p.createdAt) },
  { key: 'phone', header: 'Voter', className: 'whitespace-nowrap', cell: (p) => formatPhone(toLocalPhone(p.phone)) },
  {
    key: 'vote',
    header: 'Vote',
    mobileWide: true,
    cell: (p) => (
      <div>
        <div className="font-semibold">{p.candidate ?? '—'}</div>
        <div className="text-xs text-muted">{[p.category, p.election, p.organisation].filter(Boolean).join(' · ')}</div>
      </div>
    ),
  },
  { key: 'amount', header: 'Amount', align: 'right', sortValue: (p) => p.amount, cell: (p) => ghs(p.amount) },
  {
    key: 'status',
    header: 'Status',
    sortValue: (p) => p.status,
    cell: (p) => (
      <div>
        <PaymentChip status={p.status} />
        {p.failureReason && <div className="mt-1 max-w-[200px] text-xs text-muted">{p.failureReason}</div>}
      </div>
    ),
  },
]

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
]

export default function AdminPayments() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const { rows, loaded } = useAdminList<AdminPayment>('payments', { q: q.trim() || undefined, status: (status as PaymentStatus) || undefined })

  return (
    <>
      <PageHeader title="Payments" subtitle="The latest 100 vote payments. Search to find a specific one." />
      <div className="flex flex-wrap items-end gap-3">
        <SearchBox value={q} onChange={setQ} label="Search payments" placeholder="Reference (BPL-…) or voter phone" />
        <Select label="Status" hideLabel value={status} options={FILTERS} onChange={setStatus} className="w-44" />
      </div>
      {!loaded ? (
        <TableViewSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState icon={CreditCard} title={q || status ? 'No match' : 'No payments yet'}>
          {q || status ? 'Try another reference, number or status.' : 'Payments appear here as voters pay.'}
        </EmptyState>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} caption="Payments" initialSort={{ key: 'when', dir: 'desc' }} minWidth={900} />
      )}
    </>
  )
}
