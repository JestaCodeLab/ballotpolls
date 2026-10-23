import { initials } from './format'

// The candidate flyer: a 600 x 600 picture a candidate can share, drawn in the browser so nothing is uploaded or stored.
// The layout follows the "Flyer: Candidate" design. `scale` 2 gives a 1200 x 1200 file that stays sharp on phones.

export interface FlyerData {
  candidateName: string
  photoUrl?: string
  // The number voters enter for this candidate in their category.
  number: number
  categoryName: string
  electionName: string
  eventCode: string
  // What voters dial, e.g. *713*55#. Without one, the flyer says "short code".
  shortcode?: string
  // GHS per vote.
  price: number
  // ISO time voting closes.
  closesAt: string
}

const INK = '#10201B'
const AMBER = '#F2B33D'
const BRAND = '#0B7A5B'
const DISPLAY = "'Bricolage Grotesque', sans-serif"
const BODY = "'Figtree', system-ui, sans-serif"

const loadImage = (url: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    // Without this the picture would taint the canvas and the file could not be saved.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Text with letter spacing, drawn letter by letter because not every browser supports ctx.letterSpacing.
const spaced = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) => {
  let cx = x
  for (const ch of text) {
    ctx.fillText(ch, cx, y)
    cx += ctx.measureText(ch).width + spacing
  }
  return cx - spacing
}
const spacedWidth = (ctx: CanvasRenderingContext2D, text: string, spacing: number) => [...text].reduce((w, ch) => w + ctx.measureText(ch).width + spacing, -spacing)

// Breaks text into lines no wider than `max`. A single word wider than that is left whole.
const wrap = (ctx: CanvasRenderingContext2D, text: string, max: number) => {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > max) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

