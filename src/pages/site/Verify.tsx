import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CircleCheck, CircleX, Clock, Lock, Mail, SearchX, ShieldCheck, Vote, Coins, type LucideIcon } from 'lucide-react'
import WhatsAppIcon from '../../components/site/WhatsAppIcon'
import { api, errorMessage, type PaymentStatus, type PublicPayment } from '../../lib/api'
import { useSeo } from '../../lib/useSeo'
import { SUPPORT_EMAIL, WHATSAPP_URL, ogImage } from '../../lib/site'
import { cleanPhoneInput, formatPhone, isGhanaPhone } from '../../lib/phone'
import { formatDateTime, ghs } from '../../lib/format'
import DataTable, { type Column } from '../../components/DataTable'
import { Button, Card, EmptyState, StatIcon } from '../../components/ui'
import { Section } from '../../components/site/parts'

const STATUS: Record<PaymentStatus, { label: string; cls: string; Icon: LucideIcon; meaning: string }> = {
  confirmed: { label: 'Confirmed', cls: 'bg-brand-tint text-[#0b5a43]', Icon: CircleCheck, meaning: 'Your payment went through and your vote was counted.' },
  pending: { label: 'Pending', cls: 'bg-[#fcefd0] text-[#6b4300]', Icon: Clock, meaning: 'We are waiting for your mobile money provider. This usually clears within a few minutes.' },
  failed: { label: 'Failed', cls: 'bg-[#fbe4e2] text-[#8f1f19]', Icon: CircleX, meaning: 'The payment was not approved, so no vote was counted. If money left your wallet, contact us.' },
}

