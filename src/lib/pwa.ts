// Everything about installing BallotPolls as an app on a phone or computer. Chrome, Edge and Android announce that the
// site can be installed with a one-time event, often before the dashboard has even opened, so it is caught here at
// start-up and kept until a banner asks for it.

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let saved: InstallEvent | null = null
const listeners = new Set<() => void>()
const tell = () => listeners.forEach((l) => l())

export const subscribeInstall = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const canPromptInstall = () => saved !== null

// Shows the browser's own install dialog. Returns whether the person agreed.
export async function promptInstall() {
  if (!saved) return false
  const event = saved
  saved = null
  await event.prompt()
  const { outcome } = await event.userChoice
  tell()
  return outcome === 'accepted'
}

export const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

// iPhones and iPads never announce installing: the person has to use Safari's Share menu, so the banner explains it.
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const DISMISS_KEY = 'ballotpolls-install-dismissed'
const SNOOZE_DAYS = 14

export const installDismissed = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    return Boolean(at) && Date.now() - at < SNOOZE_DAYS * 86_400_000
  } catch {
    return false
  }
}
export const dismissInstall = () => {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    /* private browsing: the banner simply comes back next visit */
  }
}

export function startPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Hold the prompt back so the banner can offer it at a good moment instead of the browser's own mini bar.
    e.preventDefault()
    saved = e as InstallEvent
    tell()
  })
  window.addEventListener('appinstalled', () => {
    saved = null
    tell()
  })
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
  }
}
