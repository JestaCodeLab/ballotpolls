import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { CircleCheck, Clock, Coins, Wallet } from 'lucide-react'
import { api, type Withdrawal, type WithdrawalBalance, type WithdrawalStatus } from '../lib/api'
import { useAuth } from '../store/auth'
import { toast } from '../store/toast'
import { formatDateTime, ghs } from '../lib/format'
import { formatPhone, toLocalPhone } from '../lib/phone'
import { Button, Card, EmptyState, Input, PageHeader, StatIcon } from '../components/ui'
import { firstProblem } from '../lib/validate'
import { Loading, StatCardsSkeleton, TableSkeleton } from '../components/Loading'

const RESEND_SECONDS = 60

const STATUS: Record<WithdrawalStatus, { label: string; cls: string }> = {
  awaiting_code: { label: 'Awaiting code', cls: 'bg-[#e6ede9] text-[#3f4f49]' },
  pending: { label: 'Pending approval', cls: 'bg-[#fcefd0] text-[#6b4300]' },
  approved: { label: 'Approved, releasing', cls: 'bg-[#dce3f2] text-[#1f3a6b]' },
  released: { label: 'Released', cls: 'bg-brand-tint text-[#0b5a43]' },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-danger' },
}

const STEPS = [
  ['Request and confirm', 'Enter an amount. We text a code like WTD-0000 to your registered number. Enter it to submit.'],
  ['Admin approval', 'Your request is stored and reviewed. Its status shows below.'],
  ['Funds released', 'Once approved, the money reaches your mobile money wallet within 1 hour.'],
]

const sub = (w: Withdrawal) => {
  if (w.status === 'released' && w.releasedAt) return `Paid ${formatDateTime(w.releasedAt)}`
  if (w.status === 'rejected') return w.rejectedReason ?? ''
  if (w.status === 'pending') return 'Awaiting admin review'
  if (w.status === 'approved') return 'Released within 1 hour'
  return ''
}

