// Brand colours for an organisation's flyers. The same checks run on the server, so a colour that is refused there is
// already flagged on screen before saving.

// The same limits as the server: the main colour carries white and light-grey writing, so it has to be quite dark, and the
// accent is used for small writing on top of it.
export const MIN_MAIN_CONTRAST = 6
export const MIN_ACCENT_CONTRAST = 4.5

export const DEFAULT_BRAND = { primary: '#10201B', accent: '#F2B33D' }

export const isHex = (s: string) => /^#[0-9a-fA-F]{6}$/.test(s)

const channel = (v: number) => {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

// WCAG contrast ratio, 1 to 21.
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Writing that reads on top of a colour: near-black on light colours, white on dark ones.
export const onColor = (hex: string) => (contrast(hex, '#10201B') >= contrast(hex, '#FFFFFF') ? '#10201B' : '#FFFFFF')

// Mixes two colours: `amount` of the second into the first (0 to 1).
export const mix = (a: string, b: string, amount: number) => {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const c = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - amount) + ((pb >> shift) & 255) * amount)
  return `#${[16, 8, 0].map((s) => c(s).toString(16).padStart(2, '0')).join('')}`
}

export const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

// Ready-made pairs (main colour, accent) for organisations that do not have exact brand colours to hand.
export const PRESETS: { name: string; primary: string; accent: string }[] = [
  { name: 'BallotPolls', primary: '#10201B', accent: '#F2B33D' },
  { name: 'Royal', primary: '#1F2A5C', accent: '#F5C542' },
  { name: 'Crimson', primary: '#5C1420', accent: '#F2B33D' },
  { name: 'Forest', primary: '#0E3B2A', accent: '#7BE0A6' },
  { name: 'Ocean', primary: '#0B3C5D', accent: '#7DD3FC' },
  { name: 'Plum', primary: '#3B1C5A', accent: '#F9A8D4' },
  { name: 'Charcoal', primary: '#1F2933', accent: '#FB923C' },
]