// Icon and word together, so the status never depends on colour alone.
function StatusChip({ status }: { status: PaymentStatus }) {
  const { label, cls, Icon } = STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-semibold ${cls}`}>
      <Icon size={14} strokeWidth={2.4} aria-hidden="true" />
      {label}
    </span>
  )
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; phone: string; payments: PublicPayment[] }

// Where a voter confirms their vote payments: enter the phone number they paid from and see every payment made from it.
export default function Verify() {
  const [phone, setPhone] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [problem, setProblem] = useState<string | null>(null)

  useSeo({
    title: 'Verify your vote payments | Tally',
    description: 'Enter the phone number you voted with to see every payment made from it and confirm your votes were counted.',
    path: '/verify',
    image: ogImage('default'),
  })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!phone) return setProblem('Enter the phone number you paid from.')
    if (!isGhanaPhone(phone)) return setProblem('Enter a 10-digit Ghana phone number starting with 0.')
    setProblem(null)
    setState({ kind: 'loading' })
    try {
      const { data } = await api.post<{ payments: PublicPayment[] }>('/public/payments/lookup', { phone })
      setState({ kind: 'done', phone, payments: data.payments })
    } catch (err) {
      setState({ kind: 'error', message: errorMessage(err) })
    }
  }

  const onPhone = (e: ChangeEvent<HTMLInputElement>) => {
    setPhone(cleanPhoneInput(e.target.value))
    if (problem) setProblem(null)
  }

  const busy = state.kind === 'loading'
  const done = state.kind === 'done' ? state : null

  const field = (compact: boolean) => (
    <form noValidate onSubmit={submit} className={compact ? 'flex flex-wrap items-end gap-3' : 'flex flex-col gap-4'}>
      <label className="block text-[15px] font-semibold">
        <span className="mb-2 block">Phone number</span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="024 123 4567"
          value={formatPhone(phone)}
          onChange={onPhone}
          aria-invalid={Boolean(problem)}
          aria-describedby="phone-help"
          className={`rounded-[10px] border border-field bg-white px-4 tracking-wide outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 ${compact ? 'min-h-12 w-56 text-base' : 'min-h-[52px] w-full text-lg'}`}
        />
        {!compact && (
          <span id="phone-help" className="mt-2 block text-[13px] font-normal text-muted">
            10 digits, starting with 0. Use the number you paid from.
          </span>
        )}
      </label>
      <Button type="submit" disabled={busy} className={compact ? 'min-h-12' : 'min-h-[52px] rounded-xl text-base'}>
        {busy ? 'Checking…' : done ? 'Check again' : 'Check payments'}
      </Button>
      {(problem || state.kind === 'error') && (
        <p role="alert" className={`rounded-[10px] bg-red-50 px-4 py-3 text-sm font-medium text-danger ${compact ? 'w-full' : ''}`}>
          {problem ?? (state.kind === 'error' ? state.message : '')}
        </p>
      )}
    </form>
  )

  const help = (title: string, text: string) =>
    SUPPORT_EMAIL || WHATSAPP_URL ? (
      <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-line bg-white px-7 py-6">
        <div className="max-w-[560px]">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{text}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {SUPPORT_EMAIL && (
            <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-[46px] items-center gap-2 rounded-[10px] border border-field bg-white px-5 text-[15px] font-semibold hover:bg-ground">
              <Mail size={18} strokeWidth={1.8} aria-hidden="true" />
              Email us
            </a>
          )}
          {WHATSAPP_URL && (
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[46px] items-center gap-2 rounded-[10px] border border-field bg-white px-5 text-[15px] font-semibold hover:bg-ground">
              <WhatsAppIcon size={18} className="text-[#25D366]" />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    ) : null

  /* ----- Before a search, or after one that failed ----- */
  if (!done) {
    return (
      <>
        <div className="border-b border-line bg-white">
          <Section className="flex flex-wrap items-center gap-6 py-12 md:py-14">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-brand-tint text-brand">
              <ShieldCheck size={30} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-[1_1_480px]">
              <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Verify your vote payments</h1>
              <p className="mt-2.5 max-w-[640px] text-lg leading-relaxed text-muted">
                Enter the phone number you voted with. We show every payment made from it, so you can confirm your votes were counted.
              </p>
            </div>
          </Section>
        </div>
        <Section className="flex flex-wrap items-start gap-8 pb-10 pt-10">
          <div className="min-w-0 flex-[1_1_440px] rounded-[20px] border border-line bg-white p-8">
            <h2 className="mb-5 font-display text-[26px] font-bold tracking-tight">Check your payments</h2>
            {field(false)}
            <div className="mt-[22px] flex gap-2.5 rounded-xl bg-ground px-4 py-3.5 text-sm leading-relaxed text-muted">
              <Lock size={18} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>We only show payment details. We never show who you voted for.</span>
            </div>
          </div>
          <aside aria-label="What the statuses mean" className="min-w-0 flex-[1_1_440px] rounded-[20px] border border-line bg-white px-8 py-7">
            <h2 className="mb-2 font-display text-[22px] font-bold tracking-tight">What the statuses mean</h2>
            {(Object.keys(STATUS) as PaymentStatus[]).map((s) => (
              <div key={s} className="flex items-start gap-3.5 border-t border-[#eef2f0] py-3.5">
                <div className="w-[120px] shrink-0">
                  <StatusChip status={s} />
                </div>
                <p className="text-[15px] leading-relaxed text-muted">{STATUS[s].meaning}</p>
              </div>
            ))}
          </aside>
        </Section>
        <Section className="pb-[72px]">{help('Can’t find a payment?', 'Tell us the phone number you paid from, the election and roughly when you voted, and we will look into it.')}</Section>
      </>
    )
  }

  /* ----- After a search ----- */
  const { payments } = done
  const count = (s: PaymentStatus) => payments.filter((p) => p.status === s).length
  const confirmedAmount = payments.filter((p) => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0)
  const summary = [
    { label: 'Confirmed votes', value: String(count('confirmed')), note: 'Counted in the results', icon: CircleCheck },
    { label: 'Confirmed amount', value: ghs(confirmedAmount), note: 'Paid and counted', icon: Coins },
    { label: 'Pending', value: String(count('pending')), note: 'Waiting for your provider', icon: Clock },
    { label: 'Failed', value: String(count('failed')), note: 'No vote counted', icon: CircleX },
  ]

  const columns: Column<PublicPayment>[] = [
    { key: 'when', header: 'Date and time', sortValue: (p) => new Date(p.createdAt).getTime(), className: 'whitespace-nowrap text-muted', cell: (p) => formatDateTime(p.createdAt) },
    {
      key: 'election',
      header: 'Election',
      sortValue: (p) => p.electionName,
      cell: (p) =>
        p.electionSlug ? (
          <Link to={`/events/${p.electionSlug}`} className="font-semibold hover:underline">
            {p.electionName}
          </Link>
        ) : (
          <span className="font-semibold">{p.electionName}</span>
        ),
    },
    { key: 'category', header: 'Category', sortValue: (p) => p.categoryName, cell: (p) => p.categoryName },
    { key: 'amount', header: 'Amount', sortValue: (p) => p.amount, className: 'whitespace-nowrap font-semibold', cell: (p) => ghs(p.amount) },
    {
      key: 'status',
      header: 'Status',
      sortValue: (p) => STATUS[p.status].label,
      cell: (p) => (
        <div>
          <StatusChip status={p.status} />
          {p.failureReason && <div className="mt-1 text-xs text-muted">{p.failureReason}</div>}
        </div>
      ),
    },
    { key: 'ref', header: 'Reference', className: 'whitespace-nowrap tabular-nums text-[#3f4f49]', cell: (p) => p.reference },
  ]

  return (
    <>
      <div className="border-b border-line bg-white">
        <Section className="flex flex-wrap items-end justify-between gap-6 py-10">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-[44px] md:leading-[1.1]">Payments for {formatPhone(done.phone)}</h1>
            <p className="mt-2 text-[17px] text-muted">{payments.length ? `${payments.length} payment${payments.length === 1 ? '' : 's'} found. Most recent first.` : 'We could not find any payments from this number.'}</p>
          </div>
          {field(true)}
        </Section>
      </div>

      {payments.length === 0 ? (
        <Section className="max-w-[760px] pb-6 pt-12">
          <div role="status">
            <EmptyState icon={SearchX} title={`No payments found for ${formatPhone(done.phone)}`}>
              <span className="block">We could not find any vote payments made from this number.</span>
            </EmptyState>
            <ul className="mx-auto mt-6 max-w-[480px] list-disc space-y-2.5 pl-5 text-[15px] leading-relaxed text-[#3f4f49]">
              <li>Check you typed the number you paid from. It is easy to swap two digits.</li>
              <li>A payment can take a few minutes to appear. Try again shortly.</li>
              <li>If you voted from a different SIM or wallet number, try that number instead.</li>
            </ul>
          </div>
        </Section>
      ) : (
        <>
          <Section className="pb-6 pt-8">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {summary.map((s) => (
                <Card key={s.label} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm text-muted">{s.label}</div>
                    <StatIcon icon={s.icon} />
                  </div>
                  <div className="mt-1 font-display text-[30px] font-bold tracking-tight">{s.value}</div>
                  <div className="mt-0.5 text-[13px] text-muted">{s.note}</div>
                </Card>
              ))}
            </div>
          </Section>
          <Section className="pb-6">
            <DataTable caption="Vote payments" columns={columns} rows={payments} rowKey={(p) => p.reference} initialSort={{ key: 'when', dir: 'desc' }} minWidth={900} />
            <p className="mx-1 mt-3.5 flex items-start gap-2 text-[13px] leading-relaxed text-muted">
              <Vote size={15} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0" />
              We show payment details only, never who you voted for. Keep the reference if you need to contact us about a payment.
            </p>
          </Section>
        </>
      )}
      <Section className="pb-[72px] pt-6">
        {help(payments.length ? 'Something missing or wrong?' : 'Still can’t find it?', payments.length ? 'If a payment you made is not listed, or shows Failed after money left your wallet, send us the reference or the phone number.' : 'Send us the phone number, the election and roughly when you voted, and we will look into it for you.')}
      </Section>
    </>
  )
}
