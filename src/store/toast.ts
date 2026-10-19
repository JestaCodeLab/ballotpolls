import { create } from 'zustand'
import { errorMessage } from '../lib/api'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  kind: ToastKind
  title: string
  description?: string
  // How long it stays before dismissing itself, in ms.
  duration: number
}

interface ToastState {
  toasts: ToastItem[]
  push: (kind: ToastKind, title: string, description?: string) => void
  dismiss: (id: number) => void
}

const MAX_VISIBLE = 4
const DURATION: Record<ToastKind, number> = { success: 2500, info: 3000, error: 4000 }
let nextId = 1

export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  push: (kind, title, description) =>
    set((s) => {
      // A repeat of what is already on screen would just stack up, so skip it.
      if (s.toasts.some((t) => t.kind === kind && t.title === title && t.description === description)) return s
      const item: ToastItem = { id: nextId++, kind, title, description, duration: DURATION[kind] }
      return { toasts: [...s.toasts, item].slice(-MAX_VISIBLE) }
    }),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

const push = (kind: ToastKind, title: string, description?: string) =>
  useToasts.getState().push(kind, title, description)

// Callable from anywhere, including outside React (e.g. the axios interceptor).
export const toast = {
  success: (title: string, description?: string) => push('success', title, description),
  error: (title: string, description?: string) => push('error', title, description),
  info: (title: string, description?: string) => push('info', title, description),
  // Turns an API/axios error into a readable error toast.
  fromError: (err: unknown) => push('error', errorMessage(err)),
}
