import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ban, RotateCcw } from 'lucide-react'
import { Building2 } from 'lucide-react'
import { api, errorMessage, type AdminOrganisation } from '../../lib/api'
import { Button, EmptyState, IconButton, PageHeader } from '../../components/ui'
import CreateOrganisationModal from '../../components/admin/CreateOrganisationModal'
import DataTable, { type Column } from '../../components/DataTable'
import { TableViewSkeleton } from '../../components/Loading'
import { OrgChip, RefreshButton, SearchBox, useAdminList } from '../../components/admin/parts'
import { confirmDelete } from '../../store/confirm'
import { toast } from '../../store/toast'
import { formatDateTime, ghs } from '../../lib/format'
import { formatPhone, toLocalPhone } from '../../lib/phone'

export default function AdminOrganisations() {
  const [q, setQ] = useState('')
  const { rows, total, loaded, loading, reload, pagination, setRows } = useAdminList<AdminOrganisation>('organisations', { q: q.trim() || undefined })
  const [busy, setBusy] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  const toggle = async (o: AdminOrganisation) => {
    const suspend = o.status === 'active'
    if (suspend && !(await confirmDelete({ title: `Suspend ${o.name}?`, message: 'Its organisers are signed out of the dashboard straight away and cannot sign in until you reactivate it.', confirmLabel: 'Suspend' }))) return
    setBusy(o.id)
    try {
      const status = suspend ? 'suspended' : 'active'
      await api.patch(`/admin/organisations/${o.id}/status`, { status })
      setRows((all) => all.map((x) => (x.id === o.id ? { ...x, status } : x)))
      toast.success(suspend ? 'Organisation suspended' : 'Organisation reactivated')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const columns: Column<AdminOrganisation>[] = [
    { key: 'name', header: 'Organisation', sortValue: (o) => o.name, mobileWide: true, cell: (o) => <Link to={`/admin/organisations/${o.id}`} className="font-semibold hover:underline">{o.name}</Link> },
    {
      key: 'owner',
      header: 'Owner',
      cell: (o) =>
        o.owner ? (
          <div>
            <div>{o.owner.name}</div>
            <div className="text-xs text-muted">{o.owner.email} · {formatPhone(toLocalPhone(o.owner.phone))}</div>
          </div>
        ) : (
          '—'
        ),
    },
    { key: 'elections', header: 'Elections', align: 'right', sortValue: (o) => o.elections, cell: (o) => o.elections },
    { key: 'revenue', header: 'Revenue', align: 'right', sortValue: (o) => o.revenue, cell: (o) => ghs(o.revenue) },
    { key: 'paidOut', header: 'Paid out', align: 'right', sortValue: (o) => o.paidOut, cell: (o) => ghs(o.paidOut) },
    { key: 'joined', header: 'Joined', sortValue: (o) => o.createdAt, className: 'whitespace-nowrap', cell: (o) => formatDateTime(o.createdAt) },
    { key: 'status', header: 'Status', sortValue: (o) => o.status, cell: (o) => <OrgChip status={o.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      hideHeader: true,
      align: 'right',
      cell: (o) => (
        <IconButton label={o.status === 'active' ? `Suspend ${o.name}` : `Reactivate ${o.name}`} tone={o.status === 'active' ? 'danger' : 'brand'} disabled={busy === o.id} onClick={() => toggle(o)}>
          {o.status === 'active' ? <Ban size={17} strokeWidth={1.8} aria-hidden="true" /> : <RotateCcw size={17} strokeWidth={1.8} aria-hidden="true" />}
        </IconButton>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Organisations" subtitle="Everyone running events on BallotPolls." action={<Button onClick={() => setCreating(true)}>Create organisation</Button>} />
      {creating && <CreateOrganisationModal onClose={() => setCreating(false)} onCreated={reload} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={q} onChange={setQ} label="Search organisations" placeholder="Search by organisation name" />
        <RefreshButton onClick={reload} busy={loading} />
      </div>
      {!loaded ? (
        <TableViewSkeleton />
      ) : total === 0 ? (
        <EmptyState icon={Building2} title={q ? 'No match' : 'No organisations yet'}>
          {q ? 'Try a different name.' : 'Organisations appear here when someone registers.'}
        </EmptyState>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(o) => o.id} caption="Organisations" onRowClick={(o) => navigate(`/admin/organisations/${o.id}`)} serverPagination={pagination} noun="organisations" minWidth={980} />
      )}
    </>
  )
}
