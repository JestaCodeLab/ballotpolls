import { useEffect, useMemo, useState } from 'react'
import { api, type Candidate, type Election, type Nomination } from '../lib/api'
import { toast } from '../store/toast'
import { Avatar, Button, Input, Select, Textarea } from './ui'
import Modal from './Modal'
import type { ImportResult } from './ImportCandidates'

export interface LeafCategory {
  _id: string
  name: string
  label: string
  parentName?: string
}

interface Props {
  election: Election
  // The categories candidates can stand in for this election.
  categories: LeafCategory[]
  initialCategoryId: string
  noms: Nomination[]
  onClose: () => void
  // Called after anything is added, so the page behind can refresh.
  onChanged: () => Promise<void> | void
}

type Tab = 'existing' | 'new' | 'paste'
const TABS: { key: Tab; label: string }[] = [
  { key: 'existing', label: 'Choose existing' },
  { key: 'new', label: 'Create new' },
  { key: 'paste', label: 'Paste a list' },
]

const lc = (s: string) => s.trim().toLowerCase()

// "Ama Boateng" or "Ama Boateng, Highlife vocalist": one candidate per line, with an optional bio after a comma or tab.
const parsePasted = (text: string) => {
  const seen = new Set<string>()
  const out: { name: string; bio: string }[] = []
  let tooShort = 0
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const cut = line.search(/[,\t]/)
    const name = (cut < 0 ? line : line.slice(0, cut)).trim()
    const bio = cut < 0 ? '' : line.slice(cut + 1).trim()
    if (name.length < 2) {
      tooShort++
      continue
    }
    if (seen.has(lc(name))) continue
    seen.add(lc(name))
    out.push({ name, bio })
  }
  return { people: out, tooShort }
}

