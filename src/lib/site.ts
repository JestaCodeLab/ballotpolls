// Settings for the public website. All are optional settings in client/.env.
//   VITE_SITE_URL:         the website's address, e.g. https://ballotpolls.example.com. Used in canonical links and share previews.
//   VITE_SUPPORT_EMAIL:    the address behind Contact > Email.
//   VITE_WHATSAPP_NUMBER:  the number behind Contact > WhatsApp, with country code, digits only (233241234567).
//   VITE_USSD_SHORTCODE:   what voters dial, e.g. *713*55#.

export const SITE_NAME = 'BallotPolls'
export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) ?? (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '')
export const absoluteUrl = (path: string) => `${SITE_URL}${path}`

export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined
const whatsappDigits = (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined)?.replace(/\D/g, '')
export const WHATSAPP_URL = whatsappDigits ? `https://wa.me/${whatsappDigits}` : undefined
export const SHORTCODE = import.meta.env.VITE_USSD_SHORTCODE as string | undefined

// Share-preview pictures live in public/og (see the README there). Pages without their own picture use the default.
const OG_FILES = { default: 'default.png', home: 'home.jpg', events: 'events.png' } as const
export const ogImage = (name: keyof typeof OG_FILES) => absoluteUrl(`/og/${OG_FILES[name]}`)

export const DEFAULT_DESCRIPTION =
  'Run an election anyone can vote in from a basic phone. Voters dial a short code and pay by mobile money. Set up categories and candidates and follow results live.'
