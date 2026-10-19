import axios from 'axios'

export const api = axios.create({ baseURL: '/api', withCredentials: true })

export const errorMessage = (e: unknown): string => {
  if (axios.isAxiosError(e)) {
    // Validation errors carry per-field messages: show the first one instead of "Validation failed".
    const fields = e.response?.data?.details as Record<string, string[]> | undefined
    const first = fields && Object.values(fields).flat()[0]
    return first ?? e.response?.data?.error ?? e.message
  }
  return 'Something went wrong'
}

export interface NotificationPrefs {
  payments: boolean
  reminders: boolean
  milestones: boolean
  dailyEmail: boolean
}

export interface AppNotification {
  id: string
  kind: 'success' | 'warning' | 'info'
  title: string
  createdAt: string
  read: boolean
}

export interface User {
  id: string
  firstName: string
  lastName: string
  name: string
  phone: string | null
  email: string
  role: 'superadmin' | 'orgadmin'
  phoneVerified: boolean
  // True for a new account until it finishes or skips the first-time tour.
  showTour: boolean
  // When the current session ends (ISO). The app warns shortly before.
  sessionExpiresAt?: string
  notificationPrefs: NotificationPrefs
  organisation?: { id: string; name: string; logoUrl?: string } | null
}

export type WithdrawalStatus = 'awaiting_code' | 'pending' | 'approved' | 'released' | 'rejected'

export interface Withdrawal {
  id: string
  reference: string
  // GHS
  amount: number
  // Masked, e.g. 024 *** 4567
  payoutPhone: string
  status: WithdrawalStatus
  createdAt: string
  releasedAt?: string
  rejectedReason?: string
  codeExpiresAt?: string
}

export interface WithdrawalBalance {
  total: number
  pending: number
  released: number
  available: number
}

export interface Category {
  _id: string
  name: string
  description?: string
  parentId: string | null
}

export type ElectionStatus = 'upcoming' | 'live' | 'closed'

export interface Election {
  id: string
  name: string
  description?: string
  startsAt: string
  endsAt: string
  pricePerVote: number
  // Shown on the dashboard and, later, the public pages.
  coverImageUrl?: string
  coverImagePublicId?: string
  // The categories this election uses. null means an older election that uses every category.
  categoryIds: string[] | null
  eventCode: string
  status: ElectionStatus
  categoryCount?: number
  candidateCount?: number
  totalVotes?: number
}

export interface Candidate {
  _id: string
  name: string
  bio?: string
  imageUrl?: string
  imagePublicId?: string
  categories?: string[]
}

export interface Nomination {
  id: string
  code: number
  voteCount: number
  categoryId: string
  candidate: { id: string; name: string; imageUrl?: string }
}

// What every bulk-delete endpoint answers: how many went, and which ones could not and why.
export interface BulkDeleteResult {
  deleted: number
  skipped: { id: string; name: string; reason: string }[]
}

/* ---------- The public website (no sign-in) ---------- */

export interface PublicElection {
  slug: string
  name: string
  description?: string
  startsAt: string
  endsAt: string
  status: ElectionStatus
  pricePerVote: number
  eventCode: string
  coverImageUrl?: string
  organisation?: string
  updatedAt?: string
}

export interface PublicCandidate {
  slug: string
  name: string
  imageUrl?: string
  code: number
  votes: number
}

export interface PublicCategory {
  id: string
  name: string
  parentName?: string
  candidates: PublicCandidate[]
}

export interface PublicElectionDetail extends PublicElection {
  categories: PublicCategory[]
}

export interface PublicCandidateDetail {
  election: PublicElection
  candidate: { slug: string; name: string; bio?: string; imageUrl?: string; totalVotes: number }
  standingIn: { categoryId: string; name: string; parentName?: string; code: number; votes: number }[]
  othersInCategory: { name: string; candidates: PublicCandidate[] }
}

export type PaymentStatus = 'pending' | 'confirmed' | 'failed'

// One vote payment as the public verification page shows it. Never says who was voted for.
export interface PublicPayment {
  reference: string
  createdAt: string
  status: PaymentStatus
  // GHS
  amount: number
  electionName: string
  electionSlug?: string
  categoryName: string
  failureReason?: string
}
