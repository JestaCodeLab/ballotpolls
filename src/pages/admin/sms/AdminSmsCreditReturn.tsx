import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CircleAlert, CircleCheck, Loader2 } from 'lucide-react'
import { api, errorMessage } from '../../../lib/api'
import { Card, LinkButton, PageHeader } from '../../../components/ui'

type State = { kind: 'checking' } | { kind: 'done'; credits: number | null } | { kind: 'failed'; message: string }

// Where Paystack sends the person after paying for credit. It asks FlockText to confirm the payment, which adds the
// credit if the webhook has not already. Asking twice is safe.
export default function AdminSmsCreditReturn() {
  const [params] = useSearchParams()
  const reference = params.get('reference') ?? params.get('trxref') ?? ''
  const [state, setState] = useState<State>(reference ? { kind: 'checking' } : { kind: 'failed', message: 'This page needs a payment reference. Open it from the payment page.' })
  const [tries, setTries] = useState(0)

  useEffect(() => {
    if (!reference) return
    let live = true
    api
      .get<{ creditsBalance: number | null }>(`/admin/sms/topup/verify/${encodeURIComponent(reference)}`)
      .then((r) => live && setState({ kind: 'done', credits: r.data.creditsBalance }))
      .catch((e) => live && setState({ kind: 'failed', message: errorMessage(e) }))
    return () => {
      live = false
    }
  }, [reference, tries])

  return (
    <>
      <PageHeader title="Payment" subtitle={reference ? `Reference ${reference}` : undefined} />
      <Card className="max-w-xl">
        {state.kind === 'checking' && (
          <div role="status" className="flex items-center gap-3">
            <Loader2 size={22} className="animate-spin text-brand" aria-hidden="true" />
            <span>Confirming your payment with FlockText…</span>
          </div>
        )}
        {state.kind === 'done' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 font-display text-xl font-bold">
              <CircleCheck size={26} className="text-brand" aria-hidden="true" />
              Payment confirmed
            </div>
            {state.credits !== null && (
              <p>
                Your SMS credit is now <strong>{state.credits.toLocaleString()}</strong>.
              </p>
            )}
            <div className="flex gap-3">
              <LinkButton to="/admin/sms">Send an SMS</LinkButton>
              <LinkButton to="/admin/sms/credit" variant="secondary">
                Back to credit
              </LinkButton>
            </div>
          </div>
        )}
        {state.kind === 'failed' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 font-display text-xl font-bold">
              <CircleAlert size={26} className="text-danger" aria-hidden="true" />
              We could not confirm the payment
            </div>
            <p className="text-sm text-muted">{state.message}</p>
            <p className="text-sm text-muted">
              If you were charged, the credit is added automatically once Paystack tells FlockText. Check again in a minute, or look at your balance on the{' '}
              <Link to="/admin/sms" className="font-semibold text-brand hover:underline">
                Send SMS
              </Link>{' '}
              page.
            </p>
            {reference && (
              <button
                type="button"
                onClick={() => {
                  setState({ kind: 'checking' })
                  setTries((n) => n + 1)
                }}
                className="min-h-11 rounded-[10px] border border-field px-5 text-[15px] font-semibold hover:bg-ground"
              >
                Check again
              </button>
            )}
          </div>
        )}
      </Card>
    </>
  )
}