export default function Withdrawals() {
  const user = useAuth((s) => s.user)!
  const [balance, setBalance] = useState<WithdrawalBalance | null>(null)
  const [items, setItems] = useState<Withdrawal[]>([])
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  // The request whose SMS code is being entered.
  const [confirming, setConfirming] = useState<Withdrawal | null>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ balance: WithdrawalBalance; items: Withdrawal[] }>('/withdrawals')
      setBalance(data.balance)
      setItems(data.items)
    } catch (err) {
      toast.fromError(err)
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const phone = formatPhone(toLocalPhone(user.phone))
  // Nothing to take out: no revenue yet, or all of it is already requested or paid out.
  const noFunds = loaded && (balance?.available ?? 0) <= 0

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const value = Number(amount.replace(/,/g, ''))
    const problem = firstProblem([
      [!amount.trim(), 'Enter an amount'],
      [!Number.isFinite(value) || value <= 0, 'Enter an amount greater than zero'],
      [!/^\d+(\.\d{1,2})?$/.test(amount.replace(/,/g, '')), 'Use at most 2 decimal places'],
      [balance !== null && value > balance.available, `You can withdraw up to ${ghs(balance?.available ?? 0)}`],
    ])
    if (problem) return toast.error(problem)
    setBusy(true)
    try {
      const { data } = await api.post<Withdrawal>('/withdrawals', { amount: value })
      toast.success('Code sent', `We texted a confirmation code to ${phone}.`)
      setConfirming(data)
      load()
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const stats = [
    { label: 'Available to withdraw', value: balance?.available, note: 'Revenue not yet requested', hero: true, icon: Wallet },
    { label: 'Pending approval', value: balance?.pending, note: 'In review or being released', icon: Clock },
    { label: 'Released', value: balance?.released, note: 'Paid out so far', icon: CircleCheck },
    { label: 'Total revenue', value: balance?.total, note: 'Paid, confirmed votes', icon: Coins },
  ]

  return (
    <>
      <PageHeader title="Withdrawals" subtitle="Take your election revenue out of Tally. Approved withdrawals are released within 1 hour." />

      {!loaded && (
        <Loading label="Loading balance">
          <StatCardsSkeleton />
        </Loading>
      )}
      <section className={`grid grid-cols-2 gap-4 lg:grid-cols-4 ${loaded ? '' : 'hidden'}`}>
        {stats.map((s) => (
          <div key={s.label} className={`rounded-[14px] border p-5 ${s.hero ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className={`text-sm ${s.hero ? 'text-[#b7c7bf]' : 'text-muted'}`}>{s.label}</div>
              <StatIcon icon={s.icon} onDark={s.hero} />
            </div>
            <div className="mt-1 font-display text-3xl font-bold tracking-tight">{s.value === undefined ? '–' : ghs(s.value)}</div>
            <div className={`mt-1 text-[13px] ${s.hero ? 'text-accent' : 'text-muted'}`}>{s.note}</div>
          </div>
        ))}
      </section>

      <section className="grid items-start gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <form noValidate onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-xl font-bold">Request a withdrawal</h2>
              <p className="mt-1 text-sm text-muted">
                {!balance
                  ? ' '
                  : noFunds
                    ? balance.total <= 0
                      ? 'You have no revenue yet. It builds up as voters pay for votes.'
                      : 'All your revenue has already been requested or paid out.'
                    : `Up to ${ghs(balance.available)} is available.`}
              </p>
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <label htmlFor="wd-amount" className="font-medium">
                  Amount (GHS)
                </label>
                <button
                  type="button"
                  disabled={noFunds}
                  onClick={() => balance && setAmount(balance.available.toFixed(2))}
                  className="text-[13px] font-semibold text-brand hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
                >
                  Withdraw all
                </button>
              </div>
              <input
                id="wd-amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                disabled={noFunds}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                aria-required="true"
                className="min-h-[46px] w-full rounded-[10px] border border-field bg-white px-3.5 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-ground disabled:text-muted"
              />
            </div>
            <div>
              <Input label="Pay out to" value={phone} disabled readOnly />
              <p className="mt-1.5 text-[13px] text-muted">Your registered number. Money goes to the mobile money wallet on it.</p>
            </div>
            <div className="rounded-[10px] bg-ground px-3.5 py-3 text-sm leading-relaxed text-muted">
              We will text a confirmation code (WTD-0000) to {phone.slice(0, 3)} *** {phone.slice(-4)} before the request is submitted.
            </div>
            <div>
              <Button type="submit" disabled={busy || !balance || noFunds} className="min-h-[46px] px-6">
                {busy ? 'Sending code…' : 'Withdraw'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-display text-xl font-bold">How it works</h2>
          <ol className="space-y-4">
            {STEPS.map(([title, desc], i) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-brand-tint text-[13px] font-bold text-[#0b5a43]">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed">
                  <strong>{title}</strong>
                  <br />
                  <span className="text-muted">{desc}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <Card className="px-3 pb-3">
        <h2 className="px-3 pb-3 font-display text-xl font-bold">Withdrawal history</h2>
        {!loaded ? (
          <Loading label="Loading withdrawals">
            <TableSkeleton />
          </Loading>
        ) : items.length === 0 ? (
          <EmptyState size="sm" icon={Wallet} title="No withdrawals yet">
            Requests you make will show up here with their status.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-ground text-left text-sm text-[#3f4f49]">
                  <th scope="col" className="px-3 py-3.5 font-semibold">Reference</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold">Requested</th>
                  <th scope="col" className="px-3 py-3.5 text-right font-semibold">Amount</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold">Pay out to</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((w) => (
                  <tr key={w.id} className="border-t border-[#eef2f0]">
                    <td className="px-3 py-3.5 font-semibold tabular-nums">{w.reference}</td>
                    <td className="px-3 py-3.5 text-muted">{formatDateTime(w.createdAt)}</td>
                    <td className="px-3 py-3.5 text-right font-semibold tabular-nums">{ghs(w.amount)}</td>
                    <td className="px-3 py-3.5">{w.payoutPhone}</td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[w.status].cls}`}>
                        {STATUS[w.status].label}
                      </span>
                      {w.status === 'awaiting_code' ? (
                        <div className="mt-1">
                          <button type="button" onClick={() => setConfirming(w)} className="text-xs font-semibold text-brand hover:underline">
                            Enter code
                          </button>
                        </div>
                      ) : (
                        sub(w) && <div className="mt-1 text-xs text-muted">{sub(w)}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {confirming && (
        <ConfirmDialog
          withdrawal={confirming}
          phone={`${phone.slice(0, 3)} *** ${phone.slice(-4)}`}
          onClose={() => setConfirming(null)}
          onDone={() => {
            setConfirming(null)
            setAmount('')
            load()
          }}
          onCancelled={() => {
            setConfirming(null)
            load()
          }}
        />
      )}
    </>
  )
}

function ConfirmDialog({
  withdrawal,
  phone,
  onClose,
  onDone,
  onCancelled,
}: {
  withdrawal: Withdrawal
  phone: string
  onClose: () => void
  onDone: () => void
  onCancelled: () => void
}) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_SECONDS)
  const dialog = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null)

  useEffect(() => {
    const el = returnFocus.current
    return () => el?.focus?.()
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const confirm = async (e: FormEvent) => {
    e.preventDefault()
    if (!/\d{4}/.test(code.replace(/\D/g, '')) ) return toast.error('Enter the code from the SMS, e.g. WTD-4821')
    setBusy(true)
    try {
      await api.post(`/withdrawals/${withdrawal.id}/confirm`, { code })
      toast.success('Withdrawal submitted', `${withdrawal.reference} is awaiting approval.`)
      onDone()
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setBusy(true)
    try {
      await api.post(`/withdrawals/${withdrawal.id}/resend`)
      toast.success('Code sent', `Check the SMS on ${phone}.`)
      setCooldown(RESEND_SECONDS)
      setCode('')
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    setBusy(true)
    try {
      await api.delete(`/withdrawals/${withdrawal.id}`)
      onCancelled()
    } catch (err) {
      toast.fromError(err)
      setBusy(false)
    }
  }

  // Escape only closes the dialog (the request stays and can be finished from the table); Tab stays inside it.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return onClose()
    if (e.key !== 'Tab') return
    const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)') ?? [])
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center overflow-y-auto bg-ink/60 p-4 pt-[15vh]">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onKeyDown={onKeyDown}
        className="w-full max-w-[440px] rounded-2xl bg-white p-7 shadow-2xl"
      >
        <h2 id="confirm-title" className="font-display text-2xl font-bold tracking-tight">
          Confirm your withdrawal
        </h2>
        <p className="mb-5 mt-2 text-[15px] leading-relaxed text-muted">
          We sent a code by SMS to <strong className="text-ink">{phone}</strong>. Enter it to submit your request for{' '}
          <strong className="text-ink">{ghs(withdrawal.amount)}</strong>.
        </p>
        <form noValidate onSubmit={confirm}>
          <label htmlFor="wd-code" className="mb-1.5 block text-sm font-medium">
            Withdrawal code
          </label>
          <input
            id="wd-code"
            autoFocus
            autoComplete="one-time-code"
            maxLength={8}
            placeholder="WTD-0000"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="min-h-14 w-full rounded-[10px] border-2 border-brand bg-white px-4 font-mono text-[22px] font-semibold tracking-[0.12em] outline-none"
          />
          <div className="mt-2.5 text-sm text-muted">
            {cooldown > 0 ? (
              <>
                Didn&apos;t get it? <span className="font-semibold text-ink">Resend in 0:{String(cooldown).padStart(2, '0')}</span>
              </>
            ) : (
              <button type="button" onClick={resend} disabled={busy} className="font-semibold text-brand hover:underline disabled:opacity-50">
                Resend code
              </button>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? 'Please wait…' : 'Confirm withdrawal'}
            </Button>
            <Button type="button" variant="secondary" onClick={cancel} disabled={busy}>
              Cancel request
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
