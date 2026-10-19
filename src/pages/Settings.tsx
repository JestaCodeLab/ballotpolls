import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api, errorMessage, type NotificationPrefs, type User } from '../lib/api'
import { useAuth } from '../store/auth'
import { toast } from '../store/toast'
import { Button, Card, Input, PageHeader, Switch, PasswordInput } from '../components/ui'
import { firstProblem } from '../lib/validate'
import { formatPhone, toLocalPhone } from '../lib/phone'

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'organisation', label: 'Organisation' },
  { id: 'security', label: 'Password' },
  { id: 'notifications', label: 'Notifications' },
]

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <Card className="scroll-mt-24">
      <section id={id} aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
        <div>
          <h2 id={`${id}-title`} className="font-display text-[22px] font-bold">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        {children}
      </section>
    </Card>
  )
}

export default function Settings() {
  const { hash } = useLocation()
  const active = SECTIONS.find((s) => `#${s.id}` === hash)?.id ?? 'profile'

  // Opening /settings#organisation (e.g. from the profile menu) scrolls to that card.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your profile, organisation, password and notifications." />
      <div className="flex flex-wrap items-start gap-7">
        <nav aria-label="Settings sections" className="flex w-full flex-row gap-1 overflow-x-auto md:w-[200px] md:flex-col">
          {SECTIONS.map((s) => (
            <Link
              key={s.id}
              to={{ hash: `#${s.id}` }}
              replace
              className={`flex min-h-11 items-center whitespace-nowrap rounded-[10px] px-3.5 text-[15px] ${active === s.id ? 'bg-brand-tint font-semibold text-[#0b5a43]' : 'font-medium hover:bg-white'}`}
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="flex min-w-0 max-w-[760px] flex-1 basis-[520px] flex-col gap-5">
          <ProfileSection />
          <OrganisationSection />
          <PasswordSection />
          <NotificationsSection />
        </div>
      </div>
    </>
  )
}

function ProfileSection() {
  const user = useAuth((s) => s.user)!
  const setUser = useAuth((s) => s.setUser)
  const [firstName, setFirstName] = useState(user.firstName)
  const [lastName, setLastName] = useState(user.lastName)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = firstProblem([
      [!firstName.trim(), 'Enter your first name'],
      [!lastName.trim(), 'Enter your last name'],
    ])
    if (problem) return toast.error(problem)
    setBusy(true)
    try {
      const { data } = await api.patch<User>('/auth/profile', { firstName, lastName })
      setUser(data)
      toast.success('Profile saved')
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section id="profile" title="Profile" subtitle="How you appear to your team.">
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} aria-required="true" autoComplete="given-name" />
          <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} aria-required="true" autoComplete="family-name" />
        </div>
        <div>
          <Input label="Email" type="email" value={user.email} disabled readOnly />
          <p className="mt-1.5 text-[13px] text-muted">Used for password reset links. It cannot be changed here.</p>
        </div>
        <div className="max-w-xs">
          <Input label="Phone number" type="tel" value={formatPhone(toLocalPhone(user.phone))} disabled readOnly />
          <p className="mt-1.5 text-[13px] text-muted">You sign in with this number, and withdrawal codes are sent to it.</p>
        </div>
        <div>
          <Button type="submit" disabled={busy} className="min-h-[46px] px-6">
            {busy ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </Section>
  )
}

function OrganisationSection() {
  const user = useAuth((s) => s.user)!
  const setUser = useAuth((s) => s.setUser)
  const [name, setName] = useState(user.organisation?.name ?? '')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return toast.error('Enter your organisation name')
    setBusy(true)
    try {
      const { data } = await api.patch<{ id: string; name: string }>('/organisation', { name })
      setUser({ ...user, organisation: { ...user.organisation!, name: data.name } })
      setName(data.name)
      toast.success('Organisation updated')
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section id="organisation" title="Organisation" subtitle="Shown in the sidebar and to your team.">
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Organisation name" value={name} onChange={(e) => setName(e.target.value)} aria-required="true" autoComplete="organization" maxLength={120} />
        <div>
          <Button type="submit" disabled={busy} className="min-h-[46px] px-6">
            {busy ? 'Saving…' : 'Save organisation'}
          </Button>
        </div>
      </form>
    </Section>
  )
}

function PasswordSection() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = firstProblem([
      [!current, 'Enter your current password'],
      [!next, 'Enter a new password'],
      [next.length < 8, 'Password must be at least 8 characters'],
      [next === current, 'Choose a password different from the current one'],
      [!confirm, 'Confirm your new password'],
      [next !== confirm, 'Passwords do not match'],
    ])
    if (problem) return toast.error(problem)
    setBusy(true)
    try {
      const { data } = await api.post<{ sessionExpiresAt: string }>('/auth/change-password', { currentPassword: current, newPassword: next })
      useAuth.getState().setSessionExpiry(data.sessionExpiresAt)
      setCurrent('')
      setNext('')
      setConfirm('')
      toast.success('Password updated', 'Your other devices have been signed out.')
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section id="security" title="Password" subtitle="Changing it signs you out on all other devices.">
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <div className="max-w-md">
          <PasswordInput label="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} aria-required="true" autoComplete="current-password" />
        </div>
        <div className="grid max-w-[620px] gap-3 sm:grid-cols-2">
          <PasswordInput label="New password" placeholder="At least 8 characters" value={next} onChange={(e) => setNext(e.target.value)} aria-required="true" autoComplete="new-password" />
          <PasswordInput label="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-required="true" autoComplete="new-password" />
        </div>
        <div>
          <Button type="submit" disabled={busy} className="min-h-[46px] px-6">
            {busy ? 'Updating…' : 'Update password'}
          </Button>
        </div>
      </form>
    </Section>
  )
}

const PREFS: { key: keyof NotificationPrefs; title: string; desc: string }[] = [
  { key: 'payments', title: 'Payment confirmations', desc: 'A notice when voters’ payments are confirmed or fail.' },
  { key: 'reminders', title: 'Election reminders', desc: 'Opening and closing reminders for your elections.' },
  { key: 'milestones', title: 'Milestones', desc: 'When an election passes 1,000 or 10,000 votes.' },
  { key: 'dailyEmail', title: 'Daily results email', desc: 'A summary of votes and revenue each morning.' },
]

function NotificationsSection() {
  const user = useAuth((s) => s.user)!
  const setUser = useAuth((s) => s.setUser)

  const toggle = async (key: keyof NotificationPrefs, value: boolean) => {
    const before = user
    // Flip it on screen straight away, and put it back if the save fails.
    setUser({ ...user, notificationPrefs: { ...user.notificationPrefs, [key]: value } })
    try {
      const { data } = await api.patch<User>('/auth/notification-prefs', { [key]: value })
      setUser(data)
    } catch (err) {
      setUser(before)
      toast.error(errorMessage(err))
    }
  }

  return (
    <Section id="notifications" title="Notifications" subtitle="Choose what reaches the bell and your email. Changes save as you make them.">
      <div>
        {PREFS.map((p) => (
          <div key={p.key} className="flex items-center gap-4 border-t border-[#eef2f0] py-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">{p.title}</div>
              <div className="mt-0.5 text-[13px] text-muted">{p.desc}</div>
            </div>
            <Switch label={p.title} checked={user.notificationPrefs[p.key]} onChange={(v) => toggle(p.key, v)} />
          </div>
        ))}
      </div>
    </Section>
  )
}
