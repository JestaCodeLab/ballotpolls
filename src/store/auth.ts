import axios from 'axios'
import { create } from 'zustand'
import { api, type User } from '../lib/api'
import { toast } from './toast'

interface RegisterInput {
  organisationName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
}

interface AuthState {
  user: User | null
  // True until the first /auth/me answer, so routes don't flash the login page on refresh.
  loading: boolean
  init: () => Promise<void>
  setUser: (user: User) => void
  // Asks the server for a fresh session. Throws if the session is already over or has hit its overall limit.
  extendSession: () => Promise<void>
  setSessionExpiry: (iso: string) => void
  // Re-reads the signed-in user (e.g. to see that the phone number has now been verified). Returns it, or null.
  refresh: () => Promise<User | null>
  login: (phone: string, password: string) => Promise<void>
  register: (data: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>()((set) => ({
  user: null,
  loading: true,

  // Responses that do not carry the session end time (profile saves etc.) must not erase what we know.
  setUser: (user) => set((s) => ({ user: { ...user, sessionExpiresAt: user.sessionExpiresAt ?? s.user?.sessionExpiresAt } })),

  extendSession: async () => {
    const { data } = await api.post<{ sessionExpiresAt: string }>('/auth/refresh-session')
    set((s) => (s.user ? { user: { ...s.user, sessionExpiresAt: data.sessionExpiresAt } } : s))
  },

  setSessionExpiry: (iso) => set((s) => (s.user ? { user: { ...s.user, sessionExpiresAt: iso } } : s)),

  refresh: async () => {
    try {
      const user = (await api.get<User>('/auth/me')).data
      set({ user })
      return user
    } catch {
      return null
    }
  },

  init: async () => {
    try {
      set({ user: (await api.get<User>('/auth/me')).data })
    } catch {
      set({ user: null })
    } finally {
      set({ loading: false })
    }
  },

  login: async (phone, password) => {
    set({ user: (await api.post<User>('/auth/login', { phone, password })).data })
  },

  register: async (data) => {
    set({ user: (await api.post<User>('/auth/register', data)).data })
  },

  logout: async () => {
    await api.post('/auth/logout')
    set({ user: null })
  },
}))

// If the server says the session is over (expired, or the password was reset elsewhere),
// drop the user so the protected routes send them to the login page.
api.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    // Only say so if someone was actually signed in (not for a wrong password or the first /me check).
    if (useAuth.getState().user) toast.info('Your session has ended', 'Please sign in again to continue.')
    useAuth.setState({ user: null })
  }
  // The server refuses org data until the phone number is verified: show the "verify your phone" screen.
  if (axios.isAxiosError(error) && error.response?.status === 403 && error.response.data?.code === 'PHONE_NOT_VERIFIED') {
    const user = useAuth.getState().user
    if (user) useAuth.setState({ user: { ...user, phoneVerified: false } })
  }
  return Promise.reject(error)
})
