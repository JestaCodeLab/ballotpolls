import { useState } from 'react'
import { Eye, MessageSquare, RefreshCw } from 'lucide-react'
import { api, errorMessage, type SmsReportMeta, type SmsRow, type SmsStatus } from '../../../lib/api'
import { toast } from '../../../store/toast'
import { Button, Card, EmptyState, IconButton, PageHeader, Select } from '../../../components/ui'
import Modal from '../../../components/Modal'
import DataTable, { type Column } from '../../../components/DataTable'
import { StatCardsSkeleton, TableViewSkeleton, Loading } from '../../../components/Loading'
import { SearchBox, useAdminList } from '../../../components/admin/parts'
import { formatDateTime } from '../../../lib/format'
import { formatPhone, toLocalPhone } from '../../../lib/phone'

const TONE: Record<SmsStatus, string> = {
  delivered: 'bg-brand-tint text-[#0b5a43]',
  sent: 'bg-[#dce3f2] text-[#1f3a6b]',
  failed: 'bg-red-50 text-danger',
}

// The status word as FlockText gave it ("delivered"), capitalised; our own word when it gave none.
const statusLabel = (m: SmsRow) => {
  const word = m.providerStatus?.trim() || m.status
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
]
const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
]

const Field = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <div className="border-t border-line py-2.5 first:border-t-0">
    <dt className="text-xs text-muted">{k}</dt>
    <dd className="mt-0.5 break-words text-sm">{children}</dd>
  </div>
)

export default function AdminSmsReport() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [range, setRange] = useState('7')
  const [viewing, setViewing] = useState<SmsRow | null>(null)
  const [checking, setChecking] = useState<string | null>(null)
  const { rows, total, meta, loaded, pagination, setRows } = useAdminList<SmsRow, SmsReportMeta>('sms/messages', { q: q.trim() || undefined, status: status || undefined, range })
  const s = meta?.stats

  // Asks FlockText what became of one message, and shows the answer in place.
  const check = async (m: SmsRow) => {
    setChecking(m.id)
    try {
      const { data } = await api.post<SmsRow>(`/admin/sms/messages/${m.id}/refresh`)
      setRows((all) => all.map((x) => (x.id === m.id ? data : x)))
      setViewing((v) => (v?.id === m.id ? data : v))
      toast.success(`Status: ${statusLabel(data)}`)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setChecking(null)
    }
  }

  const columns: Column<SmsRow>[] = [
    { key: 'sent', header: 'Sent', className: 'whitespace-nowrap', cell: (m) => formatDateTime(m.sentAt) },
    { key: 'phone', header: 'Phone', className: 'whitespace-nowrap', cell: (m) => formatPhone(toLocalPhone(m.phone)) },
    { key: 'text', header: 'Message', mobileWide: true, cell: (m) => <span title={m.text} className="block max-w-[340px] truncate">{m.text}</span> },
    { key: 'credits', header: 'Credits', align: 'right', cell: (m) => m.credits },
    { key: 'status', header: 'Status', cell: (m) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[m.status]}`}>{statusLabel(m)}</span> },
    { key: 'delivered', header: 'Delivered', className: 'whitespace-nowrap text-muted', cell: (m) => (m.deliveredAt ? formatDateTime(m.deliveredAt) : '—') },
    {
      key: 'actions',
      header: 'Actions',
      hideHeader: true,
      align: 'right',
      cell: (m) => (
        <div className="flex justify-end gap-2">
          <IconButton label={`Check status of message to ${formatPhone(toLocalPhone(m.phone))}`} disabled={checking === m.id} onClick={() => check(m)}>
            <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" className={checking === m.id ? 'animate-spin' : ''} />
          </IconButton>
          <IconButton label={`View message to ${formatPhone(toLocalPhone(m.phone))}`} onClick={() => setViewing(m)}>
            <Eye size={16} strokeWidth={1.8} aria-hidden="true" />
          </IconButton>
        </div>
      ),
    },
  ]

  const tiles = s && [
    { label: 'Messages', value: s.total, note: RANGES.find((r) => r.value === range)?.label },
    { label: 'Delivered', value: s.delivered, note: s.total ? `${Math.round((s.delivered / s.total) * 100)}% of messages` : '' },
    { label: 'Sent', value: s.sent, note: 'Accepted, not confirmed yet' },
    { label: 'Failed', value: s.failed, note: 'Open a message for the reason' },
  ]

  return (
    <>
      <PageHeader title="Delivery report" subtitle="Every message sent from BallotPolls, to whom, and whether it arrived." />

      {!tiles ? (
        <Loading label="Loading figures">
          <StatCardsSkeleton />
        </Loading>
      ) : (
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map((t) => (
            <Card key={t.label} className="p-5">
              <div className="text-sm text-muted">{t.label}</div>
              <div className="mt-1 font-display text-3xl font-bold tracking-tight">{t.value.toLocaleString()}</div>
              <div className="mt-1 text-[13px] text-muted">{t.note}</div>
            </Card>
          ))}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={setQ} label="Search messages" placeholder="Search by phone or message" />
        <div role="group" aria-label="Status filter" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={status === f.value}
              onClick={() => setStatus(f.value)}
              className={`min-h-11 rounded-full border px-[18px] text-sm font-semibold ${status === f.value ? 'border-ink bg-ink text-white' : 'border-field bg-white hover:bg-ground'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Select label="Date range" hideLabel value={range} options={RANGES} onChange={setRange} className="ml-auto w-44" />
      </div>

      {!loaded ? (
        <TableViewSkeleton rows={8} />
      ) : total === 0 ? (
        <EmptyState icon={MessageSquare} title={q || status ? 'No match' : 'No messages yet'}>
          {q || status ? 'Try another search, status or date range.' : 'Messages you send from Send SMS appear here.'}
        </EmptyState>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(m) => m.id} caption="Delivery report" serverPagination={pagination} noun="messages" minWidth={900} />
      )}

      {viewing && (
        <Modal
          title="Message"
          description={`${formatPhone(toLocalPhone(viewing.phone))}${viewing.name ? ` · ${viewing.name}` : ''}${viewing.organisation ? `, ${viewing.organisation}` : ''}`}
          onClose={() => setViewing(null)}
          footer={
            <>
              <Button variant="secondary" disabled={checking === viewing.id} onClick={() => check(viewing)}>
                {checking === viewing.id ? 'Checking…' : 'Check status'}
              </Button>
              <Button onClick={() => setViewing(null)}>Close</Button>
            </>
          }
        >
          <p className="whitespace-pre-line rounded-[10px] bg-ground p-3.5 text-[15px] leading-relaxed">{viewing.text}</p>
          <dl className="mt-3">
            <Field k="Status">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[viewing.status]}`}>{statusLabel(viewing)}</span>
            </Field>
            <Field k="Sent">{formatDateTime(viewing.sentAt)}</Field>
            {viewing.deliveredAt && <Field k="Delivered">{formatDateTime(viewing.deliveredAt)}</Field>}
            <Field k="Credits used">{viewing.credits}</Field>
            {viewing.senderId && <Field k="Sender ID">{viewing.senderId}</Field>}
            {viewing.providerRef && <Field k="FlockText reference">{viewing.providerRef}</Field>}
            {viewing.failureReason && <Field k="Failure reason">{viewing.failureReason}</Field>}
            {viewing.providerReply && <Field k="FlockText reply"><code className="break-all text-xs">{viewing.providerReply}</code></Field>}
          </dl>
        </Modal>
      )}
    </>
  )
}
