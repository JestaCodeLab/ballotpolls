import { useCallback, useEffect, useState } from 'react'
import { Banknote, Check, Wallet, X } from 'lucide-react'
import { api, errorMessage, type AdminWithdrawal } from '../../lib/api'
import { Button, EmptyState, IconButton, PageHeader, Textarea } from '../../components/ui'
import Modal from '../../components/Modal'
import DataTable, { type Column } from '../../components/DataTable'
import { TableViewSkeleton } from '../../components/Loading'
import { confirmDelete } from '../../store/confirm'
import { toast } from '../../store/toast'
import { formatDateTime, ghs } from '../../lib/format'
import { formatPhone, toLocalPhone } from '../../lib/phone'

type Tab = 'pending' | 'approved' | 'released' | 'rejected'
const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'released', label: 'Released' },
  { id: 'rejected', label: 'Rejected' },
]

export default function AdminWithdrawals() {
  const [tab, setTab] = useState<Tab>('pending')
  const [rows, setRows] = useState<AdminWithdrawal[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<AdminWithdrawal | null>(null)
  const [reason, setReason] = useState('')

  const load = useCallback(async (t: Tab, p: number, size: number) => {
    setLoaded(false)
    try {
      const { data } = await api.get<{ items: AdminWithdrawal[]; total: number }>('/admin/withdrawals', { params: { status: t, page: p, pageSize: size } })
      // The last row of a page was just handled: step back instead of showing an empty page.
      if (data.items.length === 0 && p > 1) return setPage(p - 1)
      setRows(data.items)
      setTotal(data.total)
    } catch (e) {
      toast.fromError(e)
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    load(tab, page, pageSize)
  }, [tab, page, pageSize, load])

  const act = async (w: AdminWithdrawal, action: 'approve' | 'release' | 'reject', body: object = {}) => {
    setBusy(w.id)
    try {
      await api.post(`/admin/withdrawals/${w.id}/${action}`, body)
      toast.success(action === 'approve' ? 'Withdrawal approved' : action === 'release' ? 'Marked as released' : 'Withdrawal rejected')
      setRejecting(null)
      setReason('')
      await load(tab, page, pageSize)
    } catch (e) {
      toast.error(errorMessage(e))
      await load(tab, page, pageSize)
    } finally {
      setBusy(null)
    }
  }

  const release = async (w: AdminWithdrawal) => {
    const ok = await confirmDelete({
      title: `Mark ${w.reference} as released?`,
      message: `Only do this after you have sent ${ghs(w.amount)} to ${formatPhone(toLocalPhone(w.payoutPhoneFull))}. The organiser is told the money was sent.`,
      confirmLabel: 'Mark released',
    })
    if (ok) await act(w, 'release')
  }

  const columns: Column<AdminWithdrawal>[] = [
    { key: 'ref', header: 'Reference', className: 'whitespace-nowrap font-mono', cell: (w) => w.reference },
    { key: 'org', header: 'Organisation', sortValue: (w) => w.organisation ?? '', mobileWide: true, cell: (w) => <span className="font-semibold">{w.organisation ?? '—'}</span> },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: (w) => w.amount, className: 'whitespace-nowrap font-semibold', cell: (w) => ghs(w.amount) },
    { key: 'phone', header: 'Pay to', className: 'whitespace-nowrap', cell: (w) => formatPhone(toLocalPhone(w.payoutPhoneFull)) },
    { key: 'when', header: 'Requested', sortValue: (w) => w.createdAt, className: 'whitespace-nowrap', cell: (w) => formatDateTime(w.createdAt) },
    ...(tab === 'rejected' ? [{ key: 'why', header: 'Reason', cell: (w: AdminWithdrawal) => w.rejectedReason ?? '' }] : []),
    ...(tab === 'pending' || tab === 'approved'
      ? [
          {
            key: 'actions',
            header: 'Actions',
            hideHeader: true,
            align: 'right' as const,
            cell: (w: AdminWithdrawal) => (
              <div className="flex justify-end gap-2">
                {w.status === 'pending' && (
                  <IconButton label={`Approve ${w.reference}`} tone="brand" disabled={busy === w.id} onClick={() => act(w, 'approve')}>
                    <Check size={17} strokeWidth={2} aria-hidden="true" />
                  </IconButton>
                )}
                <IconButton label={`Mark ${w.reference} as released`} tone="brand" disabled={busy === w.id} onClick={() => release(w)}>
                  <Banknote size={17} strokeWidth={1.8} aria-hidden="true" />
                </IconButton>
                <IconButton label={`Reject ${w.reference}`} tone="danger" disabled={busy === w.id} onClick={() => setRejecting(w)}>
                  <X size={17} strokeWidth={2} aria-hidden="true" />
                </IconButton>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader title="Withdrawals" subtitle="Payout requests from organisers. Approve, send the money, then mark it released." />
      <div role="tablist" aria-label="Withdrawal status" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => { setTab(t.id); setPage(1) }}
            className={`min-h-10 rounded-full px-4 text-sm font-semibold ${tab === t.id ? 'bg-ink text-white' : 'border border-line bg-white hover:bg-ground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!loaded ? (
        <TableViewSkeleton />
      ) : total === 0 ? (
        <EmptyState icon={Wallet} title={`No ${tab} withdrawals`}>
          {tab === 'pending' ? 'You are all caught up.' : 'Nothing here yet.'}
        </EmptyState>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(w) => w.id} caption={`${tab} withdrawals`} noun="withdrawals" serverPagination={{ page, pageSize, total, onPage: setPage, onPageSize: (n) => { setPageSize(n); setPage(1) } }} minWidth={920} />
      )}

      {rejecting && (
        <Modal
          title={`Reject ${rejecting.reference}?`}
          description={`${ghs(rejecting.amount)} goes back to ${rejecting.organisation ?? 'the organisation'}'s available balance. They see your reason.`}
          onClose={() => setRejecting(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setRejecting(null)}>
                Cancel
              </Button>
              <Button variant="danger" disabled={!reason.trim() || busy === rejecting.id} onClick={() => act(rejecting, 'reject', { reason: reason.trim() })}>
                Reject withdrawal
              </Button>
            </>
          }
        >
          <Textarea label="Reason" rows={3} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Modal>
      )}
    </>
  )
}
