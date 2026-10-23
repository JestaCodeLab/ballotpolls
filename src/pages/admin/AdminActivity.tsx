import { useState } from 'react'
import { Link } from 'react-router-dom'
import { History } from 'lucide-react'
import type { ActivityEntry } from '../../lib/api'
import { EmptyState, PageHeader, Select } from '../../components/ui'
import DataTable, { type Column } from '../../components/DataTable'
import { TableViewSkeleton } from '../../components/Loading'
import { RefreshButton, SearchBox, useAdminList } from '../../components/admin/parts'
import { formatDateTime } from '../../lib/format'

type Tone = 'green' | 'blue' | 'amber' | 'red' | 'grey'
const TONE: Record<Tone, string> = {
  green: 'bg-brand-tint text-[#0b5a43]',
  blue: 'bg-[#dce3f2] text-[#1f3a6b]',
  amber: 'bg-[#fcefd0] text-[#6b4300]',
  red: 'bg-red-50 text-danger',
  grey: 'bg-[#e6ede9] text-[#3f4f49]',
}

// What each kind of action is called on screen, and the colour that groups it.
const TYPES: Record<string, { label: string; tone: Tone }> = {
  registered: { label: 'Registered', tone: 'green' },
  phone_verified: { label: 'Phone verified', tone: 'green' },
  phone_verified_by_admin: { label: 'Phone verified by admin', tone: 'blue' },
  election_created: { label: 'Election created', tone: 'green' },
  election_closed: { label: 'Voting closed early', tone: 'amber' },
  election_deleted: { label: 'Election deleted', tone: 'red' },
  election_restored: { label: 'Election restored', tone: 'blue' },
  candidates_imported: { label: 'Candidates imported', tone: 'green' },
  withdrawal_requested: { label: 'Withdrawal requested', tone: 'amber' },
  withdrawal_approved: { label: 'Withdrawal approved', tone: 'blue' },
  withdrawal_released: { label: 'Withdrawal released', tone: 'green' },
  withdrawal_rejected: { label: 'Withdrawal rejected', tone: 'red' },
  organisation_suspended: { label: 'Organisation suspended', tone: 'red' },
  organisation_reactivated: { label: 'Organisation reactivated', tone: 'blue' },
  sms_sent: { label: 'SMS sent', tone: 'grey' },
}

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
]
const KINDS = [{ value: '', label: 'All activity' }, ...Object.entries(TYPES).map(([value, t]) => ({ value, label: t.label }))]

const columns: Column<ActivityEntry>[] = [
  { key: 'at', header: 'When', className: 'whitespace-nowrap', cell: (a) => formatDateTime(a.at) },
  {
    key: 'type',
    header: 'Event',
    cell: (a) => {
      const t = TYPES[a.type] ?? { label: a.type, tone: 'grey' as Tone }
      return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[t.tone]}`}>{t.label}</span>
    },
  },
  {
    key: 'actor',
    header: 'By',
    cell: (a) =>
      a.actor ? (
        <div>
          <div className="font-semibold">{a.actor}</div>
          <div className="text-xs text-muted">{a.role === 'superadmin' ? 'Super admin' : 'Organiser'}</div>
        </div>
      ) : (
        '—'
      ),
  },
  { key: 'org', header: 'Organisation', cell: (a) => (a.organisation && a.orgId ? <Link to={`/admin/organisations/${a.orgId}`} className="hover:underline">{a.organisation}</Link> : (a.organisation ?? '—')) },
  { key: 'summary', header: 'Details', mobileWide: true, className: 'min-w-[280px] leading-snug', cell: (a) => a.summary },
]

export default function AdminActivity() {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [range, setRange] = useState('7')
  const { rows, total, loaded, loading, reload, pagination } = useAdminList<ActivityEntry>('activity', { q: q.trim() || undefined, type: type || undefined, range })

  return (
    <>
      <PageHeader title="Activity" subtitle="What organisers and admins did on BallotPolls, newest first." />

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={setQ} label="Search activity" placeholder="Search by person, organisation or words" />
        <Select label="Kind of activity" hideLabel value={type} options={KINDS} onChange={setType} className="w-60" />
        <Select label="Date range" hideLabel value={range} options={RANGES} onChange={setRange} className="w-44" />
        <span className="ml-auto">
          <RefreshButton onClick={reload} busy={loading} />
        </span>
      </div>

      {!loaded ? (
        <TableViewSkeleton rows={8} />
      ) : total === 0 ? (
        <EmptyState icon={History} title={q || type ? 'No match' : 'No activity yet'}>
          {q || type ? 'Try another search, kind of activity or date range.' : 'Registrations, elections, imports and withdrawals show up here as they happen.'}
        </EmptyState>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(a) => a.id} caption="Activity" serverPagination={pagination} noun="events" minWidth={980} />
      )}
    </>
  )
}
