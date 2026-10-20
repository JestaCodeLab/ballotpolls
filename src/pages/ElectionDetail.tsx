import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, errorMessage, type Category, type Election, type Nomination } from '../lib/api'
import { FileSpreadsheet, ListChecks, Plus, Tags } from 'lucide-react'
import { Avatar, Button, Card, EmptyState, LinkButton, PageHeader, StatusChip } from '../components/ui'
import AddCandidatesModal from '../components/AddCandidatesModal'
import ElectionSetupModal from '../components/ElectionSetupModal'
import ImportCandidates, { type ImportResult } from '../components/ImportCandidates'
import { codeLabel, formatRange, ghs } from '../lib/format'
import { toast } from '../store/toast'
import { DetailPageSkeleton } from '../components/Loading'
import { confirmDelete } from '../store/confirm'
import ElectionCategories from '../components/ElectionCategories'
import ElectionCover from '../components/ElectionCover'

const SHORTCODE = import.meta.env.VITE_USSD_SHORTCODE as string | undefined

export default function ElectionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [election, setElection] = useState<Election | null>(null)
  const [noms, setNoms] = useState<Nomination[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  // The category chooser: closed, or open (optionally straight on the "create" form).
  const [chooser, setChooser] = useState<null | 'pick' | 'create' | 'setup' | 'import'>(null)
  // The category whose "Add candidates" window is open.
  const [adding, setAdding] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()

  const load = useCallback(async () => {
    const [e, n, c] = await Promise.all([
      api.get<Election>(`/elections/${id}`),
      api.get<Nomination[]>(`/elections/${id}/nominations`),
      api.get<Category[]>('/categories'),
    ])
    setElection(e.data)
    setNoms(n.data)
    setCategories(c.data)
  }, [id])

  useEffect(() => {
    load().catch((e) => { setError(errorMessage(e)); toast.fromError(e) })
  }, [load])

  // Candidates stand in leaf categories only: a top-level category without children, or a sub-category.
  const leaves = useMemo(() => {
    const parents = new Set(categories.map((c) => c.parentId).filter(Boolean))
    const name = new Map(categories.map((c) => [c._id, c.name]))
    return categories
      .filter((c) => !parents.has(c._id))
      .map((c) => ({ ...c, parentName: c.parentId ? name.get(c.parentId) : undefined }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [categories])

  // The categories this election uses. An older election has no list and uses every category.
  const chosen = useMemo(
    () => (election?.categoryIds ? leaves.filter((l) => election.categoryIds!.includes(l._id)) : leaves),
    [election, leaves],
  )
  const lockedIds = useMemo(() => new Set(noms.map((n) => n.categoryId)), [noms])

  // Straight after an election is created the form sends people here with ?setup=1: offer the setup choices once.
  const wantsSetup = params.get('setup') === '1'
  useEffect(() => {
    if (!wantsSetup || !election) return
    setChooser('setup')
    setParams({}, { replace: true })
  }, [wantsSetup, election, setParams])

  const afterImport = async (r: ImportResult) => {
    setChooser(null)
    await load()
    const people = r.nominationsAdded
    toast.success(
      `${people} candidate${people === 1 ? '' : 's'} imported`,
      [r.categoriesCreated ? `${r.categoriesCreated} categor${r.categoriesCreated === 1 ? 'y' : 'ies'} created` : '', r.candidatesMatched ? `${r.candidatesMatched} matched from your library` : '']
        .filter(Boolean)
        .join(' · ') || undefined,
    )
    if (r.skipped.length) toast.error(`${r.skipped.length} row${r.skipped.length === 1 ? '' : 's'} not imported`, r.skipped.slice(0, 2).map((s) => `${s.name}: ${s.reason}`).join(' '))
  }

  const removeNomination = async (n: Nomination) => {
    const ok = await confirmDelete({
      title: `Remove ${n.candidate.name}?`,
      message: 'They will be taken out of this category. Their code in it will no longer work.',
      confirmLabel: 'Remove candidate',
    })
    if (!ok) return
    try {
      await api.delete(`/elections/${id}/nominations/${n.id}`)
      await load()
      toast.success('Candidate removed', `${n.candidate.name} is no longer in this category.`)
    } catch (err) {
      toast.fromError(err)
    }
  }

  const removeElection = async () => {
    if (!election) return
    const ok = await confirmDelete({
      title: `Delete ${election.name}?`,
      message: 'Its nominations will be removed too. This cannot be undone.',
      confirmLabel: 'Delete election',
    })
    if (!ok) return
    try {
      await api.delete(`/elections/${id}`)
      toast.success('Election deleted')
      navigate('/elections')
    } catch (err) {
      toast.fromError(err)
    }
  }

  if (!election) return error ? <p className="text-muted">{error}</p> : <DetailPageSkeleton />

  const closed = election.status === 'closed'
  const upcoming = election.status === 'upcoming'

  return (
    <>
      <PageHeader
        back={{ to: '/elections', label: 'Back to elections' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {election.name} <StatusChip status={election.status} />
          </span>
        }
        subtitle={formatRange(election.startsAt, election.endsAt)}
        action={
          !closed && (
            <LinkButton to={`/elections/${id}/edit`} variant="secondary">
              Edit details
            </LinkButton>
          )
        }
      />

      <div className="flex flex-wrap items-start gap-6">
        <Card className="min-w-[320px] flex-[2] space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold">Nominations</h2>
              <p className="mt-1 text-sm text-muted">Pick a category and choose who stands in it. A candidate can stand in more than one.</p>
            </div>
            {!closed && (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setChooser('import')} className="min-h-10 shrink-0 gap-2 px-4 text-sm">
                  <FileSpreadsheet size={16} strokeWidth={1.8} aria-hidden="true" />
                  Import
                </Button>
                {chosen.length > 0 && (
                  <Button variant="secondary" onClick={() => setChooser('pick')} className="min-h-10 shrink-0 gap-2 px-4 text-sm">
                    <ListChecks size={16} strokeWidth={1.8} aria-hidden="true" />
                    Manage categories
                  </Button>
                )}
              </div>
            )}
          </div>

          {chosen.length === 0 ? (
            closed ? (
              <p className="rounded-[10px] bg-ground px-4 py-3.5 text-sm text-muted">No categories were chosen for this election.</p>
            ) : (
              <EmptyState
                size="sm"
                icon={Tags}
                title="Choose the categories for this election"
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    {leaves.length > 0 && <Button onClick={() => setChooser('pick')}>Use existing categories</Button>}
                    <Button variant={leaves.length > 0 ? 'secondary' : 'primary'} onClick={() => setChooser('create')} className="gap-2">
                      <Plus size={16} strokeWidth={2} aria-hidden="true" />
                      Create a new category
                    </Button>
                  </div>
                }
              >
                {leaves.length > 0
                  ? 'Pick from the categories you already have, or create new ones for this election. Candidates are nominated into the categories you choose.'
                  : 'You have no categories yet. Create the first one, then nominate candidates into it.'}
              </EmptyState>
            )
          ) : (
            <ul>
              {chosen.map((cat) => {
                const mine = noms.filter((n) => n.categoryId === cat._id)
                return (
                  <li key={cat._id} className="border-t border-line py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-[180px] flex-1">
                        <div className="text-base font-semibold">{cat.name}</div>
                        {cat.parentName && <div className="text-[13px] text-muted">{cat.parentName}</div>}
                      </div>
                      {mine.length === 0 && <span className="text-[13px] text-muted">No candidates yet</span>}
                      {!closed && (
                        <Button variant="secondary" onClick={() => setAdding(cat._id)} className="min-h-11">
                          Add candidates
                        </Button>
                      )}
                    </div>
                    {mine.length > 0 && (
                      <ul className="mt-2">
                        {mine.map((n) => (
                          <li key={n.id} className="flex min-h-[52px] items-center gap-3 border-t border-[#eef2f0]">
                            <Avatar name={n.candidate.name} src={n.candidate.imageUrl} size={36} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px]">{n.candidate.name}</span>
                              {!upcoming && <span className="block text-xs text-muted sm:hidden">{n.voteCount.toLocaleString()} votes</span>}
                            </span>
                            {!upcoming && <span className="hidden text-sm text-muted sm:inline">{n.voteCount.toLocaleString()} votes</span>}
                            <span className="hidden text-[13px] text-muted sm:inline">Code</span>
                            <span className="rounded-lg bg-ground px-2.5 py-1 text-[15px] font-bold">{codeLabel(n.code)}</span>
                            {upcoming && (
                              <button onClick={() => removeNomination(n)} aria-label={`Remove ${n.candidate.name}`} className="flex h-11 w-11 items-center justify-center rounded-[10px] text-danger hover:bg-red-50">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                  <path d="M6 6l12 12M18 6L6 18" />
                                </svg>
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          <p className="rounded-[10px] bg-ground px-4 py-3.5 text-sm leading-relaxed text-muted">
            Voters pick a sub-category first, so a category with sub-categories is listed by its sub-categories. To rename or delete categories, go to{' '}
            <Link to="/categories" className="font-semibold text-brand hover:underline">Categories</Link>.
          </p>
        </Card>

        <aside className="flex min-w-[280px] flex-1 flex-col gap-4">
          <ElectionCover src={election.coverImageUrl} name={election.name} className="aspect-video w-full rounded-[14px]" />
          <div className="rounded-[14px] bg-ink p-6 text-[#e8efeb]">
            <div className="text-[13px] text-[#a9bbb3]">{SHORTCODE ? 'Voters dial' : 'Voters enter event code'}</div>
            {SHORTCODE && <div className="mt-2 font-display text-4xl font-bold">{SHORTCODE}</div>}
            <div className={`${SHORTCODE ? 'mt-2.5 text-[15px]' : 'mt-2'}`}>
              {SHORTCODE && 'Then enter event code '}
              <strong className="rounded-md bg-accent px-2 py-0.5 text-ink">{election.eventCode}</strong>
            </div>
          </div>
          <Card className="p-5">
            <div className="text-sm font-semibold">Price per vote</div>
            <div className="mt-1.5 font-display text-3xl font-bold tracking-tight">{ghs(election.pricePerVote)}</div>
            <p className="mt-1 text-sm leading-relaxed text-muted">Each voter pays this amount for one vote.</p>
          </Card>
          {upcoming && (
            <Button variant="danger" onClick={removeElection}>
              Delete election
            </Button>
          )}
        </aside>
      </div>
      {(chooser === 'pick' || chooser === 'create') && (
        <ElectionCategories
          election={election}
          categories={categories}
          lockedIds={lockedIds}
          startCreating={chooser === 'create'}
          onClose={() => setChooser(null)}
          onSaved={(e, all) => {
            setElection(e)
            setCategories(all)
            setChooser(null)
            // The next step once categories are chosen is putting candidates in them: open the first empty one.
            const parents = new Set(all.map((c) => c.parentId).filter(Boolean))
            const used = new Set(noms.map((n) => n.categoryId))
            const next = all.find((c) => !parents.has(c._id) && (!e.categoryIds || e.categoryIds.includes(c._id)) && !used.has(c._id))
            if (next) {
              setAdding(next._id)
              toast.success('Categories saved', `Now add candidates to ${next.name}.`)
            } else toast.success('Categories updated')
          }}
        />
      )}
      {chooser === 'setup' && <ElectionSetupModal election={election} categories={categories} onClose={() => setChooser(null)} onImported={afterImport} />}
      {chooser === 'import' && <ImportCandidates election={election} categories={categories} onClose={() => setChooser(null)} onImported={afterImport} />}
      {adding && chosen.some((c) => c._id === adding) && (
        <AddCandidatesModal
          election={election}
          categories={chosen.map((c) => ({ _id: c._id, name: c.name, parentName: c.parentName, label: c.parentName ? `${c.name} (${c.parentName})` : c.name }))}
          initialCategoryId={adding}
          noms={noms}
          onClose={() => setAdding(null)}
          onChanged={load}
        />
      )}
    </>
  )
}
