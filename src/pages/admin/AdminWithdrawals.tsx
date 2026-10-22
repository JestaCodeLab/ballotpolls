import { useCallback, useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { api, errorMessage, type AdminWithdrawal } from '../../lib/api'
import { Button, EmptyState, PageHeader, Textarea } from '../../components/ui'
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
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<AdminWithdrawal | null>(null)
  const [reason, setReason] = useState('')

  const load = useCallback(async (t: Tab) => {
    setLoaded(false)
    try {
      setRows((await api.get<AdminWithdrawal[]>('/admin/withdrawals', { params: { status: t } })).data)
    } catch (e) {
      toast.fromError(e)
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    load(tab)
  }, [tab, load])

  const act = async (w: AdminWithdrawal, action: 'approve' | 'release' | 'reject', body: object = {}) => {
    setBusy(w.id)
    try {
      await api.post(`/admin/withdrawals/${w.id}/${action}`, body)
      toast.success(action === 'approve' ? 'Withdrawal approved' : action === 'release' ? 'Marked as released' : 'Withdrawal rejected')
      setRejecting(null)
      setReason('')
      await load(tab)
    } catch (e) {
      toast.error(errorMessage(e))
      await load(tab)
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
              <div className="flex flex-wrap justify-end gap-2">
                {w.status === 'pending' && (
                  <Button variant="secondary" disabled={busy === w.id} onClick={() => act(w, 'approve')} className="min-h-9 px-4 text-sm">
                    Approve
                  </Button>
                )}
                <Button disabled={busy === w.id} onClick={() => release(w)} className="min-h-9 px-4 text-sm">
                  Mark released
                </Button>
                <Button variant="danger" disabled={busy === w.id} onClick={() => setRejecting(w)} className="min-h-9 px-4 text-sm">
                  Reject
                </Button>
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
            onClick={() => setTab(t.id)}
            className={`min-h-10 rounded-full px-4 text-sm font-semibold ${tab === t.id ? 'bg-ink text-white' : 'border border-line bg-white hover:bg-ground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!loaded ? (
        <TableViewSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState icon={Wallet} title={`No ${tab} withdrawals`}>
          {tab === 'pending' ? 'You are all caught up.' : 'Nothing here yet.'}
        </EmptyState>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(w) => w.id} caption={`${tab} withdrawals`} initialSort={{ key: 'when', dir: 'asc' }} minWidth={920} />
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
