import { useMemo, useState } from 'react'
import type { PaginationProps } from '../components/Pagination'
import { PAGE_SIZES } from '../components/Pagination'

// Pages a list that is already fully in the browser. Hand `pagination` to <Pagination> and draw `pageItems`.
// The page number stays valid when the list shrinks (a search, a deletion), and goes back to 1 when the size changes.
export function usePaged<T>(items: T[], initialSize = PAGE_SIZES[0], sizes?: number[]) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialSize)
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(page, pages)
  const pageItems = useMemo(() => items.slice((current - 1) * pageSize, current * pageSize), [items, current, pageSize])
  const pagination: PaginationProps = {
    page: current,
    pageSize,
    total: items.length,
    sizes,
    onPage: setPage,
    onPageSize: (n) => {
      setPageSize(n)
      setPage(1)
    },
  }
  return { pageItems, pagination, resetPage: () => setPage(1) }
}
