import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, type BulkDeleteResult, type Category } from '../lib/api'
import { reportBulkDelete } from '../lib/bulk'
import { Check, ChevronRight, Folder, ListTree, Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import { Button, Card, IconButton, Input, PageHeader, Select, EmptyState, StatIcon } from '../components/ui'
import DataTable, { type Column } from '../components/DataTable'
import Modal from '../components/Modal'
import { toast } from '../store/toast'
import { Loading, Skeleton, TableViewSkeleton } from '../components/Loading'
import { confirmDelete } from '../store/confirm'
import { firstProblem } from '../lib/validate'

// One line of the table: a top-level category, or a sub-category shown under its parent.
interface Row extends Category {
  depth: 0 | 1
  subCount: number
  parentName?: string
}

export default function Categories() {
  const [items, setItems] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  // The category being renamed in place, with the text typed so far.
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  // Parents whose sub-categories are showing. Everything starts folded away.
  const [open, setOpen] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setItems((await api.get<Category[]>('/categories')).data)
  }, [])

  useEffect(() => {
    load()
      .catch((e) => toast.fromError(e))
      .finally(() => setLoaded(true))
  }, [load])

  const tree = useMemo(
    () => items.filter((c) => !c.parentId).map((r) => ({ ...r, children: items.filter((c) => c.parentId === r._id) })),
    [items],
  )

  // Parents in order, each followed by its sub-categories when it is open, so the table reads as an outline.
  const rows = useMemo<Row[]>(
    () =>
      tree.flatMap((r) => [
        { ...r, depth: 0 as const, subCount: r.children.length },
        ...(open.has(r._id) ? r.children.map((c) => ({ ...c, depth: 1 as const, subCount: 0, parentName: r.name })) : []),
      ]),
    [tree, open],
  )
  const parentsWithSubs = tree.filter((r) => r.children.length > 0)

  const toggle = (id: string) =>
    setOpen((o) => {
      const next = new Set(o)
      if (!next.delete(id)) next.add(id)
      return next
    })


  const add = async (e: FormEvent) => {
    e.preventDefault()
    const problem = firstProblem([[!name.trim(), 'Enter a category name']])
    if (problem) return toast.error(problem)
    setSaving(true)
    try {
      await api.post('/categories', { name, parentId: parentId || null })
      // Show the new sub-category by opening its parent.
      if (parentId) setOpen((o) => new Set(o).add(parentId))
      setName('')
      setParentId('')
      setAdding(false)
      await load()
      toast.success('Category added')
    } catch (err) {
      toast.fromError(err)
    } finally {
      setSaving(false)
    }
  }

  const saveRename = async (e: FormEvent, current: Category) => {
    e.preventDefault()
    if (!editing) return
    const next = editing.name.trim()
    if (!next) return toast.error('Enter a category name')
    if (next === current.name) return setEditing(null)
    try {
      await api.patch(`/categories/${current._id}`, { name: next })
      setEditing(null)
      await load()
      toast.success('Category renamed')
    } catch (err) {
      toast.fromError(err)
    }
  }

  const remove = async (c: Row) => {
    const ok = await confirmDelete({
      title: `Delete ${c.name}?`,
      message: c.subCount ? 'All of its sub-categories will be deleted too. This cannot be undone.' : 'This cannot be undone.',
      confirmLabel: 'Delete category',
    })
    if (!ok) return
    try {
      await api.delete(`/categories/${c._id}`)
      await load()
      toast.success('Category deleted')
    } catch (err) {
      toast.fromError(err)
    }
  }

  const bulkDelete = async (chosen: Row[]) => {
    try {
      const { data } = await api.post<BulkDeleteResult>('/categories/bulk-delete', { ids: chosen.map((c) => c._id) })
      reportBulkDelete(data, ['category', 'categories'])
      await load()
    } catch (err) {
      toast.fromError(err)
    }
  }

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Category',
      cell: (c) =>
        editing?.id === c._id ? (
          <form noValidate onSubmit={(e) => saveRename(e, c)} className={`flex min-w-0 items-center gap-1.5 ${c.depth ? 'pl-9' : 'pl-8'}`}>
            <input
              autoFocus
              aria-label={`Rename ${c.name}`}
              value={editing.name}
              maxLength={80}
              onChange={(e) => setEditing({ id: c._id, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
              className="min-h-10 min-w-0 flex-1 rounded-[10px] border border-brand bg-white px-3 text-[15px] outline-none ring-2 ring-brand/20"
            />
            <IconButton label="Save name" tone="brand" type="submit">
              <Check size={16} strokeWidth={2} aria-hidden="true" />
            </IconButton>
            <IconButton label="Cancel rename" onClick={() => setEditing(null)}>
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </IconButton>
          </form>
        ) : c.depth === 0 ? (
          <span className="flex items-center gap-1.5">
            {c.subCount > 0 ? (
              <button
                type="button"
                onClick={() => toggle(c._id)}
                aria-expanded={open.has(c._id)}
                aria-label={`${open.has(c._id) ? 'Hide' : 'Show'} sub-categories of ${c.name}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-ground hover:text-ink"
              >
                <ChevronRight size={16} strokeWidth={2} aria-hidden="true" className={`transition-transform ${open.has(c._id) ? 'rotate-90' : ''}`} />
              </button>
            ) : (
              <span aria-hidden="true" className="w-7 shrink-0" />
            )}
            <span className="font-semibold">{c.name}</span>
          </span>
        ) : (
          <span className="flex items-center gap-2.5 pl-9">
            {/* A small elbow joins each sub-category to the parent above it. */}
            <span aria-hidden="true" className="-mt-2 h-3.5 w-3.5 shrink-0 rounded-bl-md border-b-2 border-l-2 border-field" />
            <span>{c.name}</span>
          </span>
        ),
    },
    {
      key: 'type',
      header: 'Type',
      className: 'whitespace-nowrap',
      cell: (c) =>
        c.depth === 0 ? (
          <span className="rounded-full bg-[#e6ede9] px-2.5 py-1 text-xs font-medium text-[#3f4f49]">Category</span>
        ) : (
          <span className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-medium text-[#0b5a43]">Sub-category of {c.parentName}</span>
        ),
    },
    {
      key: 'subs',
      header: 'Sub-categories',
      className: 'whitespace-nowrap text-muted',
      cell: (c) => (c.depth === 1 ? '–' : c.subCount === 0 ? 'None' : String(c.subCount)),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[120px]',
      cell: (c) => (
        <div className="flex gap-1">
          <IconButton label={`Edit ${c.name}`} onClick={() => setEditing({ id: c._id, name: c.name })}>
            <Pencil size={16} strokeWidth={1.8} aria-hidden="true" />
          </IconButton>
          <IconButton label={`Delete ${c.name}`} tone="danger" onClick={() => remove(c)}>
            <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
          </IconButton>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Reusable across all your elections. Sub-categories go one level deep, so USSD menus stay short."
        action={
          <Button onClick={() => setAdding(true)} className="gap-2">
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            Add category
          </Button>
        }
      />
      <section aria-label="Category totals" className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {[
          { label: 'Total categories', value: items.length, note: 'Including sub-categories', icon: Tags },
          { label: 'Categories', value: tree.length, note: 'Top level', icon: Folder },
          { label: 'Sub-categories', value: items.length - tree.length, note: `Across ${parentsWithSubs.length} categor${parentsWithSubs.length === 1 ? 'y' : 'ies'}`, icon: ListTree },
        ].map((t) => (
          <Card key={t.label} className="p-3 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs text-muted sm:text-sm">{t.label}</div>
              <span className="hidden sm:block">
                <StatIcon icon={t.icon} />
              </span>
            </div>
            <div className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">{loaded ? t.value.toLocaleString() : <Skeleton className="h-9 w-14" />}</div>
            <div className="mt-0.5 hidden text-[13px] text-muted sm:block">{loaded ? t.note : ' '}</div>
          </Card>
        ))}
      </section>

      {!loaded ? (
        <Loading label="Loading categories">
          <TableViewSkeleton />
        </Loading>
      ) : tree.length === 0 ? (
        <EmptyState icon={Tags} title="No categories yet">
          Add your first one above. Categories group your candidates, like “Artiste of the Year”.
        </EmptyState>
      ) : (
        <DataTable
          caption="Categories and their sub-categories"
          columns={columns}
          rows={rows}
          rowKey={(c) => c._id}
          rowClassName={(c) => (c.depth ? 'bg-ground/40' : '')}
          minWidth={640}
          bulkDelete={{
            noun: ['category', 'categories'],
            rowLabel: (c) => c.name,
            confirmMessage: (chosen) =>
              chosen.some((c) => c.depth === 0 && c.subCount > 0)
                ? 'Sub-categories of the selected categories will be deleted too. Any category used in an election is kept. This cannot be undone.'
                : 'Any category used in an election is kept. This cannot be undone.',
            onDelete: bulkDelete,
          }}
        />
      )}
      {adding && (
        <Modal
          title="Add category"
          description="Leave Parent empty for a top-level category, or choose one to make this a sub-category."
          onClose={() => setAdding(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setAdding(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" form="add-category-form" disabled={saving}>
                {saving ? 'Adding…' : 'Add category'}
              </Button>
            </>
          }
        >
          <form id="add-category-form" noValidate onSubmit={add} className="space-y-4 pb-4">
            <Input label="Name" placeholder="e.g. Best Music Video" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-required="true" />
            <Select
              label="Parent"
              value={parentId}
              onChange={setParentId}
              options={[{ value: '', label: 'None (top level)' }, ...tree.map((c) => ({ value: c._id, label: c.name }))]}
            />
          </form>
        </Modal>
      )}
    </>
  )
}
