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
  // Only in the answer to registering: false when the verification SMS could not be sent.
  phoneCodeSent?: boolean
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

/* ---------- Super admin (the BallotPolls team) ---------- */

export interface AdminStats {
  organisations: number
  suspendedOrganisations: number
  organisers: number
  elections: number
  liveElections: number
  votes: number
  // GHS
  revenue: number
  confirmedPayments: number
  pendingWithdrawals: number
  pendingWithdrawalsAmount: number
  series: { date: string; votes: number; revenue: number }[]
  recentPayments: { id: string; reference: string; status: PaymentStatus; amount: number; election?: string; createdAt: string }[]
}

export interface AdminOrganisation {
  id: string
  name: string
  status: 'active' | 'suspended'
  createdAt: string
  owner?: { name: string; email: string; phone: string }
  elections: number
  revenue: number
  paidOut: number
}

export interface AdminUser {
  id: string
  name: string
  email: string
  phone: string
  phoneVerified: boolean
  createdAt?: string
  organisation?: { id: string; name: string; status: 'active' | 'suspended' }
}

export interface AdminElection {
  id: string
  name: string
  eventCode: string
  status: ElectionStatus
  startsAt: string
  endsAt: string
  pricePerVote: number
  organisation?: string
  votes: number
  revenue: number
}

export interface AdminPayment {
  id: string
  reference: string
  phone: string
  status: PaymentStatus
  amount: number
  operator?: string
  election?: string
  organisation?: string
  category?: string
  candidate?: string
  failureReason?: string
  createdAt: string
  confirmedAt?: string
}

export interface AdminWithdrawal extends Withdrawal {
  organisation?: string
  // The full number the money is sent to (the regular `payoutPhone` is masked).
  payoutPhoneFull: string
}

export interface AdminElectionRow {
  id: string
  name: string
  eventCode: string
  status: ElectionStatus
  startsAt: string
  endsAt: string
  pricePerVote: number
  votes: number
  revenue: number
  // Money has changed hands: the price and opening time are fixed and the election cannot be deleted.
  locked: boolean
}

export interface AdminOrganisationDetail {
  id: string
  name: string
  status: 'active' | 'suspended'
  createdAt: string
  revenue: number
  paidOut: number
  organisers: { id: string; name: string; email: string; phone: string; phoneVerified: boolean }[]
  elections: AdminElectionRow[]
  // Everything deleting the organisation would remove.
  counts: { organisers: number; elections: number; candidates: number; categories: number; payments: number; withdrawals: number }
}

export interface AdminOrganiserDetail {
  id: string
  firstName: string
  lastName: string
  name: string
  email: string
  phone: string
  phoneVerified: boolean
  phoneVerifiedAt?: string
  passwordChangedAt?: string
  createdAt?: string
  organisation?: { id: string; name: string; status: 'active' | 'suspended' }
  onlyOrganiser: boolean
}

export interface AdminElectionDetail extends AdminElectionRow {
  description: string
  coverImageUrl?: string
  organisation?: { id: string; name: string }
}

/* ---------- Super admin SMS ---------- */

export interface SmsBalance {
  credits: number
  fetchedAt: string
}

export interface SmsPackage {
  id: string
  name: string
  credits: number
  // GHS
  price: number
  // FlockText's own tag, e.g. "Most popular". Empty for most.
  badge: string
}

export interface SmsSenderId {
  id: string
  senderId: string
  isPrimary: boolean
  purpose: string
}

export type SmsStatus = 'sent' | 'delivered' | 'failed'

export interface SmsRow {
  id: string
  sentAt: string
  name: string | null
  organisation: string | null
  phone: string
  text: string
  credits: number
  status: SmsStatus
  deliveredAt?: string
  senderId?: string
  providerRef?: string
  // The status FlockText gave the message, word for word.
  providerStatus?: string
  providerReply?: string
  failureReason?: string
}

export interface SmsReportMeta {
  stats: { total: number; delivered: number; sent: number; failed: number }
}
