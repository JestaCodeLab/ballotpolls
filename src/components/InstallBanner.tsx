import { useEffect, useState, useSyncExternalStore } from 'react'
import { Share, X } from 'lucide-react'
import { canPromptInstall, dismissInstall, installDismissed, isInstalled, isIos, promptInstall, subscribeInstall } from '../lib/pwa'
import { Button } from './ui'

// Offered once someone is in the dashboard: install BallotPolls on their phone or computer. It only shows where
// installing is possible, never when the app is already installed, and "Not now" hides it for two weeks.
export default function InstallBanner() {
  const promptable = useSyncExternalStore(subscribeInstall, canPromptInstall, () => false)
  const [hidden, setHidden] = useState(() => isInstalled() || installDismissed())
  const [ios] = useState(isIos)
  const [asking, setAsking] = useState(false)

  // Installing from the browser's own menu should also clear the banner.
  useEffect(() => {
    const done = () => setHidden(true)
    window.addEventListener('appinstalled', done)
    return () => window.removeEventListener('appinstalled', done)
  }, [])

  if (hidden || (!promptable && !ios)) return null

  const close = () => {
    dismissInstall()
    setHidden(true)
  }
  const install = async () => {
    setAsking(true)
    if (await promptInstall()) setHidden(true)
    setAsking(false)
  }

  return (
    <section aria-label="Install the app" className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] border border-line bg-white p-4 shadow-sm">
      <img src="/icons/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-[10px]" />
      <div className="min-w-[220px] flex-1">
        <div className="font-semibold">Install BallotPolls on this device</div>
        <p className="text-sm text-muted">
          {promptable ? 'Open it like an app, straight from your home screen or desktop.' : (
            <>
              Tap <Share size={14} strokeWidth={2} aria-label="Share" className="mx-0.5 inline align-[-2px]" /> in Safari, then choose <strong className="font-semibold text-ink">Add to Home Screen</strong>.
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {promptable && (
          <Button onClick={install} disabled={asking} className="min-h-10 px-5 text-sm">
            Install
          </Button>
        )}
        <Button variant="secondary" onClick={close} className="min-h-10 px-4 text-sm">
          Not now
        </Button>
        <button type="button" onClick={close} aria-label="Dismiss" className="flex h-10 w-10 items-center justify-center rounded-[10px] text-muted hover:bg-ground">
          <X size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
