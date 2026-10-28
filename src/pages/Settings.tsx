import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Mail, RefreshCw, Trash2, UserPlus } from 'lucide-react'
import { api, errorMessage, type NotificationPrefs, type TeamMember, type TeamRole, type User } from '../lib/api'
import { useAuth } from '../store/auth'
import { toast } from '../store/toast'
import { Avatar, Button, Card, IconButton, Input, PageHeader, Select, Switch, PasswordInput } from '../components/ui'
import Modal from '../components/Modal'
import DataTable, { type Column } from '../components/DataTable'
import { confirmDelete } from '../store/confirm'
import { ROLE_INFO, TEAM_ROLE_OPTIONS } from '../lib/roles'
import { firstProblem, isEmail } from '../lib/validate'
import { cleanPhoneInput, formatPhone, isGhanaPhone, toLocalPhone } from '../lib/phone'
import { DEFAULT_BRAND, MIN_ACCENT_CONTRAST, MIN_MAIN_CONTRAST, PRESETS, contrast, isHex, mix, onColor } from '../lib/color'

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'organisation', label: 'Organisation', adminOnly: true },
  { id: 'team', label: 'Team', adminOnly: true },
  { id: 'security', label: 'Password' },
  { id: 'notifications', label: 'Notifications', adminOnly: true },
]

