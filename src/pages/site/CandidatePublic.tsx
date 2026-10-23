import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Vote } from 'lucide-react'
import { api, type PublicCandidateDetail } from '../../lib/api'
import { useSeo } from '../../lib/useSeo'
import { SHORTCODE, SITE_NAME, absoluteUrl } from '../../lib/site'
import { useNow } from '../../lib/useNow'
import { formatCountdown, ghs } from '../../lib/format'
import { CandidatePhoto, Section } from '../../components/site/parts'
import { StatIcon } from '../../components/ui'
import SiteNotFound from './SiteNotFound'

// A candidate's number as voters see it: "2", not "02".
const pad = (n: number) => String(n)

export default function CandidatePublic() {
  const { slug = '', candidateSlug = '' } = useParams()
  const [d, setD] = useState<PublicCandidateDetail | null>(null)
  const [missing, setMissing] = useState(false)
  const now = useNow()

  useEffect(() => {
    setD(null)
    setMissing(false)
    api
      .get<PublicCandidateDetail>(`/public/elections/${slug}/candidates/${candidateSlug}`)
      .then((r) => setD(r.data))
      .catch((err) => setMissing(axios.isAxiosError(err) && err.response?.status === 404))
  }, [slug, candidateSlug])

  const path = `/events/${slug}/candidates/${candidateSlug}`
  useSeo(
    d
      ? {
          title: `${d.candidate.name} | ${d.election.name} candidate | ${SITE_NAME}`,
          description: (d.candidate.bio?.trim() || `${d.candidate.name} is standing in ${d.election.name}. Vote with No: ${pad(d.standingIn[0].code)} in ${d.standingIn[0].name}.`).slice(0, 300),
          path,
          // Candidate pages share their election's cover, so every link to the election looks the same.
          image: d.election.coverImageUrl,
          jsonLd: [
            { '@context': 'https://schema.org', '@type': 'Person', name: d.candidate.name, description: d.candidate.bio || undefined, image: d.candidate.imageUrl || undefined, url: absoluteUrl(path) },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Elections', item: absoluteUrl('/events') },
                { '@type': 'ListItem', position: 2, name: d.election.name, item: absoluteUrl(`/events/${slug}`) },
                { '@type': 'ListItem', position: 3, name: d.candidate.name, item: absoluteUrl(path) },
              ],
            },
          ],
        }
      : { title: missing ? `Candidate not found | ${SITE_NAME}` : `Loading candidate | ${SITE_NAME}`, description: 'Elections you can vote in by phone.', noindex: true },
  )

  if (missing) return <SiteNotFound what="candidate" />
  if (!d)
    return (
      <Section className="py-10">
        <div role="status" aria-label="Loading candidate" className="flex flex-wrap gap-8">
          <div className="skeleton aspect-square w-[300px] max-w-full rounded-[20px]" />
          <div className="skeleton h-12 w-80 rounded-lg" />
        </div>
      </Section>
    )

  const { election, candidate, standingIn, othersInCategory } = d
  const first = standingIn[0]
  const closed = election.status === 'closed'
  const clock = election.status === 'live' ? `Voting closes in ${formatCountdown(new Date(election.endsAt).getTime() - now)}` : election.status === 'upcoming' ? `Voting opens in ${formatCountdown(new Date(election.startsAt).getTime() - now)}` : 'Voting has closed'
  const first1 = candidate.name.split(' ')[0]
  // Nobody can have voted before voting opens, so a count of zero would only be noise.
  const showVotes = election.status !== 'upcoming'

  return (
    <Section className="pb-[72px] pt-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Link to={`/events/${slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line bg-white px-4 text-[15px] font-semibold text-ink hover:bg-ground">
          <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
          Back to {election.name}
        </Link>
        <nav aria-label="Breadcrumb" className="ml-auto text-sm text-muted">
          <Link to="/events" className="hover:underline">Elections</Link> <span aria-hidden="true">/</span>{' '}
          <Link to={`/events/${slug}`} className="hover:underline">{election.name}</Link> <span aria-hidden="true">/</span>{' '}
          <strong aria-current="page" className="font-semibold text-ink">{candidate.name}</strong>
        </nav>
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-10">
        <div className="min-w-0 flex-[3_1_560px]">
          <div className="flex flex-wrap items-start gap-8">
            <CandidatePhoto name={candidate.name} src={candidate.imageUrl} className="aspect-square w-[300px] max-w-full rounded-[20px] text-[100px]" />
            <div className="min-w-0 flex-[1_1_260px]">
              <div className="flex flex-wrap gap-2">
                {standingIn.map((s) => (
                  <span key={s.categoryId} className="rounded-full bg-brand-tint px-3 py-1 text-[13px] font-medium text-[#0b5a43]">
                    {s.parentName ? `${s.name} (${s.parentName})` : s.name}
                  </span>
                ))}
              </div>
              <h1 className="mt-4 font-display text-5xl font-bold leading-[1.05] tracking-tight">{candidate.name}</h1>
              <p className="mt-2.5 text-base text-muted">
                Candidate in <Link to={`/events/${slug}`} className="font-semibold text-brand hover:underline">{election.name}</Link>
              </p>
              {showVotes && (
                <div className="mt-5 inline-flex items-center gap-4 rounded-2xl border border-line bg-white px-5 py-4">
                  <StatIcon icon={Vote} />
                  <div>
                    <div className="text-[13px] text-muted">Total votes{standingIn.length > 1 ? ' across all categories' : ''}</div>
                    <div className="font-display text-4xl font-bold leading-none tracking-tight text-[#0b5a43]">{candidate.totalVotes.toLocaleString()}</div>
                  </div>
                </div>
              )}
              {candidate.bio && <p className="mt-5 max-w-[560px] whitespace-pre-line text-lg leading-relaxed">{candidate.bio}</p>}
            </div>
          </div>

          <h2 className="mb-1.5 mt-12 font-display text-[28px] font-bold tracking-tight">Standing in</h2>
          <p className="mb-4 text-base text-muted">Each category has its own vote code for {first1}.</p>
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            {standingIn.map((s) => (
              <div key={s.categoryId} className="flex items-center gap-4 border-t border-[#eef2f0] px-[22px] py-[18px] first:border-t-0">
                <div className="min-w-0 flex-1 text-lg font-semibold">{s.parentName ? `${s.name} (${s.parentName})` : s.name}</div>
                {showVotes && (
                  <span className="whitespace-nowrap text-sm text-muted">
                    <strong className="font-display text-xl text-[#0b5a43]">{s.votes.toLocaleString()}</strong> {s.votes === 1 ? 'vote' : 'votes'}
                  </span>
                )}
                <span className="hidden text-sm text-muted sm:inline">Vote No:</span>
                <span className="rounded-lg bg-ground px-3.5 py-1 text-xl font-bold">{pad(s.code)}</span>
              </div>
            ))}
          </div>

          {othersInCategory.candidates.length > 0 && (
            <>
              <h2 className="mb-1.5 mt-12 font-display text-[28px] font-bold tracking-tight">Also in {othersInCategory.name}</h2>
              <p className="mb-4 text-base text-muted">The other candidates you can choose between.</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {othersInCategory.candidates.map((o) => (
                  <Link key={o.slug} to={`/events/${slug}/candidates/${o.slug}`} className="flex items-center gap-3.5 rounded-[14px] border border-line bg-white p-3.5 text-ink hover:shadow-md">
                    <CandidatePhoto name={o.name} src={o.imageUrl} className="h-[52px] w-[52px] shrink-0 rounded-xl text-[17px]" />
                    <div className="min-w-0">
                      <div className="truncate font-semibold leading-snug">{o.name}</div>
                      <div className="mt-0.5 text-[13px] text-muted">
                        No: {pad(o.code)}
                        {showVotes && <> · <strong className="text-[#0b5a43]">{o.votes.toLocaleString()}</strong> {o.votes === 1 ? 'vote' : 'votes'}</>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        <aside aria-label={`How to vote for ${candidate.name}`} className="flex w-full flex-col gap-4 lg:sticky lg:top-6 lg:w-auto lg:min-w-[340px] lg:flex-[2_1_340px]">
          <div className="rounded-[20px] bg-ink p-7 text-[#e8efeb]">
            <div className="text-sm text-[#a9bbb3]">Vote for {candidate.name}</div>
            {closed ? (
              <p className="mt-3 text-base leading-relaxed">Voting in this election has closed.</p>
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
                  <span className="inline-block rounded-md bg-accent px-2.5 py-0.5 font-bold tracking-wider text-ink">{election.eventCode}</span>
                </div>
                <ol className="mt-5 list-decimal space-y-2 pl-5 text-[15px] leading-normal text-[#c5d3cc]">
                  <li>Choose the category.</li>
                  <li>
                    Enter No: <strong className="text-white">{pad(first.code)}</strong> for {first1} in {first.name}.
                  </li>
                  <li>Confirm the mobile money payment on your phone.</li>
                </ol>
              </>
            )}
            <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-white/15 pt-[18px]">
              <span className="text-[15px] text-[#a9bbb3]">Price per vote</span>
              <strong className="font-display text-[28px] text-white">{ghs(election.pricePerVote)}</strong>
            </div>
            <p className="mt-4 text-[13px] text-[#a9bbb3]">{clock}</p>
          </div>
        </aside>
      </div>
    </Section>
  )
}
