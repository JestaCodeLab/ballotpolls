import { useState } from 'react'
import { CreditCard, RefreshCw } from 'lucide-react'
import { api, errorMessage, type AdminPayment, type PaymentStatus } from '../../lib/api'
import { toast } from '../../store/toast'
import { EmptyState, IconButton, PageHeader, Select } from '../../components/ui'
import DataTable, { type Column } from '../../components/DataTable'
import { TableViewSkeleton } from '../../components/Loading'
import { PaymentChip, SearchBox, useAdminList } from '../../components/admin/parts'
import { formatDateTime, ghs } from '../../lib/format'
import { formatPhone, toLocalPhone } from '../../lib/phone'

const baseColumns: Column<AdminPayment>[] = [
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
  { key: 'votes', header: 'Votes', align: 'right', sortValue: (p) => p.votes, cell: (p) => p.votes.toLocaleString() },
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
  const { rows, total, loaded, reload, pagination } = useAdminList<AdminPayment>('payments', { q: q.trim() || undefined, status: (status as PaymentStatus) || undefined })
  const [checking, setChecking] = useState<string | null>(null)

  // Asks Hubtel about a waiting payment now, or re-sends the "vote counted" message to Hubtel for a finished one.
  const check = async (p: AdminPayment) => {
    setChecking(p.id)
    try {
      const { data } = await api.post<{ ok: boolean; message: string }>(`/admin/payments/${p.id}/check-status`)
      if (data.ok) toast.success(p.reference, data.message)
      else toast.error(data.message)
      reload()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setChecking(null)
    }
  }

  const columns: Column<AdminPayment>[] = [
    ...baseColumns,
    {
      key: 'actions',
      header: 'Actions',
      hideHeader: true,
      align: 'right',
      cell: (p) =>
        p.status === 'pending' || p.callbackOwed ? (
          <IconButton label={p.status === 'pending' ? `Check ${p.reference} with Hubtel` : `Tell Hubtel ${p.reference} was counted`} tone="brand" disabled={checking === p.id} onClick={() => check(p)}>
            <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" className={checking === p.id ? 'animate-spin' : ''} />
          </IconButton>
        ) : null,
    },
  ]

  return (
    <>
      <PageHeader title="Payments" subtitle="Every vote payment, newest first. Search to find a specific one." />
      <div className="flex flex-wrap items-end gap-3">
        <SearchBox value={q} onChange={setQ} label="Search payments" placeholder="Reference (BPL-…) or voter phone" />
        <Select label="Status" hideLabel value={status} options={FILTERS} onChange={setStatus} className="w-44" />
      </div>
      {!loaded ? (
        <TableViewSkeleton />
      ) : total === 0 ? (
        <EmptyState icon={CreditCard} title={q || status ? 'No match' : 'No payments yet'}>
          {q || status ? 'Try another reference, number or status.' : 'Payments appear here as voters pay.'}
        </EmptyState>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} caption="Payments" serverPagination={pagination} noun="payments" minWidth={900} />
      )}
    </>
  )
}
