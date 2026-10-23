import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, Pencil, Trash2 } from 'lucide-react'
import { api, errorMessage, type AdminElectionRow, type AdminOrganisationDetail } from '../../lib/api'
import { Button, Card, EmptyState, IconButton, IconLink, Input, PageHeader, Select, StatusChip } from '../../components/ui'
import Modal from '../../components/Modal'
import DataTable, { type Column } from '../../components/DataTable'
import { DetailPageSkeleton } from '../../components/Loading'
import { OrgChip } from '../../components/admin/parts'
import { confirmDelete } from '../../store/confirm'
import { toast } from '../../store/toast'
import { formatDateTime, ghs } from '../../lib/format'
import { formatPhone, toLocalPhone } from '../../lib/phone'

type Tab = 'details' | 'elections'

export default function AdminOrganisationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [org, setOrg] = useState<AdminOrganisationDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('details')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'active' | 'suspended'>('active')
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [typed, setTyped] = useState('')

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<AdminOrganisationDetail>(`/admin/organisations/${id}`)
      setOrg(data)
      setName(data.name)
      setStatus(data.status)
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (error) return <p className="text-muted">{error}</p>
  if (!org) return <DetailPageSkeleton />

  const dirty = name.trim() !== org.name || status !== org.status

  const save = async (next: { name: string; status: 'active' | 'suspended' }) => {
    if (next.name.trim().length < 2) return toast.error('Enter the organisation name')
    if (next.status === 'suspended' && org.status === 'active' && !(await confirmDelete({ title: `Suspend ${org.name}?`, message: 'Its organisers are signed out of the dashboard straight away and cannot sign in until you reactivate it.', confirmLabel: 'Suspend' }))) return
    setBusy(true)
    try {
      await api.patch(`/admin/organisations/${id}`, next)
      toast.success('Changes saved')
      await load()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save({ name, status })
  }

  const remove = async () => {
    setBusy(true)
    try {
      await api.delete(`/admin/organisations/${id}`, { data: { confirmName: typed } })
      toast.success('Organisation deleted', 'It and all its data are gone.')
      navigate('/admin/organisations')
    } catch (err) {
      toast.error(errorMessage(err))
      setBusy(false)
    }
  }

  const c = org.counts
  const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`

  const removeElection = async (el: AdminElectionRow) => {
    if (!(await confirmDelete({ title: `Delete ${el.name}?`, message: `This permanently removes the election, its nominations and its event code ${el.eventCode}. It has no payments. The organisation is told by notification. This cannot be undone.`, confirmLabel: 'Delete election' }))) return
    try {
      await api.delete(`/admin/elections/${el.id}`)
      toast.success('Election deleted')
      await load()
    } catch (err) {
      toast.error(errorMessage(err))
      await load()
    }
  }

  const columns: Column<AdminElectionRow>[] = [
    { key: 'name', header: 'Election', sortValue: (e) => e.name, mobileWide: true, cell: (e) => <span className="font-semibold">{e.name}</span> },
    { key: 'code', header: 'Code', className: 'font-bold tracking-wider', cell: (e) => e.eventCode },
    { key: 'status', header: 'Status', sortValue: (e) => e.status, cell: (e) => <StatusChip status={e.status} /> },
    { key: 'closes', header: 'Closes', sortValue: (e) => e.endsAt, className: 'whitespace-nowrap', cell: (e) => formatDateTime(e.endsAt) },
    { key: 'price', header: 'Price', align: 'right', sortValue: (e) => e.pricePerVote, cell: (e) => ghs(e.pricePerVote) },
    { key: 'votes', header: 'Votes', align: 'right', sortValue: (e) => e.votes, cell: (e) => e.votes.toLocaleString() },
    { key: 'revenue', header: 'Revenue', align: 'right', sortValue: (e) => e.revenue, cell: (e) => ghs(e.revenue) },
    {
      key: 'actions',
      header: 'Actions',
      hideHeader: true,
      align: 'right',
      cell: (e) => (
        <div className="flex justify-end gap-2">
          <IconLink to={`/admin/elections/${e.id}`} label={`Edit ${e.name}`}>
            <Pencil size={16} strokeWidth={1.8} aria-hidden="true" />
          </IconLink>
          <span title={e.locked ? 'It has payments, so it cannot be deleted.' : undefined}>
            <IconButton label={`Delete ${e.name}`} tone="danger" disabled={e.locked} onClick={() => removeElection(e)}>
              <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
            </IconButton>
          </span>
        </div>
      ),
    },
  ]

  const stats = [
    { label: 'Revenue', value: ghs(org.revenue) },
    { label: 'Paid out', value: ghs(org.paidOut) },
    { label: 'Elections', value: String(org.elections.length) },
    { label: 'Organisers', value: String(org.organisers.length) },
  ]

  return (
    <>
      <PageHeader
        back={{ to: '/admin/organisations', label: 'Back to organisations' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {org.name} <OrgChip status={org.status} />
          </span>
        }
        subtitle={`Joined ${formatDateTime(org.createdAt)}`}
        action={
          <Button variant="secondary" disabled={busy} onClick={() => save({ name: org.name, status: org.status === 'active' ? 'suspended' : 'active' })}>
            {org.status === 'active' ? 'Suspend' : 'Reactivate'}
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="text-sm text-muted">{s.label}</div>
            <div className="mt-1 font-display text-2xl font-bold tracking-tight">{s.value}</div>
          </Card>
        ))}
      </section>

      <div role="tablist" aria-label="Organisation sections" className="flex gap-1 border-b border-line">
        {(['details', 'elections'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            type="button"
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            onClick={() => setTab(t)}
            className={`-mb-px min-h-12 border-b-[3px] px-5 text-[15px] font-semibold ${tab === t ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {t === 'details' ? 'Details' : `Elections (${org.elections.length})`}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <section role="tabpanel" id="panel-details" aria-labelledby="tab-details" className="grid items-start gap-5 lg:grid-cols-3">
          <form onSubmit={submit} noValidate className="lg:col-span-2">
            <Card className="space-y-5">
              <h2 className="font-display text-xl font-bold">Organisation details</h2>
              <Input label="Organisation name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
              <Select
                label="Status"
                value={status}
                onChange={(v) => setStatus(v as 'active' | 'suspended')}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'suspended', label: 'Suspended' },
                ]}
              />
              <p className="-mt-2 text-[13px] text-muted">Suspending signs the organisers out straight away and stops them signing in. Voting on their elections continues until you also close them.</p>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" disabled={!dirty} onClick={() => { setName(org.name); setStatus(org.status) }}>
                  Discard
                </Button>
                <Button type="submit" disabled={!dirty || busy}>
                  {busy ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </Card>
          </form>

          <div className="space-y-5">
            <Card>
              <h2 className="mb-2 font-display text-xl font-bold">Organisers</h2>
              {org.organisers.length === 0 && <p className="text-sm text-muted">No organisers.</p>}
              {org.organisers.map((o) => (
                <div key={o.id} className="border-t border-line py-3 text-sm first:border-t-0">
                  <Link to={`/admin/users/${o.id}`} className="font-semibold hover:underline">
                    {o.name}
                  </Link>
                  <div className="text-muted">{o.email}</div>
                  <div className="text-muted">
                    {formatPhone(toLocalPhone(o.phone))} · {o.phoneVerified ? 'verified' : 'not verified'}
                  </div>
                </div>
              ))}
            </Card>
            <Card>
              <h2 className="mb-1.5 font-display text-xl font-bold">Delete organisation</h2>
              <p className="mb-4 text-sm leading-relaxed text-muted">Permanently removes the organisation and all of its data: organisers, elections, candidates, categories, payments and withdrawals. This cannot be undone. To stop it without losing anything, suspend it instead.</p>
              <Button variant="secondary" onClick={() => { setTyped(''); setDeleting(true) }} className="text-danger">
                Delete organisation
              </Button>
            </Card>
          </div>
        </section>
      )}

      {deleting && (
        <Modal
          title={`Delete ${org.name}?`}
          description="This permanently deletes the organisation and everything below. It cannot be undone."
          onClose={() => setDeleting(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleting(false)}>
                Cancel
              </Button>
              <Button variant="danger" disabled={typed.trim() !== org.name || busy} onClick={remove}>
                {busy ? 'Deleting…' : 'Delete everything'}
              </Button>
            </>
          }
        >
          <ul className="mb-4 list-disc space-y-1 pl-5 text-sm">
            <li>{plural(c.organisers, 'organiser')} (they are signed out and their accounts removed)</li>
            <li>{plural(c.elections, 'election')} with all nominations and votes</li>
            <li>{plural(c.candidates, 'candidate')} and {plural(c.categories, 'category', 'categories')}</li>
            <li>{plural(c.payments, 'payment record')} and {plural(c.withdrawals, 'withdrawal record')}, so the money history goes too</li>
          </ul>
          <Input label={`Type ${org.name} to confirm`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </Modal>
      )}

      {tab === 'elections' && (
        <section role="tabpanel" id="panel-elections" aria-labelledby="tab-elections" className="flex flex-col gap-3.5">
          <p className="text-sm text-muted">An election with payments cannot be deleted.</p>
          {org.elections.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No elections yet">
              This organisation has not created an election.
            </EmptyState>
          ) : (
            <DataTable columns={columns} rows={org.elections} rowKey={(e) => e.id} caption="Elections" initialSort={{ key: 'closes', dir: 'desc' }} minWidth={1000} />
          )}
        </section>
      )}
    </>
  )
}
