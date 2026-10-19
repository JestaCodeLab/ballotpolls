import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Plus } from 'lucide-react'
import { api, type Category, type Election } from '../lib/api'
import { toast } from '../store/toast'
import { Button, Input, Select } from './ui'

interface Props {
  election: Election
  // Every category the organisation has.
  categories: Category[]
  // Categories that already have candidates in this election. They cannot be taken out.
  lockedIds: Set<string>
  // Open with the "new category" form showing, for someone who came here to create one.
  startCreating?: boolean
  onClose: () => void
  onSaved: (election: Election, categories: Category[]) => void
}

// Where an election gets its categories: tick the ones it should use from the existing list, or create new ones
// without leaving the page. Candidates can only be nominated into the categories chosen here.
export default function ElectionCategories({ election, categories, lockedIds, startCreating, onClose, onSaved }: Props) {
  const [all, setAll] = useState(categories)
  const [creating, setCreating] = useState(Boolean(startCreating) || categories.length === 0)
  const [newName, setNewName] = useState('')
  const [newParent, setNewParent] = useState('')
  const [busy, setBusy] = useState(false)
  const dialog = useRef<HTMLDivElement>(null)

  // Candidates stand in leaf categories only: a top-level category without children, or a sub-category.
  const parentIds = useMemo(() => new Set(all.map((c) => c.parentId).filter(Boolean) as string[]), [all])
  const leafIds = useMemo(() => new Set(all.filter((c) => !parentIds.has(c._id)).map((c) => c._id)), [all, parentIds])

  // An older election (no list yet) used every category, so start with all ticked.
  const [picked, setPicked] = useState<Set<string>>(() => {
    const leaves = categories.filter((c) => !categories.some((x) => x.parentId === c._id)).map((c) => c._id)
    return new Set(election.categoryIds === null ? leaves : election.categoryIds.filter((id) => leaves.includes(id)))
  })
  const chosen = [...picked].filter((id) => leafIds.has(id))

  // The list, grouped: categories on their own first, then each parent with its sub-categories.
  const groups = useMemo(() => {
    const byName = (a: Category, b: Category) => a.name.localeCompare(b.name)
    const top = all.filter((c) => !c.parentId).sort(byName)
    const alone = top.filter((c) => !parentIds.has(c._id))
    const withSubs = top.filter((c) => parentIds.has(c._id)).map((p) => ({ title: p.name, items: all.filter((c) => c.parentId === p._id).sort(byName) }))
    return [...(alone.length ? [{ title: 'Categories', items: alone }] : []), ...withSubs]
  }, [all, parentIds])

  const toggle = (id: string) =>
    setPicked((s) => {
      const next = new Set(s)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return toast.error('Enter a category name')
    setBusy(true)
    try {
      const { data } = await api.post<Category>('/categories', { name: newName, parentId: newParent || null })
      setAll((list) => [...list, data])
      setPicked((s) => {
        const next = new Set(s)
        // A category that just got its first sub-category stops being usable itself: its sub-category takes over.
        if (data.parentId) next.delete(data.parentId)
        next.add(data._id)
        return next
      })
      setNewName('')
      toast.success('Category created', 'It is ticked for this election.')
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    setBusy(true)
    try {
      const { data } = await api.put<Election>(`/elections/${election.id}/categories`, { categoryIds: chosen })
      onSaved(data, all)
    } catch (err) {
      toast.fromError(err)
      setBusy(false)
    }
  }

  useEffect(() => {
    dialog.current?.querySelector<HTMLElement>('input, button')?.focus()
  }, [])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return onClose()
    if (e.key !== 'Tab') return
    const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled), [role="combobox"]:not(:disabled)') ?? [])
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-ink/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ec-title"
        onKeyDown={onKeyDown}
        className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl"
      >
        <div className="px-6 pb-3 pt-6">
          <h2 id="ec-title" className="font-display text-2xl font-bold tracking-tight">
            Categories for this election
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Tick the categories {election.name} should use, or create new ones. You nominate candidates into these.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-2">
          {groups.length === 0 && <p className="rounded-[10px] bg-ground px-4 py-3.5 text-sm text-muted">You have no categories yet. Create your first one below.</p>}
          {groups.map((g) => (
            <fieldset key={g.title}>
              <legend className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{g.title}</legend>
              {g.items.map((c) => {
                const locked = lockedIds.has(c._id)
                return (
                  <label key={c._id} className={`flex min-h-11 items-center gap-3 rounded-[10px] px-2 text-[15px] ${locked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-ground'}`}>
                    <input type="checkbox" checked={picked.has(c._id)} disabled={locked} onChange={() => toggle(c._id)} className="h-4 w-4 accent-brand" />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    {locked && <span className="text-xs text-muted">Has candidates</span>}
                  </label>
                )
              })}
            </fieldset>
          ))}

          <div className="border-t border-line pt-4">
            {creating ? (
              <form noValidate onSubmit={create} className="space-y-3">
                <div className="text-sm font-semibold">Create a new category</div>
                <Input label="Name" placeholder="e.g. Best Music Video" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <Select
                  label="Parent"
                  value={newParent}
                  onChange={setNewParent}
                  options={[{ value: '', label: 'None (top level)' }, ...all.filter((c) => !c.parentId).sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c._id, label: c.name }))]}
                />
                <Button type="submit" variant="secondary" disabled={busy}>
                  Create and tick it
                </Button>
              </form>
            ) : (
              <button type="button" onClick={() => setCreating(true)} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-brand hover:underline">
                <Plus size={16} strokeWidth={2} aria-hidden="true" />
                Create a new category
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
          <span role="status" className="text-sm text-muted">
            {chosen.length} selected
          </span>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save categories'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
