import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { api } from '../lib/api'
import { Banner, Button, Input } from '../components/ui'
import { toast } from '../store/toast'
import { firstProblem, isEmail } from '../lib/validate'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = firstProblem([
      [!email.trim(), 'Enter your email address'],
      [!isEmail(email), 'Enter a valid email address'],
    ])
    if (problem) return toast.error(problem)
    setBusy(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-bold tracking-tight">Forgot your password?</h1>
      <p className="mb-6 mt-1.5 text-[15px] text-muted">Enter your email and we will send you a link to choose a new one.</p>
      {sent ? (
        <div className="space-y-4">
          <Banner>If that email is registered, a reset link is on its way. It works for 1 hour. Check your spam folder too.</Banner>
          <Button variant="secondary" className="w-full" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </div>
      ) : (
        <form noValidate onSubmit={submit} className="space-y-4">
          <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-required="true" autoFocus />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
      <p className="mt-5 text-center text-sm text-muted">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}
