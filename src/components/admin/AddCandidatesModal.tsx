import { useEffect, useMemo, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import { Button, Input, Select, Textarea } from '../ui'
import Modal from '../Modal'
import { toast } from '../../store/toast'

interface Cat {
  id: string
  name: string
  parentId: string | null
}
interface Result {
  nominationsAdded: number
  candidatesCreated: number
  skipped: { row: number; name: string; reason: string }[]
}

const NEW = '__new'

// Puts people in a category of an election, for a super admin. Names that match a candidate the organisation already has
// reuse them; the rest are created. The category can be an existing one or a new one made on the spot.
export default function AddCandidatesModal({ electionId, categoryId, onClose, onDone }: { electionId: string; categoryId?: string; onClose: () => void; onDone: () => void }) {
  const [cats, setCats] = useState<Cat[] | null>(null)
  const [chosen, setChosen] = useState(categoryId ?? '')
  const [newName, setNewName] = useState('')
  const [newSub, setNewSub] = useState('')
  const [names, setNames] = useState('')
  const [busy, setBusy] = useState(false)
  const [skipped, setSkipped] = useState<Result['skipped']>([])

  useEffect(() => {
    api
      .get<Cat[]>(`/admin/elections/${electionId}/categories`)
      .then((r) => setCats(r.data))
      .catch((e) => toast.error(errorMessage(e)))
  }, [electionId])

  // Candidates stand in the lowest level: a category without sub-categories, or a sub-category.
  const options = useMemo(() => {
    const all = cats ?? []
    const byId = new Map(all.map((c) => [c.id, c]))
    const parents = new Set(all.map((c) => c.parentId).filter(Boolean))
    return all
      .filter((c) => !parents.has(c.id))
      .map((c) => ({ value: c.id, label: c.parentId ? `${byId.get(c.parentId)?.name ?? ''} › ${c.name}` : c.name }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [cats])

  const lines = names.split('\n').map((l) => l.trim()).filter(Boolean)

  const submit = async () => {
    let category = newName.trim()
    let subCategory: string | undefined = newSub.trim() || undefined
    if (chosen !== NEW) {
      const c = (cats ?? []).find((x) => x.id === chosen)
      if (!c) return toast.error('Choose a category')
      const parent = c.parentId ? (cats ?? []).find((x) => x.id === c.parentId) : undefined
      category = parent ? parent.name : c.name
      subCategory = parent ? c.name : undefined
    } else if (!category) return toast.error('Enter the new category name')
    if (!lines.length) return toast.error('Enter at least one candidate name')
    setBusy(true)
    try {
      const { data } = await api.post<Result>(`/admin/elections/${electionId}/import`, { rows: lines.map((name) => ({ category, subCategory, name })) })
      if (data.nominationsAdded) toast.success(`${data.nominationsAdded} candidate${data.nominationsAdded === 1 ? '' : 's'} added`, data.candidatesCreated ? `${data.candidatesCreated} new` : undefined)
      onDone()
      if (data.skipped.length) {
        setSkipped(data.skipped)
        setNames(data.skipped.map((s) => s.name).join('\n'))
      } else onClose()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Add candidates"
      description="Type one name per line. A name the organisation already has is reused; a new one is created."
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={busy || !cats} onClick={submit}>
            {busy ? 'Adding…' : `Add ${lines.length || ''} candidate${lines.length === 1 ? '' : 's'}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="Category" value={chosen} onChange={setChosen} placeholder={cats ? 'Choose a category' : 'Loading…'} options={[...options, { value: NEW, label: '＋ New category…' }]} />
        {chosen === NEW && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="New category name" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} />
            <Input label="Sub-category" hint="(optional)" value={newSub} onChange={(e) => setNewSub(e.target.value)} maxLength={80} />
          </div>
        )}
        <Textarea label="Candidates" rows={6} value={names} onChange={(e) => setNames(e.target.value)} placeholder={'Kwame Mensah\nAma Boateng'} />
        {skipped.length > 0 && (
          <div role="alert" className="rounded-[10px] border border-line bg-ground p-3 text-sm">
            <div className="font-semibold">Not added</div>
            <ul className="mt-1 list-disc pl-5 text-muted">
              {skipped.map((s) => (
                <li key={s.row}>
                  {s.name}: {s.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  )
}
