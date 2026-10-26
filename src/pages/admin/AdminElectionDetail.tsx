import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BarChart3, Coins, Download, Image as ImageIcon, Loader2, Pencil, Plus, Trash2, Vote, X } from 'lucide-react'
import { api, errorMessage, type AdminElectionDetail, type Category, type Nomination } from '../../lib/api'
import { Avatar, Button, Card, EmptyState, IconButton, LinkButton, PageHeader, StatIcon, StatusChip } from '../../components/ui'
import AddCandidatesModal from '../../components/admin/AddCandidatesModal'
import FlyerModal, { adminFlyerData } from '../../components/admin/FlyerModal'
import { downloadFlyer } from '../../lib/flyer'
import ElectionCover from '../../components/ElectionCover'
import { DetailPageSkeleton } from '../../components/Loading'
import { RefreshButton } from '../../components/admin/parts'
import { formatDateTime, ghs } from '../../lib/format'
import { toast } from '../../store/toast'
import { confirmDelete } from '../../store/confirm'

type Tab = 'details' | 'candidates'

const Row = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <div className="flex justify-between gap-4 border-t border-line py-2.5 text-sm first:border-t-0">
    <dt className="text-muted">{k}</dt>
    <dd className="text-right font-semibold">{children}</dd>
  </div>
)

