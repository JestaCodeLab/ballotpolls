import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './store/auth'
import ToastViewport from './components/ToastViewport'
import ConfirmDialog from './components/ConfirmDialog'
import { AppLoader } from './components/Loading'
import SessionGuard from './components/SessionGuard'
import Layout from './components/Layout'
import SetPasswordModal from './components/SetPasswordModal'
import { canOpen, homeFor } from './lib/roles'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyPhone from './pages/VerifyPhone'
import Overview from './pages/Overview'
import Categories from './pages/Categories'
import Elections from './pages/Elections'
import ElectionForm from './pages/ElectionForm'
import ElectionDetail from './pages/ElectionDetail'
import AddCandidates from './pages/AddCandidates'
import Candidates from './pages/Candidates'
import CandidateEditor from './pages/CandidateEditor'
import Results from './pages/Results'
import Withdrawals from './pages/Withdrawals'
import SiteLayout from './components/site/SiteLayout'
import Home from './pages/site/Home'
import Events from './pages/site/Events'
import EventDetail from './pages/site/EventDetail'
import CandidatePublic from './pages/site/CandidatePublic'
import SiteNotFound from './pages/site/SiteNotFound'
import ShortLink from './pages/site/ShortLink'
import Verify from './pages/site/Verify'
import Settings from './pages/Settings'
import AdminLayout from './components/admin/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import AdminOrganisations from './pages/admin/AdminOrganisations'
import AdminUsers from './pages/admin/AdminUsers'
import AdminElections from './pages/admin/AdminElections'
import AdminPayments from './pages/admin/AdminPayments'
import AdminWithdrawals from './pages/admin/AdminWithdrawals'
import AdminOrganisationDetail from './pages/admin/AdminOrganisationDetail'
import AdminOrganiserDetail from './pages/admin/AdminOrganiserDetail'
import AdminElectionEdit from './pages/admin/AdminElectionEdit'
import AdminElectionNew from './pages/admin/AdminElectionNew'
import AdminElectionDetail from './pages/admin/AdminElectionDetail'
import AdminSms from './pages/admin/sms/AdminSms'
import AdminActivity from './pages/admin/AdminActivity'
import AdminUssd from './pages/admin/AdminUssd'
import AdminSmsCredit from './pages/admin/sms/AdminSmsCredit'
import AdminSmsReport from './pages/admin/sms/AdminSmsReport'
import AdminSmsCreditReturn from './pages/admin/sms/AdminSmsCreditReturn'

function Protected() {
  const { pathname } = useLocation()
  const user = useAuth((s) => s.user)
  const loading = useAuth((s) => s.loading)
  if (loading) return <AppLoader />
  if (!user) return <Navigate to="/login" replace />
  // The BallotPolls team has no organisation, so the organiser dashboard is not theirs: they work from /admin.
  if (user.role === 'superadmin') return <Navigate to="/admin" replace />
  // Registered but has not entered the SMS code yet: nothing else in the app opens until they do.
  if (!user.phoneVerified) return <VerifyPhone />
  // An invited team member must replace the temporary password before anything opens.
  if (user.mustChangePassword)
    return (
      <>
        <div className="min-h-screen bg-ground" />
        <SetPasswordModal />
      </>
    )
  // Team members only open the pages their role allows (a results checker lands on live results).
  if (!canOpen(user.role, pathname)) return <Navigate to={homeFor(user.role)} replace />
  return <Layout />
}

// Sign-in and sign-up pages are for people who are not signed in. Someone who already is goes straight to their
// dashboard instead, including when they press the browser's Back button after signing in.
function GuestOnly() {
  const user = useAuth((s) => s.user)
  const loading = useAuth((s) => s.loading)
  if (loading) return <AppLoader />
  if (user) return <Navigate to={homeFor(user.role)} replace />
  return <Outlet />
}

// Only for super admins. Anyone else is sent to the pages they can use.
function AdminOnly() {
  const user = useAuth((s) => s.user)
  const loading = useAuth((s) => s.loading)
  if (loading) return <AppLoader />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'superadmin') return <Navigate to={homeFor(user.role)} replace />
  return <AdminLayout />
}

export default function App() {
  const init = useAuth((s) => s.init)
  useEffect(() => {
    init()
  }, [init])

  return (
    <>
      <ToastViewport />
      <ConfirmDialog />
      <SessionGuard />
      <BrowserRouter>
        <Routes>
          {/* The public website. Open to everyone and meant for search engines. */}
          <Route element={<SiteLayout />}>
            <Route index element={<Home />} />
            <Route path="events" element={<Events />} />
            <Route path="verify" element={<Verify />} />
            <Route path="events/:slug" element={<EventDetail />} />
            <Route path="events/:slug/candidates/:candidateSlug" element={<CandidatePublic />} />
            <Route path="v/:id" element={<ShortLink />} />
            <Route path="*" element={<SiteNotFound />} />
          </Route>

          <Route element={<GuestOnly />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>
          {/* The reset link from an email works whether or not someone happens to be signed in. */}
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="admin" element={<AdminOnly />}>
            <Route index element={<AdminOverview />} />
            <Route path="organisations" element={<AdminOrganisations />} />
            <Route path="organisations/:id" element={<AdminOrganisationDetail />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminOrganiserDetail />} />
            <Route path="elections" element={<AdminElections />} />
            <Route path="elections/:id" element={<AdminElectionDetail />} />
            <Route path="elections/new" element={<AdminElectionNew />} />
            <Route path="elections/:id/edit" element={<AdminElectionEdit />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="withdrawals" element={<AdminWithdrawals />} />
            <Route path="results" element={<Results admin />} />
            <Route path="ussd" element={<AdminUssd />} />
            <Route path="activity" element={<AdminActivity />} />
            <Route path="sms" element={<AdminSms />} />
            <Route path="sms/credit" element={<AdminSmsCredit />} />
            <Route path="sms/credit/return" element={<AdminSmsCreditReturn />} />
            <Route path="sms/report" element={<AdminSmsReport />} />
          </Route>
          <Route element={<Protected />}>
            <Route path="dashboard" element={<Overview />} />
            <Route path="elections" element={<Elections />} />
            <Route path="elections/new" element={<ElectionForm />} />
            <Route path="elections/:id" element={<ElectionDetail />} />
            <Route path="elections/:id/edit" element={<ElectionForm />} />
            <Route path="elections/:id/candidates" element={<AddCandidates />} />
            <Route path="candidates" element={<Candidates />} />
            <Route path="candidates/new" element={<CandidateEditor />} />
            <Route path="candidates/:id" element={<CandidateEditor />} />
            <Route path="categories" element={<Categories />} />
            <Route path="results" element={<Results />} />
            <Route path="withdrawals" element={<Withdrawals />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}
