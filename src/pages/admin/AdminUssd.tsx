import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Smartphone, Trash2, Pencil } from 'lucide-react'
import { api, errorMessage, type AdminUssdService } from '../../lib/api'
import { EmptyState, IconButton, PageHeader } from '../../components/ui'
import DataTable, { type Column } from '../../components/DataTable'
import { TableViewSkeleton } from '../../components/Loading'
import UssdServiceModal from '../../components/admin/UssdServiceModal'
import { RefreshButton } from '../../components/admin/parts'
import { confirmDelete } from '../../store/confirm'
import { toast } from '../../store/toast'

// Every USSD code on the platform and whose it is. New ones are assigned from an organisation's own page; here they can be
// looked up (with the addresses Hubtel needs), switched off or removed.
export default function AdminUssd() {
  const [rows, setRows] = useState<AdminUssdService[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminUssdService | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows((await api.get<AdminUssdService[]>('/admin/ussd-services')).data)
    } catch (e) {
      toast.fromError(e)
      setRows((r) => r ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const remove = async (s: AdminUssdService) => {
    if (!(await confirmDelete({ title: `Remove ${s.shortcode}?`, message: `Voters dialling ${s.shortcode} will get "service not available" until a code is assigned again. ${s.organisation ?? 'The organisation'} and its candidates are not touched.`, confirmLabel: 'Remove code' }))) return
    try {
      await api.delete(`/admin/ussd-services/${s.id}`)
      toast.success('USSD code removed', s.shortcode)
      await load()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const columns: Column<AdminUssdService>[] = [
    { key: 'code', header: 'USSD code', mobileWide: true, className: 'font-display text-lg font-bold', cell: (s) => s.shortcode },
    { key: 'label', header: 'Welcome line', cell: (s) => `Welcome to ${s.label}` },
    { key: 'org', header: 'Organisation', cell: (s) => (s.organisation ? <Link to={`/admin/organisations/${s.orgId}`} className="font-semibold hover:underline">{s.organisation}</Link> : '—') },
    { key: 'status', header: 'Status', cell: (s) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.active ? 'bg-brand-tint text-[#0b5a43]' : 'bg-red-50 text-danger'}`}>{s.active ? 'On' : 'Off'}</span> },
    {
      key: 'actions',
      header: 'Actions',
      hideHeader: true,
      align: 'right',
      cell: (s) => (
        <div className="flex justify-end gap-2">
          <IconButton label={`Edit ${s.shortcode} and see its Hubtel addresses`} onClick={() => setEditing(s)}>
            <Pencil size={16} strokeWidth={1.8} aria-hidden="true" />
          </IconButton>
          <IconButton label={`Remove ${s.shortcode}`} tone="danger" onClick={() => remove(s)}>
            <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
          </IconButton>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="USSD codes" subtitle="The codes voters dial, one for each client. Assign a new one from the organisation's page." />
      <div className="flex justify-end">
        <RefreshButton onClick={load} busy={loading} />
      </div>
      {rows === null ? (
        <TableViewSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState icon={Smartphone} title="No USSD codes yet">
          Open an organisation and choose Assign a USSD code. Voting by phone starts working for that organisation as soon as it is saved and Hubtel has the addresses.
        </EmptyState>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(s) => s.id} caption="USSD codes" noun="USSD codes" minWidth={760} />
      )}
      {editing && <UssdServiceModal orgId={editing.orgId} orgName={editing.organisation ?? ''} service={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </>
  )
}
