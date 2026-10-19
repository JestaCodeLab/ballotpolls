import { useMemo, useState, type ReactNode } from 'react'
import { Button } from './ui'
import { confirmDelete } from '../store/confirm'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  // What goes in this column's cell for a row.
  cell: (row: T) => ReactNode
  // Give a column a sort value and its header becomes a button that sorts by it.
  sortValue?: (row: T) => string | number
  align?: 'left' | 'right'
  // Keeps the header text for screen readers but does not show it, e.g. for an actions column.
  hideHeader?: boolean
  // Extra classes for this column's cells, e.g. 'whitespace-nowrap'.
  className?: string
}

// Turns on checkboxes and a "Delete selected" bar. The table asks for confirmation, then hands the chosen rows to onDelete.
export interface BulkDelete<T> {
  // What the rows are called, for the confirmation: ['candidate', 'candidates'].
  noun: [singular: string, plural: string]
  // Names a row for screen readers, e.g. "Select Ama Boateng".
  rowLabel: (row: T) => string
  // Rows that cannot be deleted get a disabled checkbox.
  canSelect?: (row: T) => boolean
  // Why a disabled checkbox is disabled; shown as its tooltip.
  disabledReason?: string
  // Extra warning for the confirmation, e.g. that sub-categories go too.
  confirmMessage?: (rows: T[]) => string
  onDelete: (rows: T[]) => Promise<void>
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  // Read out by screen readers to say what the table is.
  caption: string
  // Start sorted by this column.
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  bulkDelete?: BulkDelete<T>
  // Extra classes for a row, e.g. to tint rows that belong to a group.
  rowClassName?: (row: T) => string
  // Below this width the table scrolls sideways inside its card instead of squeezing.
  minWidth?: number
}

type Sort = { key: string; dir: 'asc' | 'desc' } | null

// A reusable table in the app's style: sortable headers, hover rows, and a horizontal scroll on small screens.
// Columns are described once; the table does the rest.
export default function DataTable<T>({ columns, rows, rowKey, caption, initialSort, minWidth = 720, rowClassName, bulkDelete }: Props<T>) {
  const [sort, setSort] = useState<Sort>(initialSort ?? null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key)
    if (!sort || !col?.sortValue) return rows
    const value = col.sortValue
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = value(a)
      const y = value(b)
      const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' })
      return order * dir
    })
  }, [rows, columns, sort])

  // Only rows that are still in the table count, so a row removed elsewhere drops out of the selection by itself.
  const canSelect = (row: T) => bulkDelete?.canSelect?.(row) ?? true
  const selectable = rows.filter(canSelect)
  const selectedRows = rows.filter((r) => picked.has(rowKey(r)) && canSelect(r))
  const allSelected = selectable.length > 0 && selectedRows.length === selectable.length
  const someSelected = selectedRows.length > 0 && !allSelected

  const toggleRow = (row: T) =>
    setPicked((s) => {
      const next = new Set(s)
      if (!next.delete(rowKey(row))) next.add(rowKey(row))
      return next
    })
  const toggleAll = () => setPicked(allSelected ? new Set() : new Set(selectable.map(rowKey)))

  const deleteSelected = async () => {
    if (!bulkDelete || !selectedRows.length) return
    const n = selectedRows.length
    const noun = n === 1 ? bulkDelete.noun[0] : bulkDelete.noun[1]
    const ok = await confirmDelete({
      title: `Delete ${n} ${noun}?`,
      message: bulkDelete.confirmMessage?.(selectedRows) ?? 'This cannot be undone.',
      confirmLabel: `Delete ${n} ${noun}`,
    })
    if (!ok) return
    setDeleting(true)
    try {
      await bulkDelete.onDelete(selectedRows)
      setPicked(new Set())
    } finally {
      setDeleting(false)
    }
  }

  const toggle = (key: string) => setSort((s) => (s?.key === key && s.dir === 'asc' ? { key, dir: 'desc' } : { key, dir: 'asc' }))

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-white">
      {bulkDelete && selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-brand-tint px-4 py-2.5 text-sm">
          <div role="status" className="flex items-center gap-3">
            <span className="font-semibold text-[#0b5a43]">{selectedRows.length} selected</span>
            <button type="button" onClick={() => setPicked(new Set())} className="font-semibold text-brand hover:underline">
              Clear
            </button>
          </div>
          <Button variant="danger" onClick={deleteSelected} disabled={deleting} className="min-h-9 px-4 text-sm">
            {deleting ? 'Deleting…' : 'Delete selected'}
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth }}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-ground text-left text-sm text-[#3f4f49]">
              {bulkDelete && (
                <th scope="col" className="w-12 px-2 py-2">
                  <label className="flex h-9 w-9 cursor-pointer items-center justify-center">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected
                      }}
                      disabled={selectable.length === 0}
                      onChange={toggleAll}
                      className="h-4 w-4 cursor-pointer accent-brand"
                    />
                  </label>
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.key === c.key
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={c.sortValue ? (active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                    className={`px-4 py-3.5 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}
                  >
                    {c.hideHeader ? (
                      <span className="sr-only">{c.header}</span>
                    ) : c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggle(c.key)}
                        className={`inline-flex items-center gap-1.5 rounded-md py-0.5 font-semibold hover:text-ink ${active ? 'text-ink' : ''}`}
                      >
                        {c.header}
                        {active ? (
                          sort!.dir === 'asc' ? <ChevronUp size={16} strokeWidth={2} aria-hidden="true" /> : <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
                        ) : (
                          <ChevronsUpDown size={16} strokeWidth={1.8} aria-hidden="true" className="opacity-50" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={rowKey(row)}
                className={`border-t border-line hover:bg-ground/50 ${picked.has(rowKey(row)) && canSelect(row) ? 'bg-brand-tint/40' : ''} ${rowClassName?.(row) ?? ''}`}
              >
                {bulkDelete && (
                  <td className="w-12 px-2 py-2 align-middle">
                    <label className="flex h-9 w-9 cursor-pointer items-center justify-center" title={canSelect(row) ? undefined : bulkDelete.disabledReason}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${bulkDelete.rowLabel(row)}`}
                        checked={picked.has(rowKey(row)) && canSelect(row)}
                        disabled={!canSelect(row)}
                        onChange={() => toggleRow(row)}
                        className="h-4 w-4 cursor-pointer accent-brand disabled:cursor-not-allowed"
                      />
                    </label>
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 align-middle ${c.align === 'right' ? 'text-right' : ''} ${c.className ?? ''}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
