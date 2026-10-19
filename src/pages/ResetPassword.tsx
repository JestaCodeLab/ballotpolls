import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { api, errorMessage } from '../lib/api'
import { Banner, Button, LinkButton, PasswordInput } from '../components/ui'
import { toast } from '../store/toast'
import { firstProblem } from '../lib/validate'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [expired, setExpired] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = firstProblem([
      [!password, 'Enter a new password'],
      [password.length < 8, 'Password must be at least 8 characters'],
      [!confirm, 'Confirm your new password'],
      [password !== confirm, 'Passwords do not match'],
    ])
    if (problem) return toast.error(problem)
    setBusy(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
    } catch (err) {
      const msg = errorMessage(err)
      setExpired(msg.includes('expired'))
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      {!token ? (
        <>
          <h1 className="font-display text-3xl font-bold tracking-tight">Link not valid</h1>
          <p className="mb-6 mt-1.5 text-[15px] text-muted">This reset link is missing its code. Ask for a new one.</p>
          <LinkButton to="/forgot-password" className="w-full">
            Request a new link
          </LinkButton>
        </>
      ) : done ? (
        <>
          <h1 className="font-display text-3xl font-bold tracking-tight">Password updated</h1>
          <div className="my-6">
            <Banner>Your password has been changed. You can sign in with it now.</Banner>
          </div>
          <LinkButton to="/login" className="w-full">
            Sign in
          </LinkButton>
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-bold tracking-tight">Choose a new password</h1>
          <p className="mb-6 mt-1.5 text-[15px] text-muted">Use at least 8 characters.</p>
          <form noValidate onSubmit={submit} className="space-y-4">
            <PasswordInput label="New password" value={password} onChange={(e) => setPassword(e.target.value)} aria-required="true" autoFocus />
            <PasswordInput label="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-required="true" />
            {expired && (
              <p className="text-sm">
                <Link to="/forgot-password" className="font-semibold text-brand hover:underline">
                  Request a new link
                </Link>
              </p>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Saving…' : 'Update password'}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted">
            <Link to="/login" className="font-semibold text-brand hover:underline">
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}
