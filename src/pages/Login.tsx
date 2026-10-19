import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { useAuth } from '../store/auth'
import { Button, Input, PasswordInput } from '../components/ui'
import { toast } from '../store/toast'
import { firstProblem } from '../lib/validate'
import { cleanPhoneInput, formatPhone, isGhanaPhone } from '../lib/phone'

export default function Login() {
  const login = useAuth((s) => s.login)
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = firstProblem([
      [!phone, 'Enter your phone number'],
      [!isGhanaPhone(phone), 'Enter a 10-digit Ghana phone number starting with 0'],
      [!password, 'Enter your password'],
    ])
    if (problem) return toast.error(problem)
    setBusy(true)
    try {
      await login(phone, password)
      navigate('/dashboard')
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell mode="login">
      <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mb-6 mt-1.5 text-[15px] text-muted">Sign in with your phone number and password.</p>
      <form noValidate onSubmit={submit} className="space-y-4">
        <Input
          label="Phone number"
          type="tel"
          inputMode="numeric"
          placeholder="024 123 4567"
          value={formatPhone(phone)}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(cleanPhoneInput(e.target.value))}
          aria-required="true"
          autoComplete="tel-national"
        />
        <div>
          <PasswordInput label="Password" value={password} onChange={(e) => setPassword(e.target.value)} aria-required="true" />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-sm font-semibold text-brand hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-brand hover:underline">
          Register
        </Link>
      </p>
    </AuthShell>
  )
}
