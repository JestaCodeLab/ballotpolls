import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Clock } from 'lucide-react'
import { api, type PublicElectionDetail } from '../../lib/api'
import { useSeo } from '../../lib/useSeo'
import { SHORTCODE, SITE_NAME, absoluteUrl } from '../../lib/site'
import { useNow } from '../../lib/useNow'
import { formatCountdown, formatDateTime, formatRange, ghs } from '../../lib/format'
import ElectionCover from '../../components/ElectionCover'
import { StatusChip } from '../../components/ui'
import { CandidateCard, DateTile, Section } from '../../components/site/parts'
import SiteNotFound from './SiteNotFound'
import axios from 'axios'

export default function EventDetail() {
  const { slug = '' } = useParams()
  const [e, setE] = useState<PublicElectionDetail | null>(null)
  const [missing, setMissing] = useState(false)
  const [tab, setTab] = useState('')
  const now = useNow()

  useEffect(() => {
    setE(null)
    setMissing(false)
    api
      .get<PublicElectionDetail>(`/public/elections/${slug}`)
      .then((r) => {
        setE(r.data)
        setTab(r.data.categories[0]?.id ?? '')
      })
      .catch((err) => setMissing(axios.isAxiosError(err) && err.response?.status === 404))
  }, [slug])

  const path = `/events/${slug}`
  const pageUrl = absoluteUrl(path)
  useSeo(
    e
      ? {
          title: `${e.name} | Vote by phone | ${SITE_NAME}`,
          description: (
            e.description?.trim() ||
            `Vote in ${e.name}. ${SHORTCODE ? `Dial ${SHORTCODE} and enter event code ${e.eventCode}.` : `Use event code ${e.eventCode}.`} ${ghs(e.pricePerVote)} per vote. ${formatRange(e.startsAt, e.endsAt)}.`
          ).slice(0, 300),
          path,
          image: e.coverImageUrl,
          jsonLd: [
            {
              '@context': 'https://schema.org',
              '@type': 'Event',
              name: e.name,
              description: e.description || undefined,
              startDate: e.startsAt,
              endDate: e.endsAt,
              eventStatus: 'https://schema.org/EventScheduled',
              eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
              location: { '@type': 'VirtualLocation', url: pageUrl },
              image: e.coverImageUrl ? [e.coverImageUrl] : undefined,
              organizer: e.organisation ? { '@type': 'Organization', name: e.organisation } : undefined,
              offers: {
                '@type': 'Offer',
                price: e.pricePerVote,
                priceCurrency: 'GHS',
                availability: e.status === 'closed' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
                url: pageUrl,
              },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Elections', item: absoluteUrl('/events') },
                { '@type': 'ListItem', position: 2, name: e.name, item: pageUrl },
              ],
            },
          ],
        }
      : { title: missing ? `Election not found | ${SITE_NAME}` : `Loading election | ${SITE_NAME}`, description: 'Elections you can vote in by phone.', noindex: true },
  )

  if (missing) return <SiteNotFound what="election" />
  if (!e)
    return (
      <Section className="py-10" >
        <div role="status" aria-label="Loading election" aria-hidden={false}>
          <div className="skeleton h-[360px] w-full rounded-[20px]" />
          <div className="skeleton mt-8 h-10 w-2/3 rounded-lg" />
        </div>
      </Section>
    )

  const category = e.categories.find((c) => c.id === tab) ?? e.categories[0]
  const closes = new Date(e.endsAt).getTime() - now
  const opens = new Date(e.startsAt).getTime() - now
  const clock = e.status === 'live' ? `Voting closes in ${formatCountdown(closes)}` : e.status === 'upcoming' ? `Voting opens in ${formatCountdown(opens)}` : 'Voting has closed'

  return (
    <Section className="pb-[72px] pt-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Link to="/events" className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line bg-white px-4 text-[15px] font-semibold text-ink hover:bg-ground">
          <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
          Back to elections
        </Link>
        <nav aria-label="Breadcrumb" className="ml-auto text-sm text-muted">
          <Link to="/events" className="hover:underline">Elections</Link> <span aria-hidden="true">/</span> <strong aria-current="page" className="font-semibold text-ink">{e.name}</strong>
        </nav>
      </div>

      <ElectionCover src={e.coverImageUrl} name={e.name} className="mt-[18px] h-[220px] w-full rounded-[20px] md:h-[360px]" />

      <div className="mt-8 flex flex-wrap items-start gap-8">
        <div className="min-w-0 flex-[1_1_520px]">
          <div className="flex flex-wrap items-center gap-3.5">
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-[44px] md:leading-[1.1]">{e.name}</h1>
            <StatusChip status={e.status} />
          </div>
          <div className="mt-5 flex flex-wrap gap-x-9 gap-y-3.5">
            <DateTile icon={<CalendarDays size={20} strokeWidth={1.8} aria-hidden="true" />} label="Voting opens" value={formatDateTime(e.startsAt)} />
            <DateTile icon={<Clock size={20} strokeWidth={1.8} aria-hidden="true" />} label="Voting closes" value={formatDateTime(e.endsAt)} />
          </div>
          {e.description && <p className="mt-6 max-w-[600px] whitespace-pre-line text-lg leading-relaxed">{e.description}</p>}
        </div>

        <aside aria-label="How to vote" className="w-full max-w-full lg:-mt-[190px] lg:mr-10 lg:w-[380px] lg:flex-none">
          <div className="relative z-[2] rounded-[20px] bg-ink p-7 text-[#e8efeb] shadow-[0_20px_50px_rgba(16,32,27,0.28)]">
            <div className="text-sm text-[#a9bbb3]">How to vote</div>
            {e.status === 'closed' ? (
              <p className="mt-3 text-base leading-relaxed">Voting in this election has closed. Thank you to everyone who took part.</p>
            ) : (
              <>
                {SHORTCODE && (
                  <>
                    <div className="mt-3.5 text-sm text-[#a9bbb3]">Dial</div>
                    <div className="font-display text-[44px] font-bold leading-[1.1]">{SHORTCODE}</div>
                  </>
                )}
                <div className="mt-4 text-base">
                  {SHORTCODE ? 'Then enter event code ' : 'Enter event code '}
                  <span className="inline-block rounded-md bg-accent px-2.5 py-0.5 font-bold tracking-wider text-ink">{e.eventCode}</span>
                </div>
              </>
            )}
            <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-white/15 pt-[18px]">
              <span className="text-[15px] text-[#a9bbb3]">Price per vote</span>
              <strong className="font-display text-[28px] text-white">{ghs(e.pricePerVote)}</strong>
            </div>
            {e.status !== 'closed' && (
              <ol className="mt-5 list-decimal space-y-2 pl-5 text-[15px] leading-normal text-[#c5d3cc]">
                <li>Choose a category.</li>
                <li>Reply with your candidate’s number.</li>
                <li>Confirm the mobile money payment on your phone.</li>
              </ol>
            )}
            <p className="mt-5 text-[13px] text-[#a9bbb3]">{clock}</p>
          </div>
        </aside>
      </div>

      <section aria-labelledby="standing" className="mt-14">
        <h2 id="standing" className="font-display text-[32px] font-bold tracking-tight">Who is standing</h2>
        <p className="mb-5 mt-1.5 text-base text-muted">Use a candidate’s vote code when you vote.</p>
        {e.categories.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-field bg-white px-6 py-12 text-center text-muted">The candidates for this election have not been announced yet.</p>
        ) : (
          <>
            <div role="tablist" aria-label="Categories" className="mb-6 flex flex-wrap gap-2">
              {e.categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={c.id === category?.id}
                  onClick={() => setTab(c.id)}
                  className={`min-h-11 rounded-full border px-[18px] text-sm font-semibold ${c.id === category?.id ? 'border-ink bg-ink text-white' : 'border-field bg-white hover:bg-ground'}`}
                >
                  {c.parentName ? `${c.name} (${c.parentName})` : c.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
              {category?.candidates.map((c) => (
                <CandidateCard key={c.slug} electionSlug={e.slug} c={c} showVotes={e.status !== 'upcoming'} />
              ))}
            </div>
          </>
        )}
      </section>
    </Section>
  )
}
