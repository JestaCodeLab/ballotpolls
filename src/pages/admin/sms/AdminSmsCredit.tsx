import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { api, errorMessage, type SmsPackage } from '../../../lib/api'
import { Button, Card, EmptyState, PageHeader } from '../../../components/ui'
import Modal from '../../../components/Modal'
import { toast } from '../../../store/toast'
import { Loading, Skeleton } from '../../../components/Loading'
import SmsCreditCard, { useSmsBalance } from '../../../components/admin/SmsCreditCard'
import { ghs } from '../../../lib/format'

export default function AdminSmsCredit() {
  const credit = useSmsBalance()
  const [packages, setPackages] = useState<SmsPackage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [buying, setBuying] = useState<SmsPackage | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .get<SmsPackage[]>('/admin/sms/packages')
      .then((r) => setPackages(r.data))
      .catch((e) => setError(errorMessage(e)))
  }, [])

  // Sends the person to Paystack to pay. They come back to /admin/sms/credit/return, where the credit is confirmed.
  const checkout = async () => {
    if (!buying) return
    setBusy(true)
    try {
      const { data } = await api.post<{ authorizationUrl: string }>('/admin/sms/topup', { ghs: buying.price })
      window.location.assign(data.authorizationUrl)
    } catch (e) {
      toast.error(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Buy credit" subtitle="Top up the credit used to send SMS from BallotPolls." />

      <section className="flex flex-wrap items-stretch gap-5">
        <div className="max-w-[420px] min-w-0 flex-[1_1_320px]">
          <SmsCreditCard state={credit} showBuy={false} />
        </div>
        <Card className="flex min-w-0 flex-[2_1_420px] flex-col justify-center gap-2">
          <h2 className="font-display text-xl font-bold">How credit works</h2>
          <p className="text-sm leading-relaxed text-muted">One credit sends one text of up to 160 characters to one phone. Longer messages use one credit for each 153 characters. Credit is added to the BallotPolls FlockText account once the payment goes through.</p>
          <p className="text-[13px] text-muted">Packages and prices are read from FlockText when this page opens.</p>
        </Card>
      </section>

      {!packages && !error && (
        <Loading label="Loading packages">
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-60" />
            ))}
          </div>
        </Loading>
      )}
      {error && (
        <EmptyState icon={Package} title="Packages unavailable">
          {error}
        </EmptyState>
      )}
      {packages && packages.length === 0 && (
        <EmptyState icon={Package} title="No packages on sale">
          FlockText did not list any credit packages.
        </EmptyState>
      )}
      {packages && packages.length > 0 && (
        <>
          <section aria-label="Credit packages" className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((p) => (
              <article key={p.id} className={`relative flex flex-col gap-1.5 rounded-[14px] border bg-white p-6 ${p.badge ? 'border-brand shadow-[0_0_0_1px_#0b7a5b]' : 'border-line'}`}>
                {p.badge && <span className="absolute -top-3 left-5 rounded-full bg-accent px-2.5 py-1 text-xs font-bold uppercase text-ink">{p.badge}</span>}
                <h2 className="font-display text-xl font-bold">{p.name}</h2>
                <div className="mt-1.5 font-display text-4xl font-bold tracking-tight">{p.credits.toLocaleString()}</div>
                <div className="text-sm text-muted">credits</div>
                <div className="mt-3.5 text-[22px] font-semibold">{ghs(p.price)}</div>
                <div className="text-[13px] text-muted">GHS {(p.price / p.credits).toFixed(3)} per credit</div>
                <Button variant={p.badge ? 'primary' : 'secondary'} onClick={() => setBuying(p)} className="mt-4">
                  Buy {p.name}
                </Button>
              </article>
            ))}
          </section>
          <p className="text-[13px] text-muted">You pay on Paystack's page. Their fee is added to the price shown.</p>
        </>
      )}

      {buying && (
        <Modal
          title={`Buy ${buying.name}?`}
          description={`${buying.credits.toLocaleString()} credits for ${ghs(buying.price)}, plus Paystack's fee. You will pay on Paystack's page and come straight back here.`}
          onClose={() => !busy && setBuying(null)}
          footer={
            <>
              <Button variant="secondary" disabled={busy} onClick={() => setBuying(null)}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={checkout}>
                {busy ? 'Opening Paystack…' : 'Continue to payment'}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted">The credit is added as soon as the payment goes through.</p>
        </Modal>
      )}
    </>
  )
}
