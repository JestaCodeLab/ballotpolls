import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Smartphone } from 'lucide-react'
import AuthShell from '../components/AuthShell'
import OtpInput from '../components/OtpInput'
import { api, type User } from '../lib/api'
import { useAuth } from '../store/auth'
import { toast } from '../store/toast'
import { Button, Input } from '../components/ui'
import { cleanPhoneInput, formatPhone, isGhanaPhone, toLocalPhone } from '../lib/phone'

const COOLDOWN_SECONDS = 60

// Shown instead of the app while the account's phone number is unverified.
export default function VerifyPhone() {
  const user = useAuth((s) => s.user)!
  const setUser = useAuth((s) => s.setUser)
  const logout = useAuth((s) => s.logout)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  // The first code went out when the account was created, unless the text could not be sent: then resending is open at once.
  const [cooldown, setCooldown] = useState(user.phoneCodeSent === false ? 0 : COOLDOWN_SECONDS)
  const [changing, setChanging] = useState(false)
  const [newPhone, setNewPhone] = useState('')

  useEffect(() => {
    if (user.phoneCodeSent === false) toast.error('We could not send your code', 'Press Resend code to try again.')
    // Only on arrival, from sign-up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    if (code.length < 6) return toast.error('Enter the 6-digit code')
    setBusy(true)
    try {
      // Replacing the user flips phoneVerified, which swaps this screen for the app.
      const { data } = await api.post<User>('/auth/verify-phone', { code })
      setUser(data)
      toast.success('Phone number verified', 'Your account is ready.')
    } catch (err) {
      toast.fromError(err)
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setSending(true)
    try {
      await api.post('/auth/resend-code')
      toast.success('Code sent', `Check the SMS on ${formatPhone(toLocalPhone(user.phone))}.`)
      setCooldown(COOLDOWN_SECONDS)
      setCode('')
    } catch (err) {
      toast.fromError(err)
    } finally {
      setSending(false)
    }
  }

  const savePhone = async (e: FormEvent) => {
    e.preventDefault()
    if (!isGhanaPhone(newPhone)) return toast.error('Enter a 10-digit Ghana phone number starting with 0')
    setBusy(true)
    try {
      const { data } = await api.patch<User>('/auth/unverified-phone', { phone: newPhone })
      setUser(data)
      toast.success('Number updated', 'We sent a new code.')
      setChanging(false)
      setCode('')
      setCooldown(COOLDOWN_SECONDS)
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <span className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-brand-tint text-brand">
        <Smartphone size={26} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">Verify your phone number</h1>
      <p className="mb-6 mt-1.5 text-[15px] leading-relaxed text-muted">
        We sent a 6-digit code by SMS to{' '}
        <strong className="font-semibold text-ink">{formatPhone(toLocalPhone(user.phone))}</strong>. Enter it below to finish
        setting up your account.
      </p>

      {changing ? (
        <form noValidate onSubmit={savePhone} className="space-y-4">
          <Input
            label="Correct phone number"
            type="tel"
            inputMode="numeric"
            placeholder="024 123 4567"
            value={formatPhone(newPhone)}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPhone(cleanPhoneInput(e.target.value))}
            autoComplete="tel-national"
            autoFocus
          />
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save and send code'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setChanging(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <form noValidate onSubmit={verify} className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Verification code</legend>
            <OtpInput value={code} onChange={setCode} disabled={busy} />
          </fieldset>
          <Button type="submit" disabled={busy || code.length < 6} className="w-full">
            {busy ? 'Verifying…' : 'Verify and continue'}
          </Button>
        </form>
      )}

      {!changing && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-muted">
          {cooldown > 0 ? (
            <span>
              Didn&apos;t get it? <span className="font-semibold text-ink">Resend in 0:{String(cooldown).padStart(2, '0')}</span>
            </span>
          ) : (
            <button type="button" onClick={resend} disabled={sending} className="font-semibold text-brand hover:underline disabled:opacity-50">
              {sending ? 'Sending…' : 'Resend code'}
            </button>
          )}
          <button type="button" onClick={() => setChanging(true)} className="font-semibold text-brand hover:underline">
            Wrong number? Change it
          </button>
        </div>
      )}
      <p className="mt-4 text-center text-sm text-muted">
        <button type="button" onClick={logout} className="font-semibold text-brand hover:underline">
          Sign out
        </button>
      </p>
    </AuthShell>
  )
}