// One election as the super admin sees it: its details, and every category with its candidates and how they are doing.
export default function AdminElectionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [e, setE] = useState<AdminElectionDetail | null>(null)
  const [noms, setNoms] = useState<Nomination[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search] = useSearchParams()
  const [tab, setTab] = useState<Tab>(search.get('tab') === 'candidates' ? 'candidates' : 'details')
  // Opens the add-candidates window; `category` is set when it was opened from one category's own button.
  const [adding, setAdding] = useState<{ category?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  // The candidate whose flyer is open, and the one being saved straight from the list.
  const [flyer, setFlyer] = useState<{ n: Nomination; category: string } | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [d, v] = await Promise.all([api.get<AdminElectionDetail>(`/admin/elections/${id}`), api.get<{ categories: Category[]; nominations: Nomination[] }>(`/admin/live/elections/${id}`)])
      setE(d.data)
      setNoms(v.data.nominations)
      setCategories(v.data.categories)
      setError(null)
    } catch (err) {
      if (e) toast.error(errorMessage(err))
      else setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
    // `e` is only read to choose between a toast and the page error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // Each category with its candidates, the leader first, and each one's share of that category's votes.
  const groups = useMemo(() => {
    const name = new Map(categories.map((c) => [c._id, c.name]))
    const ids = [...new Set(noms.map((n) => n.categoryId))]
    return ids
      .map((cid) => {
        const rows = noms.filter((n) => n.categoryId === cid).sort((a, b) => b.voteCount - a.voteCount || a.candidate.name.localeCompare(b.candidate.name))
        const total = rows.reduce((s, n) => s + n.voteCount, 0)
        return { id: cid, name: name.get(cid) ?? 'Category', rows, total }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [noms, categories])

  if (error) return <p className="text-muted">{error}</p>
  if (!e) return <DetailPageSkeleton />

  const saveFlyer = async (n: Nomination, category: string) => {
    setSaving(n.id)
    try {
      await downloadFlyer(adminFlyerData(e, n, category))
    } catch {
      toast.error('Could not make the flyer', 'Try again in a moment.')
    } finally {
      setSaving(null)
    }
  }

  const removeNomination = async (n: Nomination) => {
    if (!(await confirmDelete({ title: `Remove ${n.candidate.name}?`, message: 'They are taken out of this category and their voting code stops working. This is only possible while they have no votes.', confirmLabel: 'Remove candidate' }))) return
    try {
      await api.delete(`/admin/elections/${e.id}/nominations/${n.id}`)
      toast.success('Candidate removed', n.candidate.name)
      await load()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const back = e.organisation ? { to: `/admin/organisations/${e.organisation.id}`, label: `Back to ${e.organisation.name}` } : { to: '/admin/elections', label: 'Back to elections' }
  const started = e.status !== 'upcoming'
  const candidates = noms.length

  const remove = async () => {
    if (!(await confirmDelete({ title: `Delete ${e.name}?`, message: e.locked ? 'Voting stops and the election disappears for the organisation. Its votes and payments are kept, so earnings do not change, and you can restore it from the Deleted tab on the Elections page.' : `This permanently removes the election, its nominations and its event code ${e.eventCode}. The organisation is told by notification. This cannot be undone.`, confirmLabel: 'Delete election' }))) return
    try {
      await api.delete(`/admin/elections/${e.id}`)
      toast.success('Election deleted', e.name)
      navigate(e.organisation ? `/admin/organisations/${e.organisation.id}` : '/admin/elections')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <>
      <PageHeader
        back={back}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {e.name} <StatusChip status={e.status} />
          </span>
        }
        subtitle={`${formatDateTime(e.startsAt)} to ${formatDateTime(e.endsAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <RefreshButton onClick={load} busy={loading} />
            {started && (
              <LinkButton to={`/admin/results?election=${e.id}`} variant="secondary">
                <BarChart3 size={16} strokeWidth={1.8} aria-hidden="true" className="mr-2" />
                Live results
              </LinkButton>
            )}
            <LinkButton to={`/admin/elections/${e.id}/edit`} variant="secondary">
              <Pencil size={16} strokeWidth={1.8} aria-hidden="true" className="mr-2" />
              Edit
            </LinkButton>
            <Button type="button" variant="secondary" onClick={remove} className="text-danger">
              <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" className="mr-2" />
              Delete
            </Button>
          </div>
        }
      />

      <div role="tablist" aria-label="Election sections" className="flex gap-1 border-b border-line">
        {(['details', 'candidates'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            id={`etab-${t}`}
            type="button"
            aria-selected={tab === t}
            aria-controls={`epanel-${t}`}
            onClick={() => setTab(t)}
            className={`-mb-px min-h-12 border-b-[3px] px-5 text-[15px] font-semibold ${tab === t ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {t === 'details' ? 'Details' : `Categories & candidates (${candidates})`}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <section role="tabpanel" id="epanel-details" aria-labelledby="etab-details" className="grid items-start gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <section className="grid grid-cols-2 gap-4">
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm text-muted">Votes</div>
                  <StatIcon icon={Vote} />
                </div>
                <div className="mt-1 font-display text-3xl font-bold tracking-tight">{e.votes.toLocaleString()}</div>
              </Card>
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm text-muted">Revenue</div>
                  <StatIcon icon={Coins} />
                </div>
                <div className="mt-1 font-display text-3xl font-bold tracking-tight">{ghs(e.revenue)}</div>
              </Card>
            </section>
            <Card>
              <h2 className="mb-2 font-display text-xl font-bold">About</h2>
              {e.description ? <p className="whitespace-pre-line text-[15px] leading-relaxed">{e.description}</p> : <p className="text-sm text-muted">No description.</p>}
              <dl className="mt-4">
                <Row k="Organisation">
                  {e.organisation ? (
                    <Link to={`/admin/organisations/${e.organisation.id}`} className="text-brand hover:underline">
                      {e.organisation.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </Row>
                <Row k="Voting opens">{formatDateTime(e.startsAt)}</Row>
                <Row k="Voting closes">{formatDateTime(e.endsAt)}</Row>
                <Row k="Price per vote">{ghs(e.pricePerVote)}</Row>
                <Row k="Event code">
                  <span className="font-mono">{e.eventCode}</span>
                </Row>
                <Row k="Categories">{groups.length}</Row>
                <Row k="Candidates (nominations)">{candidates}</Row>
              </dl>
            </Card>
          </div>
          <ElectionCover src={e.coverImageUrl} name={e.name} className="aspect-video w-full rounded-[14px]" />
        </section>
      )}

      {tab === 'candidates' && (
        <section role="tabpanel" id="epanel-candidates" aria-labelledby="etab-candidates" className="flex flex-col gap-5">
          {e.status !== 'closed' && (
            <div className="flex justify-end">
              <Button type="button" onClick={() => setAdding({})}>
                <Plus size={16} strokeWidth={2} aria-hidden="true" className="mr-2" />
                Add candidates
              </Button>
            </div>
          )}
          {groups.length === 0 ? (
            <EmptyState icon={Vote} title="No candidates yet">
              This election has no nominations. Add candidates to a category, or the organiser can add them from their dashboard.
            </EmptyState>
          ) : (
            groups.map((g) => (
              <Card key={g.id} className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-[14px] border-b border-l-[5px] border-line border-l-brand bg-brand-tint/60 px-5 py-3">
                  <h2 className="font-display text-xl font-bold">{g.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#0b5a43]">
                      {g.rows.length} candidate{g.rows.length === 1 ? '' : 's'} · {g.total.toLocaleString()} vote{g.total === 1 ? '' : 's'}
                    </span>
                    {e.status !== 'closed' && (
                      <IconButton label={`Add candidates to ${g.name}`} tone="brand" onClick={() => setAdding({ category: g.id })}>
                        <Plus size={16} strokeWidth={2} aria-hidden="true" />
                      </IconButton>
                    )}
                  </div>
                </div>
                <ol>
                  {g.rows.map((n, i) => {
                    const share = g.total ? (n.voteCount / g.total) * 100 : 0
                    const leading = i === 0 && n.voteCount > 0
                    return (
                      <li key={n.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#eef2f0] px-5 py-3 first:border-t-0">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${leading ? 'bg-accent text-ink' : 'bg-ground text-muted'}`}>{i + 1}</span>
                        <Avatar name={n.candidate.name} src={n.candidate.imageUrl} size={36} />
                        <div className="min-w-[160px] flex-1">
                          <div className="truncate text-[15px] font-semibold">{n.candidate.name}</div>
                          <div className="text-xs text-muted">Code {n.code}</div>
                        </div>
                        <div className="flex min-w-[200px] flex-[2] items-center gap-3">
                          <div role="img" aria-label={`${Math.round(share)}% of the votes in ${g.name}`} className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#e6ede9]">
                            <div className={`h-full rounded-full ${leading ? 'bg-brand' : 'bg-brand/60'}`} style={{ width: `${share}%` }} />
                          </div>
                          <span className="w-12 text-right text-sm tabular-nums text-muted">{share.toFixed(share >= 10 || share === 0 ? 0 : 1)}%</span>
                        </div>
                        <div className="w-24 text-right font-display text-xl font-bold tabular-nums">{n.voteCount.toLocaleString()}</div>
                        <div className="flex gap-2">
                          <IconButton label={`Preview flyer for ${n.candidate.name}`} onClick={() => setFlyer({ n, category: g.name })}>
                            <ImageIcon size={16} strokeWidth={1.8} aria-hidden="true" />
                          </IconButton>
                          <IconButton label={`Download flyer for ${n.candidate.name}`} tone="brand" disabled={saving === n.id} onClick={() => saveFlyer(n, g.name)}>
                            {saving === n.id ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} strokeWidth={1.8} aria-hidden="true" />}
                          </IconButton>
                          <IconButton label={`Remove ${n.candidate.name} from ${g.name}`} tone="danger" onClick={() => removeNomination(n)}>
                            <X size={16} strokeWidth={2} aria-hidden="true" />
                          </IconButton>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </Card>
            ))
          )}
        </section>
      )}
      {adding && <AddCandidatesModal electionId={e.id} categoryId={adding.category} onClose={() => setAdding(null)} onDone={load} />}
      {flyer && <FlyerModal election={e} nomination={flyer.n} categoryName={flyer.category} onClose={() => setFlyer(null)} />}
    </>
  )
}
