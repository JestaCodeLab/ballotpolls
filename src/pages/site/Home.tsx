import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, ListChecks, Smartphone, Wallet } from 'lucide-react'
import { api, type PublicElection } from '../../lib/api'
import { useSeo } from '../../lib/useSeo'
import { DEFAULT_DESCRIPTION, SITE_NAME, absoluteUrl, ogImage } from '../../lib/site'
import { EventCard, EventGridSkeleton, Section } from '../../components/site/parts'

const STEPS = [
  ['Dial the shortcode', 'Dial the short code shown on the election. It works on any phone, with no app and no internet.'],
  ['Enter the event code and choose', 'Type the election’s event code, pick a category, then reply with the number of your candidate.'],
  ['Pay by mobile money', 'Confirm the payment prompt on your phone. Your vote counts as soon as the payment is confirmed.'],
]

const FEATURES = [
  { icon: ListChecks, title: 'Categories and candidates', body: 'Build a library once and reuse it. Add candidates one by one, from a list, or by importing a spreadsheet.' },
  { icon: BarChart3, title: 'Live results', body: 'Follow every category as votes arrive, with a countdown to closing and the revenue it has earned.' },
  { icon: Smartphone, title: 'Mobile money payments', body: 'Voters pay for each vote from their phone. You set the price per vote for every election.' },
  { icon: Wallet, title: 'Withdraw your revenue', body: 'Request a payout from your dashboard and confirm it with an SMS code. Approved withdrawals are released within 1 hour.' },
]

export default function Home() {
  const [elections, setElections] = useState<PublicElection[] | null>(null)

  useEffect(() => {
    api
      .get<PublicElection[]>('/public/elections')
      .then((r) => setElections(r.data))
      .catch(() => setElections([]))
  }, [])

  useSeo({
    title: 'Tally | Run an election people vote in from any phone',
    description: DEFAULT_DESCRIPTION,
    path: '/',
    image: ogImage('home'),
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/'), logo: absoluteUrl('/favicon.svg') },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/'), description: DEFAULT_DESCRIPTION },
    ],
  })

  // Elections open right now, or failing that the latest ones.
  const live = (elections ?? []).filter((e) => e.status === 'live')
  const featured = (live.length ? live : (elections ?? [])).slice(0, 3)

  return (
    <>
      <div className="relative overflow-hidden border-b border-line bg-white">
        {/* The banner: a hand holding a basic phone showing the voting menu. On wide screens it fills the hero behind the
            words, with a white fade on the left so they stay easy to read. On phones it sits above them. */}
        <img
          src="/assets/vote_slider.jpg"
          alt="A hand holding a basic phone that shows a voting menu for Artiste of the Year, in front of an awards stage"
          width={1774}
          height={887}
          fetchPriority="high"
          className="h-[240px] w-full object-cover object-[72%_center] sm:h-[320px] md:absolute md:inset-0 md:h-full md:object-[78%_center]"
        />
        <div aria-hidden="true" className="absolute inset-0 hidden bg-[linear-gradient(90deg,#fff_0%,rgba(255,255,255,0.94)_36%,rgba(255,255,255,0)_62%)] md:block" />
        <Section className="relative py-12 md:py-24 lg:py-28">
          <div className="max-w-[540px]">
            <span className="inline-block rounded-full bg-brand-tint px-3 py-1.5 text-[13px] font-semibold text-[#0b5a43]">USSD voting with mobile money</span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-[56px]">Run an election anyone can vote in from a basic phone.</h1>
            <p className="mt-5 text-lg leading-relaxed text-muted md:text-[19px]">
              Set up categories and candidates, open voting for a set window, and watch results come in live. Voters dial a short code and pay by mobile money.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex min-h-[52px] items-center rounded-xl bg-brand px-7 text-base font-semibold text-white hover:bg-brand-dark">
                Create your election
              </Link>
              <Link to="/events" className="inline-flex min-h-[52px] items-center rounded-xl border border-field bg-white px-7 text-base font-semibold hover:bg-ground">
                See live elections
              </Link>
            </div>
          </div>
        </Section>
      </div>

      <Section className="pb-6 pt-16">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{live.length || elections === null ? 'Happening now' : 'Latest elections'}</h2>
            <p className="mt-2 text-[17px] text-muted">{live.length || elections === null ? 'Elections open for voting right now.' : 'Browse the most recent elections.'}</p>
          </div>
          <Link to="/events" className="text-base font-semibold text-brand hover:underline">
            View all elections
          </Link>
        </div>
        {elections === null ? (
          <EventGridSkeleton />
        ) : featured.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((e) => (
              <EventCard key={e.slug} e={e} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-field bg-white px-6 py-12 text-center text-muted">No elections are listed yet. Check back soon.</p>
        )}
      </Section>

      <Section className="py-16">
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">How voting works</h2>
        <p className="mb-8 mt-2 max-w-[560px] text-[17px] text-muted">No app, no internet. Anyone with a phone can vote in three steps.</p>
        <ol className="grid gap-5 md:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="rounded-2xl border border-line bg-white p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink font-display text-xl font-bold text-accent">{i + 1}</div>
              <h3 className="mt-[18px] font-display text-[22px] font-bold">{title}</h3>
              <p className="mt-2 text-base leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <div className="border-y border-line bg-white">
        <Section className="py-16">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Everything you need to run it</h2>
          <p className="mb-8 mt-2 max-w-[560px] text-[17px] text-muted">One dashboard for the whole election, from the first category to the payout.</p>
          <div className="grid gap-5 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-[18px] rounded-2xl border border-line bg-ground p-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                  <f.icon size={24} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold">{f.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section className="py-16">
        <div className="flex flex-wrap items-center justify-between gap-7 rounded-3xl bg-ink p-8 md:p-14">
          <div className="max-w-[600px]">
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-white md:text-[40px]">Ready to run yours?</h2>
            <p className="mt-3 text-[17px] leading-relaxed text-[#b7c7bf]">Create an account with your phone number and set up your first election in minutes.</p>
          </div>
          <Link to="/register" className="inline-flex min-h-[52px] items-center rounded-xl bg-accent px-7 text-base font-bold text-ink hover:brightness-95">
            Create your election
          </Link>
        </div>
      </Section>
    </>
  )
}
