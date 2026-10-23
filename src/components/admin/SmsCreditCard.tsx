import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { api, errorMessage, type SmsBalance } from '../../lib/api'
import { Card, LinkButton } from '../ui'
import { Skeleton } from '../Loading'

// The SMS credit left on the FlockText account, with a refresh button. Shared by the send and buy-credit pages.
export function useSmsBalance() {
  const [balance, setBalance] = useState<SmsBalance | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)

  const refresh = useCallback(async () => {
    setBusy(true)
    try {
      setBalance((await api.get<SmsBalance>('/admin/sms/balance')).data)
      setError(null)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { balance, error, busy, refresh }
}

export default function SmsCreditCard({ state, showBuy = true }: { state: ReturnType<typeof useSmsBalance>; showBuy?: boolean }) {
  const { balance, error, busy, refresh } = state
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">SMS credit</h2>
        <button
          type="button"
          aria-label="Refresh balance"
          title="Refresh balance"
          disabled={busy}
          onClick={refresh}
          className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-field bg-white hover:bg-ground disabled:opacity-50"
        >
          <RefreshCw size={17} strokeWidth={1.8} aria-hidden="true" className={busy ? 'animate-spin' : ''} />
        </button>
      </div>
      {balance ? (
        <>
          <div className="mt-2.5 font-display text-[40px] font-bold leading-none tracking-tight">{balance.credits.toLocaleString()}</div>
          <div className="mt-1.5 text-sm text-muted">credits · about {balance.credits.toLocaleString()} messages of up to 160 characters</div>
          <div className="mt-2.5 text-xs text-muted">
            Updated {new Date(balance.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · from FlockText
          </div>
        </>
      ) : error ? (
        <p role="alert" className="mt-3 text-sm text-muted">
          Balance unavailable. {error}
        </p>
      ) : (
        <Skeleton className="mt-3 h-10 w-32" />
      )}
      {showBuy && (
        <LinkButton to="/admin/sms/credit" variant="secondary" className="mt-4 w-full">
          Buy credit
        </LinkButton>
      )}
    </Card>
  )
}
