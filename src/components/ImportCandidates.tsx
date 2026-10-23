import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { api, type Candidate, type Category, type Election } from '../lib/api'
import { downloadImportTemplate, readImportSheet, type ImportRow } from '../lib/csv'
import { isSupportedSheet, readSheetFile } from '../lib/sheet'
import { toast } from '../store/toast'
import { Button } from './ui'
import Modal from './Modal'
import DataTable, { type Column } from './DataTable'

export interface ImportResult {
  categoriesCreated: number
  candidatesCreated: number
  candidatesMatched: number
  nominationsAdded: number
  skipped: { row: number; name: string; reason: string }[]
}

interface Props {
  election: Election
  categories: Category[]
  onClose: () => void
  // Goes back to the choice that led here, when there was one.
  onBack?: () => void
  onImported: (result: ImportResult) => void
}

const MAX_FILE_MB = 2
const lc = (s: string) => s.trim().toLowerCase()

// A row once it has been checked against what already exists.
interface CheckedRow extends ImportRow {
  problems: string[]
  newCategory: boolean
  newSubCategory: boolean
  inLibrary: boolean
}

// Upload a spreadsheet of candidates and their categories, look it over, then import it. The categories and candidates
// it names are created when they do not exist yet and matched when they do, and everyone ends up nominated.
export default function ImportCandidates({ election, categories, onClose, onBack, onImported }: Props) {
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [people, setPeople] = useState<Candidate[]>([])

  useEffect(() => {
    api
      .get<Candidate[]>('/candidates')
      .then((r) => setPeople(r.data))
      .catch(() => {
        /* the preview then simply cannot say which candidates already exist */
      })
  }, [])

  const readFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (!isSupportedSheet(file)) return setError('Please upload a Numbers, Excel or CSV file.')
    if (file.size > MAX_FILE_MB * 1024 * 1024) return setError(`That file is over ${MAX_FILE_MB} MB.`)
    let text: string
    try {
      text = await readSheetFile(file)
    } catch {
      return setError('We could not read that file. If it is from Numbers or Excel, try exporting it as CSV.')
    }
    const result = readImportSheet(text)
    if (result.error) return setError(result.error)
    setFileName(file.name)
    setRows(result.rows)
  }

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    void readFile(file)
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void readFile(e.dataTransfer.files?.[0])
  }

  // Checks every row: is anything missing, is it a repeat, and which categories and candidates are new?
  const checked = useMemo<CheckedRow[]>(() => {
    if (!rows) return []
    const top = new Map(categories.filter((c) => !c.parentId).map((c) => [lc(c.name), c]))
    const known = new Set(people.map((p) => lc(p.name)))
    const seen = new Set<string>()
    return rows.map((r) => {
      const problems: string[] = []
      if (!r.category.trim()) problems.push('Category is missing')
      if (r.name.trim().length < 2) problems.push('Candidate name is missing or too short')
      if (r.category.length > 80 || r.subCategory.length > 80) problems.push('Category name is too long')
      if (r.name.length > 100) problems.push('Candidate name is too long')
      if (r.bio.length > 500) problems.push('Bio is over 500 characters')
      const key = `${lc(r.category)}|${lc(r.subCategory)}|${lc(r.name)}`
      if (!problems.length) {
        if (seen.has(key)) problems.push('Repeated in this file')
        seen.add(key)
      }
      const parent = top.get(lc(r.category))
      const subExists = parent && categories.some((c) => c.parentId === parent._id && lc(c.name) === lc(r.subCategory))
      return {
        ...r,
        problems,
        newCategory: !parent,
        newSubCategory: Boolean(r.subCategory) && !subExists,
        inLibrary: known.has(lc(r.name)),
      }
    })
  }, [rows, categories, people])

  const valid = checked.filter((r) => r.problems.length === 0)
  const summary = useMemo(() => {
    const names = new Set(valid.map((r) => lc(r.name)))
    const newNames = new Set(valid.filter((r) => !r.inLibrary).map((r) => lc(r.name)))
    const places = new Set(valid.map((r) => `${lc(r.category)}|${lc(r.subCategory)}`))
    const newPlaces = new Set(valid.filter((r) => r.newCategory || r.newSubCategory).map((r) => `${lc(r.category)}|${lc(r.subCategory)}`))
    return { candidates: names.size, newCandidates: newNames.size, categories: places.size, newCategories: newPlaces.size }
  }, [valid])

  const run = async () => {
    setBusy(true)
    try {
      const payload = valid.map((r) => ({ category: r.category, subCategory: r.subCategory || undefined, name: r.name, bio: r.bio || undefined }))
      const { data } = await api.post<ImportResult>(`/elections/${election.id}/import`, { rows: payload })
      onImported(data)
    } catch (err) {
      toast.fromError(err)
      setBusy(false)
    }
  }

  /* ----- Step 1: instructions, template and the drop zone ----- */
  if (!rows) {
    return (
      <Modal
        title="Import candidates and categories"
        description="Upload a spreadsheet and we will create the categories and candidates, and put each candidate in their category."
        size="lg"
        onClose={onClose}
        footer={
          <>
            {onBack ? (
              <Button variant="secondary" onClick={onBack}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </>
        }
      >
        <div className="space-y-5 pb-4">
          <div className="rounded-xl bg-ground px-5 py-4">
            <div className="text-sm font-semibold">How it works</div>
            <ol className="mt-2.5 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
              <li>Download the template and open it in Excel or Google Sheets.</li>
              <li>
                Add one row per candidate with two columns: <strong className="text-ink">Name</strong> and <strong className="text-ink">Category</strong>. The
                column names can be in any case.
              </li>
              <li>
                For a sub-category, write it as <strong className="text-ink">Music &gt; Artiste of the Year</strong>.
              </li>
              <li>Upload it here as a Numbers, Excel or CSV file. You will see a preview before anything is created.</li>
            </ol>
            <Button variant="secondary" onClick={downloadImportTemplate} className="mt-4 gap-2">
              <Download size={16} strokeWidth={1.8} aria-hidden="true" />
              Download template
            </Button>
          </div>

          <label
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex min-h-[170px] w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 ${
              dragging ? 'border-brand bg-brand-tint' : 'border-field bg-ground hover:border-brand hover:bg-brand-tint/60'
            }`}
          >
            <input type="file" accept=".numbers,.xlsx,.xls,.ods,.csv,text/csv,text/plain" onChange={onPick} className="sr-only" aria-label="Choose a Numbers, Excel or CSV file" />
            <span className="flex flex-col items-center gap-2">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand shadow-sm">
                <FileSpreadsheet size={26} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="text-[15px] font-semibold">{dragging ? 'Drop to upload' : 'Drag and drop your file here'}</span>
              <span className="text-sm text-muted">
                or <span className="font-semibold text-brand">click to browse</span>
              </span>
              <span className="text-[13px] text-muted">Numbers, Excel or CSV · up to {MAX_FILE_MB} MB · up to 500 rows</span>
            </span>
          </label>
          {error && (
            <p role="alert" className="rounded-[10px] bg-red-50 px-4 py-3 text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </div>
      </Modal>
    )
  }

  /* ----- Step 2: preview ----- */
  const columns: Column<CheckedRow>[] = [
    { key: 'line', header: 'Row', className: 'whitespace-nowrap text-muted', cell: (r) => String(r.line) },
    {
      key: 'category',
      header: 'Category',
      cell: (r) => (
        <span className="flex flex-wrap items-center gap-1.5">
          {r.category || '–'}
          {r.category && r.newCategory && <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-semibold text-[#0b5a43]">New</span>}
        </span>
      ),
    },
    {
      key: 'sub',
      header: 'Sub-category',
      cell: (r) =>
        r.subCategory ? (
          <span className="flex flex-wrap items-center gap-1.5">
            {r.subCategory}
            {r.newSubCategory && <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-semibold text-[#0b5a43]">New</span>}
          </span>
        ) : (
          <span className="text-muted">–</span>
        ),
    },
    { key: 'name', header: 'Candidate', cell: (r) => <span className="font-semibold">{r.name || '–'}</span> },
    {
      key: 'status',
      header: 'Status',
      cell: (r) =>
        r.problems.length ? (
          <span className="text-[13px] font-medium text-danger">{r.problems[0]}. Will be skipped.</span>
        ) : r.inLibrary ? (
          <span className="rounded-full bg-[#dce3f2] px-2.5 py-1 text-xs font-medium text-[#1f3a6b]">In your library</span>
        ) : (
          <span className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-medium text-[#0b5a43]">New candidate</span>
        ),
    },
  ]

  const skipped = checked.length - valid.length
  return (
    <Modal
      title="Check your import"
      description={
        <>
          <strong className="text-ink">{fileName}</strong>. Nothing has been created yet.
        </>
      }
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={() => setRows(null)} disabled={busy}>
            Choose another file
          </Button>
          <Button onClick={run} disabled={busy || valid.length === 0}>
            {busy ? 'Importing…' : `Import ${summary.candidates} candidate${summary.candidates === 1 ? '' : 's'}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pb-4">
        <div role="status" className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-brand-tint px-5 py-3.5 text-sm text-[#0b5a43]">
          <span>
            <strong>{summary.candidates}</strong> candidate{summary.candidates === 1 ? '' : 's'} ({summary.newCandidates} new, {summary.candidates - summary.newCandidates} already in your library)
          </span>
          <span>
            <strong>{summary.categories}</strong> categor{summary.categories === 1 ? 'y' : 'ies'} ({summary.newCategories} new)
          </span>
        </div>
        {skipped > 0 && (
          <p role="alert" className="rounded-[10px] bg-[#fcefd0] px-4 py-3 text-sm font-medium text-[#6b4300]">
            {skipped} row{skipped === 1 ? '' : 's'} will be skipped. Fix them in your file and upload it again, or import the rest.
          </p>
        )}
        <div className="max-h-[320px] overflow-y-auto rounded-[14px]">
          <DataTable caption="Rows in the file" columns={columns} rows={checked} rowKey={(r) => String(r.line)} minWidth={640} />
        </div>
      </div>
    </Modal>
  )
}
