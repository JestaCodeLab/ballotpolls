import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './store/auth'
import ToastViewport from './components/ToastViewport'
import ConfirmDialog from './components/ConfirmDialog'
import { AppLoader } from './components/Loading'
import SessionGuard from './components/SessionGuard'
import Layout from './components/Layout'
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
import Verify from './pages/site/Verify'
import Settings from './pages/Settings'

function Protected() {
  const user = useAuth((s) => s.user)
  const loading = useAuth((s) => s.loading)
  if (loading) return <AppLoader />
  if (!user) return <Navigate to="/login" replace />
  // Registered but has not entered the SMS code yet: nothing else in the app opens until they do.
  if (!user.phoneVerified) return <VerifyPhone />
  return <Layout />
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
            <Route path="*" element={<SiteNotFound />} />
          </Route>

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