// Adds candidates to one category of an election without leaving the election page: pick people already in the
// library, create one, or paste a whole list. The window stays open so the next category is one click away.
export default function AddCandidatesModal({ election, categories, initialCategoryId, noms, onClose, onChanged }: Props) {
  const [categoryId, setCategoryId] = useState(initialCategoryId)
  const [tab, setTab] = useState<Tab>('existing')
  const [people, setPeople] = useState<Candidate[]>([])
  const [loadedPeople, setLoadedPeople] = useState(false)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [pasted, setPasted] = useState('')
  const [busy, setBusy] = useState(false)

  const category = categories.find((c) => c._id === categoryId)

  const loadPeople = async () => {
    try {
      setPeople((await api.get<Candidate[]>('/candidates')).data)
    } catch (err) {
      toast.fromError(err)
    } finally {
      setLoadedPeople(true)
    }
  }
  useEffect(() => {
    void loadPeople()
  }, [])

  const alreadyIn = useMemo(() => new Set(noms.filter((n) => n.categoryId === categoryId).map((n) => n.candidate.id)), [noms, categoryId])
  const shown = people.filter((p) => lc(p.name).includes(lc(query)))
  const pastedList = useMemo(() => parsePasted(pasted), [pasted])
  const known = new Set(people.map((p) => lc(p.name)))

  const finish = async (message: string) => {
    toast.success(message)
    await onChanged()
    await loadPeople()
  }

  const report = (r: ImportResult) => {
    if (r.skipped.length) toast.error(`${r.skipped.length} not added`, r.skipped.slice(0, 2).map((s) => `${s.name}: ${s.reason}`).join(' '))
  }

  // The category in the words the import understands: a category, or a sub-category under its parent.
  const place = () => (category?.parentName ? { category: category.parentName, subCategory: category.name } : { category: category?.name ?? '' })

  const addExisting = async () => {
    setBusy(true)
    try {
      const ids = [...picked]
      const { data } = await api.post<{ added: string[]; skipped: string[] }>(`/elections/${election.id}/nominations`, { categoryId, candidateIds: ids })
      setPicked(new Set())
      await finish(`${data.added.length} candidate${data.added.length === 1 ? '' : 's'} added to ${category?.label}`)
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const importRows = async (rows: { name: string; bio?: string }[]) => {
    const { data } = await api.post<ImportResult>(`/elections/${election.id}/import`, {
      rows: rows.map((r) => ({ ...place(), name: r.name, bio: r.bio || undefined })),
    })
    report(data)
    return data
  }

  const createOne = async () => {
    if (name.trim().length < 2) return toast.error("Enter the candidate's full name")
    setBusy(true)
    try {
      const r = await importRows([{ name, bio }])
      setName('')
      setBio('')
      if (r.nominationsAdded) await finish(`${name.trim()} added to ${category?.label}`)
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const addPasted = async () => {
    setBusy(true)
    try {
      const r = await importRows(pastedList.people)
      setPasted('')
      if (r.nominationsAdded) await finish(`${r.nominationsAdded} candidate${r.nominationsAdded === 1 ? '' : 's'} added to ${category?.label}`)
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const primary =
    tab === 'existing' ? (
      <Button onClick={addExisting} disabled={busy || picked.size === 0}>
        {busy ? 'Adding…' : picked.size ? `Add ${picked.size} candidate${picked.size === 1 ? '' : 's'}` : 'Add candidates'}
      </Button>
    ) : tab === 'new' ? (
      <Button onClick={createOne} disabled={busy || !name.trim()}>
        {busy ? 'Adding…' : 'Create and add'}
      </Button>
    ) : (
      <Button onClick={addPasted} disabled={busy || pastedList.people.length === 0}>
        {busy ? 'Adding…' : pastedList.people.length ? `Add ${pastedList.people.length} candidate${pastedList.people.length === 1 ? '' : 's'}` : 'Add candidates'}
      </Button>
    )

  return (
    <Modal
      title="Add candidates"
      description={`Choose who stands in a category of ${election.name}.`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
          {primary}
        </>
      }
    >
      <div className="space-y-4 pb-4">
        <Select
          label="Category"
          value={categoryId}
          onChange={(id) => {
            setCategoryId(id)
            setPicked(new Set())
          }}
          options={categories.map((c) => ({ value: c._id, label: c.label }))}
        />

        <div role="tablist" aria-label="How to add candidates" className="flex gap-1 rounded-xl bg-[#e6ede9] p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`add-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`add-panel-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`min-h-10 flex-1 rounded-[9px] text-sm font-semibold ${tab === t.key ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'existing' && (
          <div role="tabpanel" id="add-panel-existing" aria-labelledby="add-tab-existing" className="space-y-3">
            <input
              type="search"
              aria-label="Search candidates"
              placeholder="Search your candidates"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[46px] w-full rounded-[10px] border border-field bg-white px-3.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <div className="max-h-[280px] overflow-y-auto rounded-xl border border-line">
              {!loadedPeople ? (
                <p className="px-4 py-6 text-center text-sm text-muted">Loading candidates…</p>
              ) : people.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted">Your library is empty. Use “Create new” or “Paste a list”.</p>
              ) : shown.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted">No candidate matches your search.</p>
              ) : (
                shown.map((p) => {
                  const added = alreadyIn.has(p._id)
                  return (
                    <label key={p._id} className={`flex min-h-14 items-center gap-3 border-t border-line px-4 first:border-t-0 ${added ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-ground'}`}>
                      <input
                        type="checkbox"
                        disabled={added}
                        checked={picked.has(p._id)}
                        onChange={() =>
                          setPicked((s) => {
                            const next = new Set(s)
                            if (!next.delete(p._id)) next.add(p._id)
                            return next
                          })
                        }
                        className="h-4 w-4 accent-brand"
                      />
                      <Avatar name={p.name} src={p.imageUrl} size={36} />
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{p.name}</span>
                      {added && <span className="text-xs text-muted">Already in this category</span>}
                    </label>
                  )
                })
              )}
            </div>
          </div>
        )}

        {tab === 'new' && (
          <div role="tabpanel" id="add-panel-new" aria-labelledby="add-tab-new" className="space-y-4">
            <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} aria-required="true" />
            <Textarea label="Short bio" hint="(optional)" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} />
            <p className="rounded-[10px] bg-ground px-4 py-3 text-sm leading-relaxed text-muted">
              You can add a photo later from the Candidates page. If a candidate with this name already exists, they are used instead of creating a copy.
            </p>
          </div>
        )}

        {tab === 'paste' && (
          <div role="tabpanel" id="add-panel-paste" aria-labelledby="add-tab-paste" className="space-y-3">
            <Textarea
              label="Candidates"
              hint="(one per line)"
              rows={8}
              placeholder={'Ama Boateng, Highlife and afrobeats vocalist\nKwabena Darko\nEfua Quaye, Rising star from Accra'}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
            <p className="text-[13px] leading-relaxed text-muted">Type or paste one name per line. Add a short bio after a comma if you like. Copying a column straight from a spreadsheet works too.</p>
            {pastedList.people.length > 0 && (
              <p role="status" className="rounded-[10px] bg-brand-tint px-4 py-3 text-sm text-[#0b5a43]">
                <strong>{pastedList.people.length}</strong> candidate{pastedList.people.length === 1 ? '' : 's'} ({pastedList.people.filter((p) => !known.has(lc(p.name))).length} new,{' '}
                {pastedList.people.filter((p) => known.has(lc(p.name))).length} already in your library)
                {pastedList.tooShort > 0 && `. ${pastedList.tooShort} line${pastedList.tooShort === 1 ? '' : 's'} too short to use.`}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
