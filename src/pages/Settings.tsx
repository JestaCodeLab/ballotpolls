import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api, errorMessage, type NotificationPrefs, type User } from '../lib/api'
import { useAuth } from '../store/auth'
import { toast } from '../store/toast'
import { Button, Card, Input, PageHeader, Switch, PasswordInput } from '../components/ui'
import { firstProblem } from '../lib/validate'
import { formatPhone, toLocalPhone } from '../lib/phone'
import { DEFAULT_BRAND, MIN_ACCENT_CONTRAST, MIN_MAIN_CONTRAST, PRESETS, contrast, isHex, mix, onColor } from '../lib/color'

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

// One colour: a picker and a typed value that stay in step, with a note on whether it is readable.
function ColourField({ label, hint, value, onChange, problem }: { label: string; hint: string; value: string; onChange: (v: string) => void; problem: string | null }) {
  const [text, setText] = useState(value)
  // The picker (or a preset) changed the colour from outside: show it.
  useEffect(() => setText(value), [value])
  const type = (v: string) => {
    const t = v.startsWith('#') ? v : `#${v}`
    setText(t.slice(0, 7))
    if (isHex(t)) onChange(t.toUpperCase())
  }
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium">
        {label} <span className="font-normal text-muted">{hint}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <input type="color" aria-label={`${label}, colour picker`} value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-[46px] w-14 shrink-0 cursor-pointer rounded-[10px] border border-field bg-white p-1" />
        <input
          aria-label={`${label}, hex value`}
          value={text}
          onChange={(e) => type(e.target.value)}
          onBlur={() => setText(value)}
          maxLength={7}
          spellCheck={false}
          className="min-h-[46px] w-32 rounded-[10px] border border-field bg-white px-3.5 font-mono text-[15px] uppercase outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <p role={problem ? 'alert' : undefined} className={`mt-1.5 text-[13px] ${problem ? 'text-danger' : 'text-[#0b5a43]'}`}>
        {problem ?? 'Readable'}
      </p>
    </div>
  )
}

function OrganisationSection() {
  const user = useAuth((s) => s.user)!
  const setUser = useAuth((s) => s.setUser)
  const [name, setName] = useState(user.organisation?.name ?? '')
  const saved = user.organisation?.brand
  const [primary, setPrimary] = useState((saved?.primary ?? DEFAULT_BRAND.primary).toUpperCase())
  const [accent, setAccent] = useState((saved?.accent ?? DEFAULT_BRAND.accent).toUpperCase())
  const [busy, setBusy] = useState(false)

  // The same checks the server makes, so a colour that would be refused is flagged before saving.
  const mainContrast = contrast(primary, '#FFFFFF')
  const accentContrast = contrast(accent, primary)
  const mainProblem = mainContrast < MIN_MAIN_CONTRAST ? `Too light: white writing on it would be hard to read (contrast ${mainContrast.toFixed(1)}, needs ${MIN_MAIN_CONTRAST}).` : null
  const accentProblem = accentContrast < MIN_ACCENT_CONTRAST ? `Does not stand out against the main colour (contrast ${accentContrast.toFixed(1)}, needs ${MIN_ACCENT_CONTRAST}).` : null
  const isDefault = primary === DEFAULT_BRAND.primary.toUpperCase() && accent === DEFAULT_BRAND.accent.toUpperCase()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return toast.error('Enter your organisation name')
    if (mainProblem || accentProblem) return toast.error('Fix the colours first', mainProblem ?? accentProblem ?? undefined)
    setBusy(true)
    try {
      // Colours left at BallotPolls' own are sent as null, which clears them.
      const { data } = await api.patch<{ id: string; name: string; brand: { primary: string | null; accent: string | null } | null }>('/organisation', {
        name,
        primaryColor: primary === DEFAULT_BRAND.primary.toUpperCase() ? null : primary,
        accentColor: accent === DEFAULT_BRAND.accent.toUpperCase() ? null : accent,
      })
      setUser({ ...user, organisation: { ...user.organisation!, name: data.name, brand: data.brand } })
      setName(data.name)
      toast.success('Organisation updated')
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const onAccent = onColor(accent)

  return (
    <Section id="organisation" title="Organisation" subtitle="Shown in the sidebar and to your team. The colours are used on your candidate flyers.">
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <Input label="Organisation name" value={name} onChange={(e) => setName(e.target.value)} aria-required="true" autoComplete="organization" maxLength={120} />

        <div className="border-t border-line pt-5">
          <h3 className="text-base font-semibold">Brand colours</h3>
          <p className="mt-1 text-sm text-muted">Pick the colours of your organisation. The main colour is the flyer's background and must be dark enough for white writing; the accent is used for highlights and has to stand out against it.</p>

          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-5">
            <div className="flex min-w-[260px] flex-1 flex-col gap-5">
              <ColourField label="Main colour" hint="(background)" value={primary} onChange={setPrimary} problem={mainProblem} />
              <ColourField label="Accent colour" hint="(highlights and the code badge)" value={accent} onChange={setAccent} problem={accentProblem} />
              <div>
                <div className="mb-2 text-sm font-medium">Or start from a pair</div>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      title={p.name}
                      aria-label={`Use ${p.name} colours`}
                      onClick={() => {
                        setPrimary(p.primary.toUpperCase())
                        setAccent(p.accent.toUpperCase())
                      }}
                      className="flex h-11 w-[72px] items-center overflow-hidden rounded-[10px] border border-field hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      <span className="h-full flex-1" style={{ background: p.primary }} />
                      <span className="h-full w-6" style={{ background: p.accent }} />
                    </button>
                  ))}
                </div>
              </div>
              {!isDefault && (
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setPrimary(DEFAULT_BRAND.primary.toUpperCase())
                      setAccent(DEFAULT_BRAND.accent.toUpperCase())
                    }}
                    className="min-h-10 px-4 text-sm"
                  >
                    Use BallotPolls colours
                  </Button>
                </div>
              )}
            </div>

            {/* How the flyer's header will look, with the writing colours that are actually used. */}
            <div aria-hidden="true" className="w-full max-w-[300px] flex-none rounded-[20px] p-5" style={{ background: primary, color: '#FFFFFF' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-display text-sm font-bold">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md text-xs" style={{ background: accent, color: onAccent }}>
                    ✓
                  </span>
                  BallotPolls
                </span>
                <span className="rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-widest" style={{ borderColor: accent, color: accent }}>
                  VOTE BY PHONE
                </span>
              </div>
              <div className="mt-5 text-[10px] font-bold tracking-[0.16em]" style={{ color: accent }}>
                VOTE FOR
              </div>
              <div className="font-display text-2xl font-bold leading-tight">Ama Boateng</div>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-12 w-16 flex-col items-center justify-center rounded-xl text-center" style={{ background: accent, color: onAccent, border: `3px solid ${primary}` }}>
                  <span className="text-[7px] font-bold tracking-widest">CODE</span>
                  <span className="font-display text-sm font-bold leading-none">4821</span>
                </span>
                <span className="text-xs" style={{ color: mix('#FFFFFF', primary, 0.12) }}>
                  Ghana Youth Awards
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <Button type="submit" disabled={busy || Boolean(mainProblem || accentProblem)} className="min-h-[46px] px-6">
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