function Section({ id, title, subtitle, children, action, wide }: { id: string; title: string; subtitle: string; children: ReactNode; action?: ReactNode; wide?: boolean }) {
  const content = (
    <section id={id} aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-64">
          <h2 id={`${id}-title`} className="font-display text-[22px] font-bold">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
  // `wide` sections (the team table) are not boxed in a card: the table is its own card.
  return wide ? content : <Card className="scroll-mt-24">{content}</Card>
}

export default function Settings() {
  const { hash } = useLocation()
  // Team members (results checkers, electoral commission) only manage their own profile and password.
  const isAdmin = useAuth((u) => u.user?.role === 'orgadmin')
  const sections = SECTIONS.filter((x) => isAdmin || !x.adminOnly)
  const active = sections.find((s) => `#${s.id}` === hash)?.id ?? 'profile'

  return (
    <>
      <PageHeader title="Settings" subtitle={isAdmin ? 'Manage your profile, organisation, team, password and notifications.' : 'Manage your profile and password.'} />
      <nav aria-label="Settings sections" className="-mt-2 flex gap-1 overflow-x-auto border-b border-line">
        {sections.map((s) => (
          <Link
            key={s.id}
            to={{ hash: `#${s.id}` }}
            replace
            aria-current={active === s.id ? 'page' : undefined}
            className={`-mb-px flex min-h-11 items-center whitespace-nowrap border-b-2 px-4 text-[15px] ${active === s.id ? 'border-brand font-semibold text-[#0b5a43]' : 'border-transparent font-medium text-muted hover:text-ink'}`}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-5">
        {active === 'profile' && <ProfileSection />}
        {active === 'organisation' && <OrganisationSection />}
        {active === 'team' && <TeamSection />}
        {active === 'security' && <PasswordSection />}
        {active === 'notifications' && <NotificationsSection />}
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Input label="Email" type="email" value={user.email} disabled readOnly />
            <p className="mt-1.5 text-[13px] text-muted">Used for password reset links. It cannot be changed here.</p>
          </div>
          <div>
            <Input label="Phone number" type="tel" value={formatPhone(toLocalPhone(user.phone))} disabled readOnly />
            <p className="mt-1.5 text-[13px] text-muted">You sign in with this number, and withdrawal codes are sent to it.</p>
          </div>
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

/* ---------- Team ---------- */

const roleChip = (role: string) => (role === 'orgadmin' ? 'bg-brand-tint text-[#0b5a43]' : role === 'electoral_commission' ? 'bg-[#dfe9fb] text-[#1f3f7a]' : 'bg-[#e6ede9] text-[#3f4f49]')

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: (m: TeamMember) => void }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [role, setRole] = useState<TeamRole>('electoral_commission')
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: k === 'phone' ? cleanPhoneInput(e.target.value) : e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = firstProblem([
      [!form.firstName.trim(), 'Enter their first name'],
      [!form.lastName.trim(), 'Enter their last name'],
      [!form.email.trim(), 'Enter their email address'],
      [!isEmail(form.email), 'Enter a valid email address'],
      [!form.phone, 'Enter their phone number'],
      [!isGhanaPhone(form.phone), 'Enter a 10-digit Ghana phone number starting with 0'],
    ])
    if (problem) return toast.error(problem)
    setBusy(true)
    try {
      const { data } = await api.post<TeamMember>('/team', { ...form, role })
      onInvited(data)
      toast.success('Invitation sent', `We emailed ${data.email} a temporary password.`)
      onClose()
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Invite a team member"
      description="We email them a temporary password. They sign in with their phone number and are asked to choose their own password."
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} className="min-h-[46px] px-5">
            Cancel
          </Button>
          <Button type="submit" form="invite-form" disabled={busy} className="min-h-[46px] px-6">
            {busy ? 'Sending…' : 'Send invitation'}
          </Button>
        </>
      }
    >
      <form id="invite-form" noValidate onSubmit={submit} className="flex flex-col gap-4 pb-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="First name" value={form.firstName} onChange={set('firstName')} aria-required="true" autoComplete="off" maxLength={60} />
          <Input label="Last name" value={form.lastName} onChange={set('lastName')} aria-required="true" autoComplete="off" maxLength={60} />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={set('email')} aria-required="true" autoComplete="off" />
        <Input label="Phone number" type="tel" inputMode="numeric" placeholder="024 123 4567" value={formatPhone(form.phone)} onChange={set('phone')} aria-required="true" autoComplete="off" hint="(they sign in with it)" />
        <div>
          <Select label="Role" value={role} onChange={(v) => setRole(v as TeamRole)} options={TEAM_ROLE_OPTIONS} />
          <p className="mt-1.5 text-[13px] text-muted">{ROLE_INFO[role].description}</p>
        </div>
      </form>
    </Modal>
  )
}

function TeamSection() {
  const me = useAuth((s) => s.user)!
  const [members, setMembers] = useState<TeamMember[] | null>(null)
  const [inviting, setInviting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      setMembers((await api.get<TeamMember[]>('/team')).data)
    } catch (err) {
      toast.fromError(err)
      setMembers((list) => list ?? [])
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const replace = (m: TeamMember) => setMembers((list) => list?.map((x) => (x.id === m.id ? m : x)) ?? list)

  const changeRole = async (m: TeamMember, role: string) => {
    setBusyId(m.id)
    try {
      replace((await api.patch<TeamMember>(`/team/${m.id}`, { role })).data)
      toast.success('Role updated', `${m.name} is now ${ROLE_INFO[role as TeamRole].label}.`)
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusyId(null)
    }
  }

  const resend = async (m: TeamMember) => {
    setBusyId(m.id)
    try {
      replace((await api.post<TeamMember>(`/team/${m.id}/resend`)).data)
      toast.success('New invitation sent', `${m.name} was emailed a new temporary password.`)
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (m: TeamMember) => {
    if (!(await confirmDelete({ title: `Remove ${m.name}?`, message: 'They lose access to your organisation straight away.' }))) return
    setBusyId(m.id)
    try {
      await api.delete(`/team/${m.id}`)
      setMembers((list) => list?.filter((x) => x.id !== m.id) ?? list)
      toast.success('Team member removed')
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusyId(null)
    }
  }

  const columns: Column<TeamMember>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: (m) => m.name.toLowerCase(),
      cell: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.name} size={36} />
          <span className="font-semibold">
            {m.name} {m.id === me.id && <span className="text-xs font-normal text-muted">(you)</span>}
          </span>
        </div>
      ),
    },
    { key: 'email', header: 'Email', sortValue: (m) => m.email, cell: (m) => <span className="break-all">{m.email}</span> },
    { key: 'phone', header: 'Phone', className: 'whitespace-nowrap', cell: (m) => formatPhone(toLocalPhone(m.phone)) },
    {
      key: 'role',
      header: 'Role',
      sortValue: (m) => ROLE_INFO[m.role].label,
      cell: (m) =>
        m.id !== me.id && m.role !== 'orgadmin' ? (
          <Select label={`Role for ${m.name}`} hideLabel compact className="w-[170px]" value={m.role} disabled={busyId === m.id} onChange={(v) => void changeRole(m, v)} options={TEAM_ROLE_OPTIONS} />
        ) : (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleChip(m.role)}`}>{ROLE_INFO[m.role].label}</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (m) => m.status,
      cell: (m) =>
        m.status === 'invited' ? (
          <span className="rounded-full bg-[#fcefd0] px-2.5 py-1 text-xs font-semibold text-[#6b4300]">Invited</span>
        ) : (
          <span className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-[#0b5a43]">Active</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      hideHeader: true,
      align: 'right',
      cell: (m) =>
        m.id !== me.id && m.role !== 'orgadmin' ? (
          <div className="flex justify-end gap-2">
            <IconButton label="Resend invitation" disabled={busyId === m.id} onClick={() => void resend(m)}>
              <Mail size={16} strokeWidth={1.8} aria-hidden="true" />
            </IconButton>
            <IconButton label="Remove from team" tone="danger" disabled={busyId === m.id} onClick={() => void remove(m)}>
              <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
            </IconButton>
          </div>
        ) : null,
    },
  ]

  return (
    <Section
      id="team"
      wide
      title="Team"
      subtitle="Invite people to help run your elections. Each role only sees what it needs."
      action={
        <div className="flex items-center gap-2">
          <IconButton label="Refresh team" disabled={refreshing} onClick={() => void load()}>
            <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" className={refreshing ? 'animate-spin' : ''} />
          </IconButton>
          <Button type="button" onClick={() => setInviting(true)} className="min-h-[46px] gap-2 px-5">
            <UserPlus size={18} strokeWidth={1.8} aria-hidden="true" />
            Invite team member
          </Button>
        </div>
      }
    >
      <div className="flex flex-wrap gap-x-8 gap-y-1 rounded-[12px] bg-white px-4 py-3 text-[13px] text-muted ring-1 ring-line">
        {TEAM_ROLE_OPTIONS.map((r) => (
          <div key={r.value}>
            <span className="font-semibold text-ink">{r.label}:</span> {ROLE_INFO[r.value].description}
          </div>
        ))}
      </div>
      {members === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <DataTable caption="Team members" columns={columns} rows={members} rowKey={(m) => m.id} minWidth={760} initialSort={{ key: 'name', dir: 'asc' }} />
      )}
      {members !== null && members.length <= 1 && <p className="text-sm text-muted">No one else is on your team yet. Invite someone and they will get an email with a temporary password.</p>}
      {inviting && <InviteModal onClose={() => setInviting(false)} onInvited={(m) => setMembers((list) => [...(list ?? []), m])} />}
    </Section>
  )
}
