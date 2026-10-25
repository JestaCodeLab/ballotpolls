import { useState, type FormEvent } from 'react'
import { api, errorMessage, type AdminUssdService } from '../../lib/api'
import { Button, Input, Switch } from '../ui'
import Modal from '../Modal'
import CopyField from './CopyField'
import { toast } from '../../store/toast'

interface Props {
  orgId: string
  orgName: string
  // The service being changed, or undefined to assign a new one.
  service?: AdminUssdService | null
  onClose: () => void
  onSaved: () => void
}

// Assign a USSD code to an organisation, or change it. It also shows the two addresses to give Hubtel for that code.
export default function UssdServiceModal({ orgId, orgName, service, onClose, onSaved }: Props) {
  const editing = Boolean(service)
  const [shortcode, setShortcode] = useState(service?.shortcode ?? '')
  const [label, setLabel] = useState(service?.label ?? '')
  const [active, setActive] = useState(service?.active ?? true)
  const [busy, setBusy] = useState(false)
  // After creating, the window stays open on the addresses, because they are what happens next.
  const [saved, setSaved] = useState<AdminUssdService | null>(null)
  const shown = saved ?? service ?? null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^\*\d+(\*\d+)*#$/.test(shortcode.trim())) return toast.error('Write the code as Hubtel gave it', 'For example *713*2861#')
    if (label.trim().length < 2) return toast.error('Give the name voters are greeted with', 'For example Ghana Youth Awards')
    setBusy(true)
    try {
      const { data } = editing
        ? await api.patch<AdminUssdService>(`/admin/ussd-services/${service!.id}`, { shortcode: shortcode.trim(), label: label.trim(), active })
        : await api.post<AdminUssdService>('/admin/ussd-services', { orgId, shortcode: shortcode.trim(), label: label.trim() })
      toast.success(editing ? 'USSD code updated' : 'USSD code assigned', data.shortcode)
      onSaved()
      if (editing) onClose()
      else setSaved(data)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={saved ? 'USSD code assigned' : editing ? 'Edit USSD code' : 'Assign a USSD code'}
      description={saved ? 'Now give Hubtel these two addresses for this code.' : orgName}
      size="lg"
      onClose={onClose}
      footer={
        saved ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit as unknown as () => void} disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Assign code'}
            </Button>
          </>
        )
      }
    >
      {!saved && (
        <form onSubmit={submit} noValidate className="space-y-4">
          <Input label="USSD code" hint="(as Hubtel gave it)" placeholder="*713*2861#" value={shortcode} onChange={(e) => setShortcode(e.target.value)} />
          <Input label="Name in the welcome line" hint='("Welcome to …")' placeholder="Ghana Youth Awards" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} />
          {editing && (
            <div className="flex items-center justify-between gap-3 rounded-[10px] bg-ground px-4 py-3">
              <div>
                <div className="text-sm font-semibold">Voting by this code is on</div>
                <div className="text-[13px] text-muted">Switch it off to stop this code taking votes.</div>
              </div>
              <Switch checked={active} onChange={setActive} label="Voting by this code is on" />
            </div>
          )}
          <button type="submit" className="sr-only">
            Save
          </button>
        </form>
      )}
      {shown && (
        <div className={`space-y-4 ${saved ? '' : 'mt-5 border-t border-line pt-5'}`}>
          {!saved && <div className="text-sm font-semibold">Addresses for Hubtel</div>}
          <CopyField label="Service Interaction URL" value={shown.interactionUrl} />
          <CopyField label="Service Fulfilment URL" value={shown.fulfilmentUrl} />
          <p className="text-[13px] leading-relaxed text-muted">
            In Hubtel's Programmable Services, create a service for {shown.shortcode} and paste these two addresses. They contain the secret key, so keep them to yourself.
          </p>
        </div>
      )}
    </Modal>
  )
}
