import { useEffect, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { api, errorMessage, type SmsSenderId } from '../../../lib/api'
import { Button, Card, PageHeader, Select, Textarea } from '../../../components/ui'
import Modal from '../../../components/Modal'
import SmsCreditCard, { useSmsBalance } from '../../../components/admin/SmsCreditCard'
import { smsCredits } from '../../../lib/sms'
import { cleanPhoneInput, formatPhone, isGhanaPhone } from '../../../lib/phone'
import { toast } from '../../../store/toast'

const Chip = ({ label, sub, onRemove, tone = 'brand' }: { label: string; sub?: string; onRemove: () => void; tone?: 'brand' | 'plain' }) => (
  <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border py-0 pl-3 pr-1 text-sm font-semibold ${tone === 'brand' ? 'border-[#b9dacd] bg-brand-tint' : 'border-line bg-ground'}`}>
    {label}
    {sub && <span className="text-xs font-normal text-muted">{sub}</span>}
    <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className="flex h-6 w-6 items-center justify-center rounded-full text-[#3f4f49] hover:bg-black/5">
      <X size={13} strokeWidth={2.4} aria-hidden="true" />
    </button>
  </span>
)

const Row = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
  <div className="flex justify-between gap-4 border-t border-line py-2.5 text-sm first:border-t-0">
    <span className="text-muted">{k}</span>
    <span className={strong ? 'font-semibold' : ''}>{v}</span>
  </div>
)

export default function AdminSms() {
  const credit = useSmsBalance()
  const [numbers, setNumbers] = useState<string[]>([])
  // Approved sender IDs from FlockText; the primary one is chosen first.
  const [senders, setSenders] = useState<SmsSenderId[] | null>(null)
  const [senderId, setSenderId] = useState('')
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .get<SmsSenderId[]>('/admin/sms/sender-ids')
      .then((r) => {
        setSenders(r.data)
        setSenderId(r.data[0]?.senderId ?? '')
      })
      .catch(() => setSenders([]))
  }, [])

  const recipients = numbers.length
  const perMessage = smsCredits(message)
  const needed = recipients * perMessage
  const left = credit.balance ? credit.balance.credits - needed : null

  // Typed numbers: Enter, comma, space or leaving the box all add them. Pasted lists are split.
  const addNumbers = (raw: string) => {
    const parts = raw.split(/[\s,;]+/).filter(Boolean)
    const good: string[] = []
    const bad: string[] = []
    for (const p of parts) {
      const n = cleanPhoneInput(p)
      if (isGhanaPhone(n)) good.push(n)
      else bad.push(p)
    }
    if (good.length) setNumbers((cur) => [...new Set([...cur, ...good])])
    if (bad.length) toast.error('Not a Ghana number', `Check: ${bad.slice(0, 3).join(', ')}. Use 10 digits starting with 0.`)
    setDraft('')
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ' '].includes(e.key) && draft.trim()) {
      e.preventDefault()
      addNumbers(draft)
    } else if (e.key === 'Backspace' && !draft && numbers.length) setNumbers((cur) => cur.slice(0, -1))
  }

  const clear = () => {
    setNumbers([])
    setDraft('')
    setMessage('')
  }

  const review = () => {
    if (draft.trim()) addNumbers(draft)
    if (recipients === 0 && !draft.trim()) return toast.error('Choose at least one recipient')
    if (!message.trim()) return toast.error('Write a message')
    if (!senderId) return toast.error('Choose a sender ID')
    setConfirming(true)
  }

  const send = async () => {
    setBusy(true)
    try {
      const { data } = await api.post<{ total: number; sent: number; failed: number }>('/admin/sms/send', {
        numbers,
        message,
        senderId: senderId || undefined,
      })
      if (data.failed === 0) toast.success('Message sent', `${data.sent} recipient${data.sent === 1 ? '' : 's'}.`)
      else toast.error(`${data.failed} of ${data.total} could not be sent`, 'See the delivery report for the reasons.')
      clear()
      setConfirming(false)
      credit.refresh()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  
  return (
    <>
      <PageHeader title="Send SMS" subtitle="Send a text message to any phone number from BallotPolls." />

      <section className="flex flex-wrap items-start gap-5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            review()
          }}
          noValidate
          className="min-w-0 flex-[2_1_480px]"
        >
          <Card className="space-y-5">
            <h2 className="font-display text-xl font-bold">New message</h2>

            <div>
              <label htmlFor="sms-to" className="mb-1.5 block text-sm font-medium">
                Recipients
              </label>
              <div className="flex min-h-[46px] flex-wrap items-center gap-2 rounded-[10px] border border-field bg-white px-2.5 py-1.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                {numbers.map((n) => (
                  <Chip key={n} label={formatPhone(n)} tone="plain" onRemove={() => setNumbers((cur) => cur.filter((x) => x !== n))} />
                ))}
                <input
                  id="sms-to"
                  type="tel"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKey}
                  onBlur={() => draft.trim() && addNumbers(draft)}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text')
                    if (/[\s,;]/.test(text.trim())) {
                      e.preventDefault()
                      addNumbers(text)
                    }
                  }}
                  placeholder="Type a number and press Enter"
                  className="min-h-8 min-w-40 flex-1 bg-transparent text-[15px] outline-none"
                />
              </div>
            </div>

            <div>
              <Select
                label="Sender ID"
                value={senderId}
                onChange={setSenderId}
                disabled={!senders?.length}
                placeholder={senders === null ? 'Loading…' : 'No approved sender ID'}
                options={(senders ?? []).map((s) => ({ value: s.senderId, label: s.isPrimary ? `${s.senderId} (primary)` : s.senderId }))}
                className="w-full"
              />
              {senders?.length === 0 && <p className="mt-1 text-xs text-muted">Add and approve a sender ID in FlockText to send.</p>}
            </div>

            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <label htmlFor="sms-text" className="font-medium">
                  Message
                </label>
                <span className="text-muted">
                  {message.length} characters · {perMessage || 0} SMS each
                </span>
              </div>
              <Textarea label="" id="sms-text" rows={5} maxLength={612} value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Message" />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#eef2f0] pt-4">
              <div className="flex gap-2.5">
                <Button type="button" variant="secondary" onClick={clear}>
                  Clear
                </Button>
                <Button type="submit">{recipients ? `Send to ${recipients.toLocaleString()} recipient${recipients === 1 ? '' : 's'}` : 'Send Message'}</Button>
              </div>
            </div>
          </Card>
        </form>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
          <SmsCreditCard state={credit} />
          <Card>
            <h2 className="mb-1.5 font-display text-xl font-bold">This message</h2>
            <Row k="Recipients" v={recipients.toLocaleString()} />
            <Row k="Credits per recipient" v={String(perMessage)} />
            <Row k="Credits needed" v={needed.toLocaleString()} strong />
            <Row k="Balance after sending" v={left === null ? '—' : left.toLocaleString()} strong />
            {left !== null && left < 0 && (
              <p role="alert" className="mt-2 text-[13px] text-danger">
                Not enough credit. <Link to="/admin/sms/credit" className="font-semibold underline">Buy credit</Link>
              </p>
            )}
          </Card>
        </div>
      </section>

      {confirming && (
        <Modal
          title={`Send this message to ${recipients.toLocaleString()} recipient${recipients === 1 ? '' : 's'}?`}
          description={`${numbers.length} number${numbers.length === 1 ? '' : 's'} will each get the message once, from ${senderId || 'BallotPolls'}, using ${needed.toLocaleString()} credits. Text messages cannot be recalled after they are sent.`}
          onClose={() => setConfirming(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={send}>
                {busy ? 'Sending…' : 'Send message'}
              </Button>
            </>
          }
        >
          <p className="whitespace-pre-line rounded-[10px] bg-ground p-3.5 text-sm">{message}</p>
        </Modal>
      )}
    </>
  )
}
