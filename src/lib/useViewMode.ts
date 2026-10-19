import { useState } from 'react'

export type ViewMode = 'cards' | 'table'

// Remembers whether a list is shown as cards or as a table, per page, in this browser.
export function useViewMode(page: string): [ViewMode, (mode: ViewMode) => void] {
  const key = `ballotpolls:view:${page}`
  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(key) === 'table' ? 'table' : 'cards'
    } catch {
      return 'cards'
    }
  })
  const change = (next: ViewMode) => {
    setMode(next)
    try {
      localStorage.setItem(key, next)
    } catch {
      /* storage can be blocked; the choice then lasts until the page is closed */
    }
  }
  return [mode, change]
}
