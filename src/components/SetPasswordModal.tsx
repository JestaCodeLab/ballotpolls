import { useState, type FormEvent } from 'react'
import { api, type User } from '../lib/api'
import { useAuth } from '../store/auth'
import { toast } from '../store/toast'
import { firstProblem } from '../lib/validate'
import Modal from './Modal'
import { Button, PasswordInput } from './ui'

// Shown over the app the first time an invited team member signs in with the temporary password from their email.
// It cannot be dismissed: once they choose their own password the session carries on and the app opens.
export default function SetPasswordModal() {
  const setUser = useAuth((s) => s.setUser)
  const logout = useAuth((s) => s.logout)
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = firstProblem([
      [!next, 'Enter a new password'],
      [next.length < 8, 'Password must be at least 8 characters'],
      [!confirm, 'Confirm your new password'],
      [next !== confirm, 'Passwords do not match'],
    ])
    if (problem) return toast.error(problem)
    setBusy(true)
    try {
      const { data } = await api.post<User>('/auth/set-password', { newPassword: next })
      setUser(data)
      toast.success('Password set', 'Welcome to BallotPolls.')
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      locked
      title="Choose your password"
      description="You signed in with a temporary password. Choose your own to continue."
      onClose={() => {}}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => void logout()} className="min-h-[46px] px-5">
            Sign out
          </Button>
          <Button type="submit" form="set-password-form" disabled={busy} className="min-h-[46px] px-6">
            {busy ? 'Saving…' : 'Save and continue'}
          </Button>
        </>
      }
    >
      <form id="set-password-form" noValidate onSubmit={submit} className="flex flex-col gap-4 pb-2">
        <PasswordInput label="New password" placeholder="At least 8 characters" value={next} onChange={(e) => setNext(e.target.value)} aria-required="true" autoComplete="new-password" />
        <PasswordInput label="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-required="true" autoComplete="new-password" />
      </form>
    </Modal>
  )
}