const ellipsis = (ctx: CanvasRenderingContext2D, text: string, max: number) => {
  if (ctx.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

const closing = (iso: string) => {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Accra' })
  const time = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Africa/Accra' }).toUpperCase()
  return `${date}, ${time}`
}

export async function renderFlyer(d: FlyerData, scale = 2): Promise<Blob> {
  // Draw only once the fonts are in, or the flyer would come out in a fallback face.
  await Promise.all([
    document.fonts.load(`700 44px ${DISPLAY}`),
    document.fonts.load(`700 17px ${BODY}`),
    document.fonts.load(`600 15px ${BODY}`),
    document.fonts.load(`500 13px ${BODY}`),
  ]).catch(() => {})
  const photo = d.photoUrl ? await loadImage(d.photoUrl) : null

  const canvas = document.createElement('canvas')
  canvas.width = 600 * scale
  canvas.height = 600 * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.textBaseline = 'alphabetic'

  // Background and the two soft glows.
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, 600, 600)
  const glow = (cx: number, cy: number, r: number, rgb: string, a: number) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, `rgba(${rgb},${a})`)
    g.addColorStop(0.68, `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 600, 600)
  }
  glow(530, 50, 190, '242,179,61', 0.34)
  glow(40, 330, 150, '11,122,91', 0.55)

  // Header: the mark, the name and the tag.
  ctx.fillStyle = AMBER
  roundRect(ctx, 32, 32, 30, 30, 8)
  ctx.fill()
  ctx.save()
  ctx.translate(32 + 6.5, 32 + 6.5)
  ctx.scale(17 / 24, 17 / 24)
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(5, 12.5)
  ctx.lineTo(9.5, 17)
  ctx.lineTo(19, 7)
  ctx.stroke()
  ctx.restore()
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `700 19px ${DISPLAY}`
  ctx.fillText('BallotPolls', 72, 53)

  ctx.font = `700 12px ${BODY}`
  const tag = 'VOTE BY PHONE'
  const tagW = spacedWidth(ctx, tag, 1.7)
  ctx.strokeStyle = AMBER
  ctx.lineWidth = 1.5
  roundRect(ctx, 568 - tagW - 24, 33, tagW + 24, 28, 14)
  ctx.stroke()
  ctx.fillStyle = AMBER
  spaced(ctx, tag, 568 - tagW - 12, 51.5, 1.7)

  // The candidate's picture, or their initials, in a rounded frame.
  const px = 32
  const py = 92
  const pw = 226
  const ph = 268
  ctx.save()
  roundRect(ctx, px, py, pw, ph, 22)
  ctx.clip()
  if (photo) {
    // Cover the frame, keeping the top (faces) in view.
    const k = Math.max(pw / photo.width, ph / photo.height)
    ctx.drawImage(photo, px + (pw - photo.width * k) / 2, py, photo.width * k, photo.height * k)
  } else {
    ctx.fillStyle = '#DCE3F2'
    ctx.fillRect(px, py, pw, ph)
    ctx.fillStyle = '#1F3A6B'
    ctx.font = `700 96px ${DISPLAY}`
    ctx.textAlign = 'center'
    ctx.fillText(initials(d.candidateName), px + pw / 2, py + ph / 2 + 32)
    ctx.textAlign = 'left'
  }
  ctx.restore()
  ctx.strokeStyle = AMBER
  ctx.lineWidth = 3
  roundRect(ctx, px + 1.5, py + 1.5, pw - 3, ph - 3, 21)
  ctx.stroke()

  // The number badge on the frame's corner.
  const bx = 237
  const by = 339
  ctx.fillStyle = AMBER
  ctx.beginPath()
  ctx.arc(bx, by, 35, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(bx, by, 33, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = INK
  ctx.font = `700 10px ${BODY}`
  const noW = spacedWidth(ctx, 'NO:', 1)
  spaced(ctx, 'NO:', bx - noW / 2, by - 9, 1)
  const num = String(d.number)
  ctx.font = `700 ${num.length > 2 ? 24 : 32}px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.fillText(num, bx, by + 20)
  ctx.textAlign = 'left'

  // Name block, to the right of the picture.
  const tx = 284
  const tw = 284
  ctx.fillStyle = AMBER
  ctx.font = `700 13px ${BODY}`
  spaced(ctx, 'VOTE FOR', tx, 112, 2.1)

  // The name takes the biggest size that fits in three lines.
  let size = 44
  let lines: string[] = []
  for (; size >= 28; size -= 4) {
    ctx.font = `700 ${size}px ${DISPLAY}`
    lines = wrap(ctx, d.candidateName, tw)
    if (lines.length <= 3 && lines.every((l) => ctx.measureText(l).width <= tw)) break
  }
  ctx.fillStyle = '#FFFFFF'
  const lh = size * 1.06
  let y = 124 + size * 0.92
  for (const l of lines.slice(0, 3)) {
    ctx.fillText(l, tx, y)
    y += lh
  }

  // Category pill and election name.
  y += 4
  ctx.font = `600 15px ${BODY}`
  const cat = ellipsis(ctx, d.categoryName, tw - 28)
  const catW = ctx.measureText(cat).width + 28
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  roundRect(ctx, tx, y, catW, 32, 16)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(cat, tx + 14, y + 21)
  y += 32 + 14
  ctx.font = `500 15px ${BODY}`
  ctx.fillStyle = '#C5D3CC'
  for (const l of wrap(ctx, d.electionName, tw).slice(0, 2)) {
    y += 15
    ctx.fillText(l, tx, y)
    y += 5
  }

  // How to vote card.
  ctx.fillStyle = '#F4F7F5'
  roundRect(ctx, 32, 398, 536, 170, 20)
  ctx.fill()
  ctx.fillStyle = '#5B6B65'
  ctx.font = `700 12px ${BODY}`
  spaced(ctx, 'HOW TO VOTE', 54, 424, 1.7)

  const colW = (492 - 24) / 3
  const steps: { n: string; a: string; b: string; strong: boolean }[] = [
    { n: '1', a: 'Dial', b: d.shortcode ?? 'short code', strong: true },
    { n: '2', a: 'Enter event code', b: d.eventCode, strong: true },
    { n: '3', a: 'Choose category,', b: `then No: ${d.number}`, strong: true },
  ]
  steps.forEach((s, i) => {
    const sx = 54 + i * (colW + 12)
    ctx.fillStyle = BRAND
    ctx.beginPath()
    ctx.arc(sx + 12, 454, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `700 13px ${BODY}`
    ctx.textAlign = 'center'
    ctx.fillText(s.n, sx + 12, 458.5)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#3F4F49'
    ctx.font = `500 13px ${BODY}`
    ctx.fillText(s.a, sx + 33, 450)
    ctx.fillStyle = INK
    ctx.font = `700 17px ${BODY}`
    if (i === 1) spaced(ctx, s.b, sx + 33, 470, 1)
    else ctx.fillText(s.b, sx + 33, 470)
  })

  ctx.strokeStyle = '#DCE4E0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(54, 494)
  ctx.lineTo(546, 494)
  ctx.stroke()

  const price = `GHS ${d.price.toFixed(2)}`
  ctx.fillStyle = INK
  ctx.font = `700 20px ${DISPLAY}`
  ctx.fillText(price, 54, 527)
  const pw2 = ctx.measureText(`${price} `).width
  ctx.fillStyle = '#5B6B65'
  ctx.font = `500 13px ${BODY}`
  ctx.fillText('per vote', 54 + pw2, 527)

  const when = closing(d.closesAt)
  ctx.font = `700 13px ${BODY}`
  const whenW = ctx.measureText(when).width
  ctx.fillStyle = INK
  ctx.fillText(when, 546 - whenW, 526)
  ctx.font = `500 13px ${BODY}`
  ctx.fillStyle = '#5B6B65'
  const label = 'Voting closes '
  ctx.fillText(label, 546 - whenW - ctx.measureText(label).width, 526)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not make the picture'))), 'image/png'))
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Makes the flyer and hands it to the browser as a download.
export async function downloadFlyer(d: FlyerData) {
  const blob = await renderFlyer(d)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `flyer-${slug(d.candidateName)}-no-${d.number}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
