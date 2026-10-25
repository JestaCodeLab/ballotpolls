import { useState, type FormEvent } from 'react'
import { api, errorMessage, type CreatedOrganisation } from '../../lib/api'
import { Button, Input } from '../ui'
import Modal from '../Modal'
import CopyField from './CopyField'
import { toast } from '../../store/toast'
import { cleanPhoneInput, formatPhone, isGhanaPhone } from '../../lib/phone'
import { firstProblem } from '../../lib/validate'

// A super admin creates an organisation for a client who has not signed up themselves: the organisation, its first
// organiser, and optionally the USSD code. The organiser's phone counts as verified, and a first password is made up and shown once.
export default function CreateOrganisationModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [shortcode, setShortcode] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<CreatedOrganisation | null>(null)

  const wantsUssd = Boolean(shortcode.trim() || label.trim())

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = firstProblem([
      [name.trim().length < 2, 'Enter the organisation name'],
      [!first.trim(), 'Enter the organiser\'s first name'],
      [!last.trim(), 'Enter the organiser\'s last name'],
      [!/^\S+@\S+\.\S+$/.test(email.trim()), 'Enter a valid email address'],
      [!isGhanaPhone(phone), 'Enter a 10-digit Ghana phone number starting with 0'],
      [wantsUssd && !/^\*\d+(\*\d+)*#$/.test(shortcode.trim()), 'Write the USSD code as Hubtel gave it, e.g. *713*2861#'],
      [wantsUssd && label.trim().length < 2, 'Give the name voters are greeted with'],
    ])
    if (problem) return toast.error(problem)
    setBusy(true)
    try {
      const { data } = await api.post<CreatedOrganisation>('/admin/organisations', {
        organisationName: name,
        firstName: first,
        lastName: last,
        email,
        phone,
        ...(wantsUssd ? { ussd: { shortcode: shortcode.trim(), label: label.trim() } } : {}),
      })
      setDone(data)
      onCreated()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={done ? 'Organisation created' : 'Create an organisation'}
      description={done ? `${name} is ready. Pass these sign-in details to ${first}.` : 'For a client who has not signed up themselves.'}
      size="lg"
      onClose={onClose}
      footer={
        done ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit as unknown as () => void} disabled={busy}>
              {busy ? 'Creating…' : 'Create organisation'}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="space-y-4">
          <CopyField label="Sign in with this phone number" value={formatPhone(phone)} />
          <CopyField label="First password (shown only now)" value={done.password} />
          <p className="text-[13px] leading-relaxed text-muted">They can change it under Settings after signing in. Their phone number counts as verified, so they go straight to the dashboard.</p>
          {done.ussd && (
            <div className="space-y-4 border-t border-line pt-4">
              <div className="text-sm font-semibold">Addresses for Hubtel ({done.ussd.shortcode})</div>
              <CopyField label="Service Interaction URL" value={done.ussd.interactionUrl} />
              <CopyField label="Service Fulfilment URL" value={done.ussd.fulfilmentUrl} />
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <Input label="Organisation name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Organiser's first name" value={first} maxLength={60} onChange={(e) => setFirst(e.target.value)} />
            <Input label="Organiser's last name" value={last} maxLength={60} onChange={(e) => setLast(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Phone" hint="(sign-in number)" type="tel" inputMode="numeric" value={formatPhone(phone)} onChange={(e) => setPhone(cleanPhoneInput(e.target.value))} />
          </div>
          <div className="border-t border-line pt-4">
            <div className="text-sm font-semibold">USSD voting code</div>
            <p className="mb-3 text-[13px] text-muted">Optional. You can assign it later from the organisation's page.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="USSD code" placeholder="*713*2861#" value={shortcode} onChange={(e) => setShortcode(e.target.value)} />
              <Input label="Name in the welcome line" placeholder="Ghana Youth Awards" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="sr-only">
            Create
          </button>
        </form>
      )}
    </Modal>
  )
}
