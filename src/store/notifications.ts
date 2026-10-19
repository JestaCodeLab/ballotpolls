import { create } from 'zustand'
import { api, type AppNotification } from '../lib/api'

interface NotificationState {
  items: AppNotification[]
  unreadCount: number
  load: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  reset: () => void
}

export const useNotifications = create<NotificationState>()((set, get) => ({
  items: [],
  unreadCount: 0,

  load: async () => {
    try {
      const { data } = await api.get<{ items: AppNotification[]; unreadCount: number }>('/notifications')
      set({ items: data.items, unreadCount: data.unreadCount })
    } catch {
      // The bell is not worth an error toast: it simply keeps showing what it had.
    }
  },

  markRead: async (id) => {
    const target = get().items.find((n) => n.id === id)
    if (!target || target.read) return
    // Update the screen first, then tell the server.
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }))
    try {
      await api.post(`/notifications/${id}/read`)
    } catch {
      await get().load()
    }
  },

  markAllRead: async () => {
    set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })), unreadCount: 0 }))
    try {
      await api.post('/notifications/read-all')
    } catch {
      await get().load()
    }
  },

  reset: () => set({ items: [], unreadCount: 0 }),
}))
