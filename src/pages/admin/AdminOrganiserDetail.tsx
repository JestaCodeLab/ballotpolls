import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, errorMessage, type AdminOrganiserDetail } from '../../lib/api'
import { Button, Card, Input, PageHeader } from '../../components/ui'
import { DetailPageSkeleton } from '../../components/Loading'
import { OrgChip } from '../../components/admin/parts'
import { confirmDelete } from '../../store/confirm'
import { toast } from '../../store/toast'
import { formatDateTime } from '../../lib/format'
import { cleanPhoneInput, formatPhone, isGhanaPhone, toLocalPhone } from '../../lib/phone'
import { firstProblem } from '../../lib/validate'

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-4 border-t border-line py-2.5 text-sm first:border-t-0">
    <span className="text-muted">{k}</span>
    <span className="text-right font-semibold">{v}</span>
  </div>
)

export default function AdminOrganiserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [u, setU] = useState<AdminOrganiserDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<AdminOrganiserDetail>(`/admin/users/${id}`)
      setU(data)
      setFirst(data.firstName)
      setLast(data.lastName)
      setEmail(data.email)
      setPhone(toLocalPhone(data.phone))
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (error) return <p className="text-muted">{error}</p>
  if (!u) return <DetailPageSkeleton />

  const phoneChanged = phone !== toLocalPhone(u.phone)
  const dirty = first.trim() !== u.firstName || last.trim() !== u.lastName || email.trim().toLowerCase() !== u.email || phoneChanged

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = firstProblem([
      [!first.trim(), 'Enter a first name'],
      [!last.trim(), 'Enter a last name'],
      [!/^\S+@\S+\.\S+$/.test(email.trim()), 'Enter a valid email address'],
      [!isGhanaPhone(phone), 'Enter a 10-digit Ghana phone number starting with 0'],
    ])
    if (problem) return toast.error(problem)
    setBusy(true)
    try {
      const { data } = await api.patch<{ phoneVerificationRequired: boolean }>(`/admin/users/${id}`, { firstName: first, lastName: last, email, phone })
      toast.success('Changes saved', data.phoneVerificationRequired ? 'They will verify the new number by SMS the next time they sign in.' : undefined)
      await load()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const verifyPhone = async () => {
    if (!(await confirmDelete({ title: `Verify ${u.name}'s phone?`, message: `This marks ${formatPhone(toLocalPhone(u.phone))} as verified without an SMS code, so ${u.name} can use the dashboard straight away. Only do it once you are sure the number is theirs.`, confirmLabel: 'Verify phone number' }))) return
    try {
      await api.post(`/admin/users/${id}/verify-phone`)
      toast.success('Phone number verified', `${u.name} can sign in now.`)
      await load()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const remove = async () => {
    const ok = await confirmDelete({
      title: `Remove ${u.name}?`,
      message: `${u.name} is signed out straight away and cannot sign in again.${u.onlyOrganiser && u.organisation ? ` ${u.organisation.name} has no other organiser, so nobody will be able to manage its elections or withdraw its money until you add one.` : ''}`,
      confirmLabel: 'Remove organiser',
    })
    if (!ok) return
    try {
      await api.delete(`/admin/users/${id}`)
      toast.success('Organiser removed')
      navigate('/admin/users')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <>
      <PageHeader back={{ to: '/admin/users', label: 'Back to organisers' }} title={u.name} subtitle={u.organisation ? `Organisation admin at ${u.organisation.name}` : 'Organisation admin'} />

      <section className="grid items-start gap-5 lg:grid-cols-3">
        <form onSubmit={submit} noValidate className="lg:col-span-2">
          <Card className="space-y-5">
            <h2 className="font-display text-xl font-bold">Organiser details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="First name" value={first} onChange={(e) => setFirst(e.target.value)} maxLength={60} />
              <Input label="Last name" value={last} onChange={(e) => setLast(e.target.value)} maxLength={60} />
            </div>
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Phone" hint="(sign-in number)" type="tel" inputMode="numeric" value={formatPhone(phone)} onChange={(e) => setPhone(cleanPhoneInput(e.target.value))} />
            <p className="-mt-2 text-[13px] text-muted">Changing the phone number asks the organiser to verify the new number by SMS before they can use the dashboard again.</p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" disabled={!dirty} onClick={load}>
                Discard
              </Button>
              <Button type="submit" disabled={!dirty || busy}>
                {busy ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </Card>
        </form>

        <div className="space-y-5">
          <Card>
            <h2 className="mb-2 font-display text-xl font-bold">Organisation</h2>
            {u.organisation ? (
              <>
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="font-semibold">{u.organisation.name}</span>
                  <OrgChip status={u.organisation.status} />
                </div>
                <Link to={`/admin/organisations/${u.organisation.id}`} className="text-sm font-semibold text-brand hover:underline">
                  View organisation
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted">No organisation.</p>
            )}
          </Card>
          <Card>
            <h2 className="mb-2 font-display text-xl font-bold">Account</h2>
            <Row k="Role" v="Organisation admin" />
            <Row k="Joined" v={u.createdAt ? formatDateTime(u.createdAt) : '—'} />
            <Row k="Phone verified" v={u.phoneVerified ? (u.phoneVerifiedAt ? `Yes, ${formatDateTime(u.phoneVerifiedAt)}` : 'Yes') : 'Not yet'} />
            {!u.phoneVerified && (
              <Button variant="secondary" onClick={verifyPhone} className="mt-3">
                Verify phone number
              </Button>
            )}
            <Row k="Password last changed" v={u.passwordChangedAt ? formatDateTime(u.passwordChangedAt) : 'Never'} />
          </Card>
          <Card>
            <h2 className="mb-1.5 font-display text-xl font-bold">Remove organiser</h2>
            <p className="mb-4 text-sm leading-relaxed text-muted">Ends their access now. The organisation, its elections and its money are not touched.</p>
            <Button variant="secondary" onClick={remove} className="text-danger">
              Remove organiser
            </Button>
          </Card>
        </div>
      </section>
    </>
  )
}
