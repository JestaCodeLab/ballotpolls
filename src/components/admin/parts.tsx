import { useEffect, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { api, type PaymentStatus } from '../../lib/api'
import { toast } from '../../store/toast'
import type { PaginationProps } from '../Pagination'

// Loads one page of a list from /admin/<path>, and again, after a short pause, whenever the search words, the filters or
// the page change. The server answers { items, total, page, pageSize }; `pagination` is ready for DataTable's
// `serverPagination`. A new search or filter goes back to page 1.
export function useAdminList<T, M = undefined>(path: string, params: Record<string, string | undefined> = {}) {
  const [rows, setRows] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  // Anything else the endpoint sends beside the page, e.g. the SMS report's totals.
  const [meta, setMeta] = useState<M>()
  const [loaded, setLoaded] = useState(false)
  // True while a request is out, including a refresh after the table is already showing.
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)
  const key = JSON.stringify(params)
  const [paging, setPaging] = useState({ key, page: 1, size: 10 })
  const page = paging.key === key ? paging.page : 1
  const size = paging.size

  useEffect(() => {
    let current = true
    setLoading(true)
    const t = setTimeout(() => {
      api
        .get<{ items: T[]; total: number } & Partial<M>>(`/admin/${path}`, { params: { ...params, page, pageSize: size } })
        .then((r) => {
          if (!current) return
          setRows(r.data.items)
          setTotal(r.data.total)
          setMeta(r.data as unknown as M)
        })
        .catch((e) => current && toast.fromError(e))
        .finally(() => {
          if (!current) return
          setLoaded(true)
          setLoading(false)
        })
    }, 250)
    return () => {
      current = false
      clearTimeout(t)
    }
    // `key` stands for `params`, which is a new object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key, page, size, version])

  const pagination: PaginationProps = {
    page,
    pageSize: size,
    total,
    onPage: (n) => setPaging({ key, page: n, size }),
    onPageSize: (n) => setPaging({ key, page: 1, size: n }),
  }
  return { rows, total, meta, loaded, loading, pagination, setRows, reload: () => setVersion((v) => v + 1) }
}

// Reloads the list the page is showing, e.g. to pick up people who registered a moment ago.
export function RefreshButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title="Refresh"
      className="flex min-h-[46px] items-center gap-2 rounded-[10px] border border-field bg-white px-4 text-[15px] font-semibold hover:bg-ground disabled:opacity-60"
    >
      <RefreshCw size={17} strokeWidth={1.8} aria-hidden="true" className={busy ? 'animate-spin' : ''} />
      Refresh
    </button>
  )
}

export function SearchBox({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder: string }) {
  return (
    <label className="relative block w-full max-w-sm">
      <span className="sr-only">{label}</span>
      <Search size={17} strokeWidth={1.8} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[46px] w-full rounded-[10px] border border-field bg-white pl-10 pr-3.5 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </label>
  )
}

const PAYMENT: Record<PaymentStatus, string> = {
  confirmed: 'bg-brand-tint text-[#0b5a43]',
  pending: 'bg-[#fcefd0] text-[#6b4300]',
  failed: 'bg-red-50 text-danger',
}

export function PaymentChip({ status }: { status: PaymentStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${PAYMENT[status]}`}>{status}</span>
}

export function OrgChip({ status }: { status: 'active' | 'suspended' }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${status === 'active' ? 'bg-brand-tint text-[#0b5a43]' : 'bg-red-50 text-danger'}`}>{status}</span>
}
