import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { useAuth } from '../store/auth'
import { Button, Input, PasswordInput } from '../components/ui'
import { toast } from '../store/toast'
import { cleanPhoneInput, formatPhone, isGhanaPhone } from '../lib/phone'
import { firstProblem, isEmail } from '../lib/validate'

export default function Register() {
  const register = useAuth((s) => s.register)
  const navigate = useNavigate()
  const [form, setForm] = useState({
    organisationName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  })
  const [busy, setBusy] = useState(false)

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const onPhone = (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, phone: cleanPhoneInput(e.target.value) }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = firstProblem([
      [!form.firstName.trim(), 'Enter your first name'],
      [!form.lastName.trim(), 'Enter your last name'],
      [form.organisationName.trim().length < 2, 'Enter your organisation name'],
      [!form.email.trim(), 'Enter your email address'],
      [!isEmail(form.email), 'Enter a valid email address'],
      [!form.phone, 'Enter your phone number'],
      [!isGhanaPhone(form.phone), 'Enter a 10-digit Ghana phone number starting with 0'],
      [!form.password, 'Choose a password'],
      [form.password.length < 8, 'Password must be at least 8 characters'],
    ])
    if (problem) return toast.error(problem)
    setBusy(true)
    try {
      await register(form)
      toast.success('Account created', 'We sent a code to your phone.')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell mode="register">
      <h1 className="font-display text-3xl font-bold tracking-tight">Create an account</h1>
      <p className="mb-6 mt-1.5 text-[15px] text-muted">Set up your organisation details. We will text a code to verify your phone number.</p>
      <form noValidate onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" value={form.firstName} onChange={set('firstName')} aria-required="true" autoComplete="given-name" />
          <Input label="Last name" value={form.lastName} onChange={set('lastName')} aria-required="true" autoComplete="family-name" />
        </div>
        <Input label="Organisation name" value={form.organisationName} onChange={set('organisationName')} aria-required="true" autoComplete="organization" />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} aria-required="true" autoComplete="email" />
        <div>
          <Input label="Phone number" type="tel" inputMode="numeric" placeholder="024 123 4567" value={formatPhone(form.phone)} onChange={onPhone} aria-required="true" autoComplete="tel-national" />
        </div>
        <PasswordInput label="Password" placeholder="At least 8 characters" value={form.password} onChange={set('password')} aria-required="true" />
        <Button type="submit" disabled={busy} className="w-full mt-2">
          {busy ? 'Creating…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
