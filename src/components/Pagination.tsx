import { ChevronLeft, ChevronRight } from 'lucide-react'
import Select from './Select'

export const PAGE_SIZES = [10, 25, 50, 100]

export interface PaginationProps {
  // 1-based.
  page: number
  pageSize: number
  // Every record, not just this page's.
  total: number
  onPage: (page: number) => void
  onPageSize: (size: number) => void
  // What the records are called in "Showing 1-10 of 124 records".
  noun?: string
  // Rows-per-page choices; grids use multiples of their column count.
  sizes?: number[]
}

// Page numbers to show: the first, the last, and a few around the current one, with gaps marked by null.
const windowOf = (page: number, pages: number): (number | null)[] => {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages))
  const out: (number | null)[] = []
  let last = 0
  for (const n of [...keep].sort((a, b) => a - b)) {
    if (n - last > 1) out.push(null)
    out.push(n)
    last = n
  }
  return out
}

// "Showing 11-20 of 124 records", a rows-per-page choice and page buttons. Used under every table and list.
export default function Pagination({ page, pageSize, total, onPage, onPageSize, noun = 'records', sizes = PAGE_SIZES }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const step = 'flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-semibold'

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 text-sm">
      <p role="status" className="text-muted">
        Showing <strong className="font-semibold text-ink">{from.toLocaleString()}–{to.toLocaleString()}</strong> of <strong className="font-semibold text-ink">{total.toLocaleString()}</strong> {total === 1 ? noun.replace(/s$/, '') : noun}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Select
          label="Rows per page"
          hideLabel
          value={String(pageSize)}
          onChange={(v) => onPageSize(Number(v))}
          options={sizes.map((n) => ({ value: String(n), label: `${n} per page` }))}
          className="w-36"
        />
        {pages > 1 && (
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} className={`${step} border-line bg-white hover:bg-ground disabled:cursor-not-allowed disabled:opacity-40`}>
              <ChevronLeft size={17} strokeWidth={2} aria-hidden="true" />
            </button>
            {windowOf(page, pages).map((n, i) =>
              n === null ? (
                <span key={`gap${i}`} aria-hidden="true" className="px-1 text-muted">
                  …
                </span>
              ) : (
                <button key={n} type="button" aria-label={`Page ${n}`} aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)} className={`${step} ${n === page ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:bg-ground'}`}>
                  {n}
                </button>
              ),
            )}
            <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)} className={`${step} border-line bg-white hover:bg-ground disabled:cursor-not-allowed disabled:opacity-40`}>
              <ChevronRight size={17} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
