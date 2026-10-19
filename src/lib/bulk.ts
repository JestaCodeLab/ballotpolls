import { toast } from '../store/toast'
import type { BulkDeleteResult } from './api'

// Tells the person how a bulk delete went: what was deleted, and what was left and why.
export function reportBulkDelete(result: BulkDeleteResult, noun: [singular: string, plural: string]) {
  const label = (n: number) => `${n} ${n === 1 ? noun[0] : noun[1]}`
  if (result.deleted) toast.success(`${label(result.deleted)} deleted`)
  if (result.skipped.length) {
    const first = result.skipped.slice(0, 2).map((s) => `${s.name}: ${s.reason}`).join(' ')
    const more = result.skipped.length > 2 ? ` And ${result.skipped.length - 2} more.` : ''
    toast.error(`${label(result.skipped.length)} not deleted`, first + more)
  }
}
