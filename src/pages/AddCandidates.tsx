import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, errorMessage, type Candidate, type Category, type Election, type Nomination } from '../lib/api'
import { Plus, SearchX, Tags, UserPlus, Users } from 'lucide-react'
import { Avatar, Button, Card, EmptyState, LinkButton, PageHeader, Select } from '../components/ui'
import { codeLabel } from '../lib/format'
import { DetailPageSkeleton } from '../components/Loading'
import { toast } from '../store/toast'

export default function AddCandidates() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [election, setElection] = useState<Election | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [noms, setNoms] = useState<Nomination[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<Election>(`/elections/${id}`),
      api.get<Category[]>('/categories'),
      api.get<Candidate[]>('/candidates'),
      api.get<Nomination[]>(`/elections/${id}/nominations`),
    ])
      .then(([e, c, k, n]) => {
        setElection(e.data)
        setCategories(c.data)
        setCandidates(k.data)
        setNoms(n.data)
      })
      .catch((err) => { setError(errorMessage(err)); toast.fromError(err) })
  }, [id])

  const leaves = useMemo(() => {
    const parents = new Set(categories.map((c) => c.parentId).filter(Boolean))
    const name = new Map(categories.map((c) => [c._id, c.name]))
    return categories
      // Only the categories this election uses (an older election has no list and uses all of them).
      .filter((c) => !election?.categoryIds || election.categoryIds.includes(c._id))
      .filter((c) => !parents.has(c._id))
      .map((c) => ({ ...c, label: c.parentId ? `${c.name} (${name.get(c.parentId)})` : c.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [categories, election])

  const categoryId = params.get('category') ?? leaves[0]?._id ?? ''
  const category = leaves.find((c) => c._id === categoryId)
  const inCategory = noms.filter((n) => n.categoryId === categoryId)
  const alreadyIn = new Set(inCategory.map((n) => n.candidate.id))
  const catName = new Map(categories.map((c) => [c._id, c.name]))

  // Other categories of THIS election a candidate already stands in.
  const elsewhere = (candidateId: string) => [
    ...new Set(noms.filter((n) => n.candidate.id === candidateId && n.categoryId !== categoryId).map((n) => catName.get(n.categoryId) ?? '')),
  ]

  const shown = candidates.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
  const toggle = (cid: string) =>
    setPicked((s) => {
      const next = new Set(s)
      if (next.has(cid)) next.delete(cid)
      else next.add(cid)
      return next
    })

  const changeCategory = (cid: string) => {
    setPicked(new Set())
    setParams({ category: cid })
  }

  const submit = async () => {
    if (picked.size === 0) return toast.error('Choose at least one candidate to add')
    setBusy(true)
    try {
      const { data } = await api.post<{ added: string[]; skipped: string[] }>(`/elections/${id}/nominations`, {
        categoryId,
        candidateIds: [...picked],
      })
      const n = data.added.length
      toast.success(
        `${n} candidate${n === 1 ? '' : 's'} added`,
        data.skipped.length ? `${data.skipped.length} already in this category, skipped.` : `Now standing in ${category?.name}.`,
      )
      navigate(`/elections/${id}`)
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  if (!election) return error ? <p className="text-muted">{error}</p> : <DetailPageSkeleton />

  return (
    <>
      <PageHeader
        back={{ to: `/elections/${id}`, label: `Back to ${election.name}` }}
        title="Add candidates"
        action={
          <Select
            label="Category"
            value={categoryId}
            onChange={changeCategory}
            options={leaves.map((c) => ({ value: c._id, label: c.label }))}
            className="min-w-64"
          />
        }
      />

      {leaves.length === 0 ? (
        <EmptyState icon={Tags} title="This election has no categories yet" action={<LinkButton to={`/elections/${id}`}>Choose categories</LinkButton>}>
          Pick the categories this election uses, or create new ones, then come back to nominate candidates.
        </EmptyState>
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          <Card className="min-w-[320px] flex-[3] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold">Your candidates</h2>
              <LinkButton to="/candidates/new" variant="secondary" className="gap-2">
                <Plus size={18} strokeWidth={2} aria-hidden="true" />
                New candidate
              </LinkButton>
            </div>
            <input
              type="search"
              aria-label="Search candidates"
              placeholder="Search by name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[46px] w-full rounded-[10px] border border-field bg-white px-3.5 outline-none focus:border-brand"
            />
            {candidates.length === 0 ? (
              <EmptyState size="sm" icon={Users} title="Your library is empty" action={<LinkButton to="/candidates/new" variant="secondary">Create a candidate</LinkButton>}>Add candidates to your library, then nominate them here.</EmptyState>
            ) : (
              <ul>
                {shown.map((c) => {
                  const added = alreadyIn.has(c._id)
                  const other = elsewhere(c._id)
                  return (
                    <li key={c._id} className="border-t border-[#eef2f0]">
                      <label className={`flex min-h-16 items-center gap-3.5 px-1 py-1.5 ${added ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          className="h-[22px] w-[22px] shrink-0 accent-brand"
                          checked={added || picked.has(c._id)}
                          disabled={added}
                          onChange={() => toggle(c._id)}
                        />
                        <Avatar name={c.name} src={c.imageUrl} size={44} />
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-semibold">{c.name}</div>
                          <div className="text-[13px] text-muted">
                            {added ? 'Already in this category' : other.length ? `Also standing in ${other.join(', ')}` : 'Not in any category of this election'}
                          </div>
                        </div>
                      </label>
                    </li>
                  )
                })}
                {shown.length === 0 && <EmptyState size="sm" icon={SearchX} title={`No candidates match “${query}”`}>Check the spelling or clear the search box.</EmptyState>}
              </ul>
            )}
          </Card>

          <aside className="flex min-w-[280px] flex-[2] flex-col gap-4">
            <Card>
              <h2 className="font-display text-xl font-bold">Standing in {category?.name}</h2>
              <p className="mb-3.5 mt-1 text-sm text-muted">Voters type the code to pick them.</p>
              <ol>
                {inCategory.map((n) => (
                  <li key={n.id} className="flex min-h-14 items-center gap-3 border-t border-[#eef2f0]">
                    <span className="w-11 rounded-lg bg-ground py-1 text-center font-bold">{codeLabel(n.code)}</span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{n.candidate.name}</span>
                    <span className="rounded-full bg-[#e6ede9] px-2 py-0.5 text-xs font-semibold text-[#3f4f49]">Added</span>
                  </li>
                ))}
                {candidates
                  .filter((c) => picked.has(c._id))
                  .map((c, i) => (
                    <li key={c._id} className="flex min-h-14 items-center gap-3 border-t border-[#eef2f0]">
                      <span className="w-11 rounded-lg bg-ground py-1 text-center font-bold">{codeLabel((inCategory.reduce((m, n) => Math.max(m, n.code), 0)) + i + 1)}</span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{c.name}</span>
                      <span className="rounded-full bg-brand-tint px-2 py-0.5 text-xs font-semibold text-[#0b5a43]">New</span>
                      <button onClick={() => toggle(c._id)} aria-label={`Remove ${c.name}`} className="flex h-11 w-11 items-center justify-center rounded-[10px] text-muted hover:bg-ground">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </li>
                  ))}
                {inCategory.length === 0 && picked.size === 0 && <EmptyState size="sm" icon={UserPlus} title="Nobody yet">Tick candidates on the left to add them.</EmptyState>}
              </ol>
            </Card>
            <div className="flex flex-wrap gap-3">
              <Button onClick={submit} disabled={busy} className="min-h-12 flex-1">
                {busy ? 'Adding…' : picked.size ? `Add ${picked.size} candidate${picked.size > 1 ? 's' : ''}` : 'Add candidates'}
              </Button>
              <LinkButton to={`/elections/${id}`} variant="secondary" className="min-h-12">
                Done
              </LinkButton>
            </div>
            <p className="text-[13px] leading-relaxed text-muted">
              A candidate can stand in several categories. They get a separate code and a separate vote count in each.
            </p>
          </aside>
        </div>
      )}
    </>
  )
}
