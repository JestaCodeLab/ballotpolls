import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { Button } from './ui'

interface Step {
  // Matches a data-tour attribute in the sidebar or top bar.
  target: string
  // The page this step opens, so the explanation sits next to what it describes.
  to: string
  title: string
  body: string
}

// Follows the order a new organiser sets things up in. Settings is deliberately left out.
const STEPS: Step[] = [
  {
    target: 'overview',
    to: '/dashboard',
    title: 'Your dashboard',
    body: 'Start here. See your live elections, votes cast and a set-up checklist that shows what to do next.',
  },
  {
    target: 'categories',
    to: '/categories',
    title: 'Create categories',
    body: 'Define what people vote for, like Artiste of the Year. Categories are reusable across elections, and sub-categories go one level deep so USSD menus stay short.',
  },
  {
    target: 'candidates',
    to: '/candidates',
    title: 'Build your candidate library',
    body: 'Add each candidate once, with a photo and short bio. You assign them to categories inside each election.',
  },
  {
    target: 'elections',
    to: '/elections',
    title: 'Run an election',
    body: 'Set the voting window and the price per vote, then nominate candidates. Each candidate gets their own code; voters dial your USSD code, enter it and pay.',
  },
  {
    target: 'results',
    to: '/results',
    title: 'Watch results live',
    body: 'Once voting opens, follow every category as votes come in, with a countdown to closing and the revenue it has earned.',
  },
  {
    target: 'withdrawals',
    to: '/withdrawals',
    title: 'Withdraw your revenue',
    body: 'Vote revenue collects here. Request a payout and confirm it with an SMS code. Approved withdrawals are released within 1 hour.',
  },
]

const PAD = 6
const CARD_W = 340
const GAP = 16

interface Box {
  top: number
  left: number
  width: number
  height: number
}

// A first-time walkthrough. Each step opens its page, dims the rest of the screen, outlines the menu item it is
// about and explains it in a card. Skipping or finishing is remembered on the account, so it shows only once.
export default function ProductTour() {
  const navigate = useNavigate()
  const setUser = useAuth((s) => s.setUser)
  const [index, setIndex] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  const card = useRef<HTMLDivElement>(null)
  const nextBtn = useRef<HTMLButtonElement>(null)
  const step = STEPS[index]
  const last = index === STEPS.length - 1

  // Open the step's page, scroll its target into view and measure it.
  const measure = useCallback(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    if (!el) return setBox(null)
    const r = el.getBoundingClientRect()
    // On phones the sidebar is not on screen, so there is nothing to outline: the card is simply shown centred.
    if (r.width === 0 && r.height === 0) return setBox(null)
    setBox({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 })
  }, [step.target])

  useEffect(() => {
    navigate(step.to)
  }, [step.to, navigate])

  useLayoutEffect(() => {
    document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' })
    measure()
    // Measure again once the new page has rendered, and whenever the window changes.
    const t = setTimeout(measure, 120)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step.target, measure])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    nextBtn.current?.focus()
  }, [index])

  const close = async (goHome: boolean) => {
    // Hide it straight away; remembering it on the account can happen in the background.
    const user = useAuth.getState().user
    if (user) setUser({ ...user, showTour: false })
    if (goHome) navigate('/dashboard')
    try {
      await api.post('/auth/tour-complete')
    } catch {
      /* worst case it shows once more on the next sign-in */
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return void close(false)
    if (e.key !== 'Tab') return
    const items = Array.from(card.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [])
    if (!items.length) return
    const first = items[0]
    const end = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      end.focus()
    } else if (!e.shiftKey && document.activeElement === end) {
      e.preventDefault()
      first.focus()
    }
  }

  // Beside the menu item on wide screens, a bottom sheet on phones.
  let style: React.CSSProperties | undefined
  if (wide && box) {
    const top = Math.max(16, Math.min(box.top, window.innerHeight - 320))
    style = { position: 'fixed', top, left: box.left + box.width + GAP, width: CARD_W }
  }

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Blocks clicks on the page behind while the tour is open. */}
      <div className="absolute inset-0" aria-hidden="true" />
      {box && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-xl border-2 border-accent transition-all duration-200"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height, boxShadow: '0 0 0 9999px rgba(16,32,27,0.65)' }}
        />
      )}
      {!box && <div aria-hidden="true" className="absolute inset-0 bg-ink/65" />}
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        onKeyDown={onKeyDown}
        style={style}
        className={`rounded-2xl bg-white p-6 shadow-2xl ${style ? '' : 'fixed inset-x-4 bottom-4 md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[340px] md:-translate-x-1/2 md:-translate-y-1/2'}`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Step {index + 1} of {STEPS.length}
          </span>
          <div className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-brand' : 'bg-line'}`} />
            ))}
          </div>
        </div>
        <h2 id="tour-title" className="mt-3 font-display text-2xl font-bold tracking-tight">
          {step.title}
        </h2>
        <p id="tour-body" className="mt-2 text-[15px] leading-relaxed text-muted">
          {step.body}
        </p>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={() => close(false)} className="min-h-11 rounded-[10px] px-2 text-sm font-semibold text-muted hover:text-ink">
            Skip tour
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <Button variant="secondary" onClick={() => setIndex(index - 1)}>
                Back
              </Button>
            )}
            <Button ref={nextBtn} onClick={() => (last ? close(true) : setIndex(index + 1))}>
              {last ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
