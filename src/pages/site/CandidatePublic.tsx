import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Phone } from 'lucide-react'
import { api, type PublicCandidateDetail } from '../../lib/api'
import { useSeo } from '../../lib/useSeo'
import { SHORTCODE, SITE_NAME, absoluteUrl } from '../../lib/site'
import { useNow } from '../../lib/useNow'
import { formatCountdown, ghs } from '../../lib/format'
import { CandidatePhoto, Crumbs, Section } from '../../components/site/parts'
import SiteNotFound from './SiteNotFound'

// A candidate's number as voters see it: "2", not "02".
const pad = (n: number) => String(n)

export default function CandidatePublic() {
  const { slug = '', candidateSlug = '' } = useParams()
  // Which of the candidate's categories the voter is looking at: it decides the code shown.
  const [sel, setSel] = useState(0)
  const [d, setD] = useState<PublicCandidateDetail | null>(null)
  const [missing, setMissing] = useState(false)
  const now = useNow()

  useEffect(() => {
    setD(null)
    setMissing(false)
    setSel(0)
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
          description: (d.candidate.bio?.trim() || `${d.candidate.name} is a candidate in ${d.election.name}. Vote with code ${pad(d.standingIn[0].code)} in ${d.standingIn[0].name}.`).slice(0, 300),
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

  const { election, candidate, standingIn, othersByCategory } = d
  const current = standingIn[Math.min(sel, standingIn.length - 1)]
  const categoryName = (s: (typeof standingIn)[number]) => (s.parentName ? `${s.name} (${s.parentName})` : s.name)
  const others = othersByCategory[current.categoryId] ?? []
  const closed = election.status === 'closed'
  const clock = election.status === 'live' ? `Voting closes in ${formatCountdown(new Date(election.endsAt).getTime() - now)}` : election.status === 'upcoming' ? `Voting opens in ${formatCountdown(new Date(election.startsAt).getTime() - now)}` : 'Voting has closed'
  const dial = election.shortcode ?? SHORTCODE
  // Nobody can have voted before voting opens, so a count of zero would only be noise.
  const showVotes = election.status !== 'upcoming'
  const step = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white'

  return (
    <Section className="pb-[72px] pt-7">
      <div className="flex items-center justify-between gap-3 sm:gap-x-6">
        <Link to={`/events/${slug}`} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[10px] border border-line bg-white px-4 text-[15px] font-semibold text-ink hover:bg-ground">
          <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
          Go Back
        </Link>
        <Crumbs items={[{ label: 'Elections', to: '/events' }, { label: election.name, to: `/events/${slug}` }, { label: candidate.name }]} />
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-10">
        {/* Who: the candidate, plainly. */}
        <div className="min-w-0 flex-[1_1_520px]">
          <div className="flex flex-wrap items-center gap-7">
            <CandidatePhoto name={candidate.name} src={candidate.imageUrl} className="aspect-square w-[200px] max-w-full rounded-[28px] text-[72px]" />
            <div className="min-w-0 flex-[1_1_260px]">
              <div className="text-sm font-semibold tracking-wide text-[#0b5a43]">CANDIDATE</div>
              <h1 className="mt-1.5 font-display text-4xl font-bold leading-[1.04] tracking-tight md:text-[52px]">{candidate.name}</h1>
              <p className="mt-2.5 text-[17px] text-muted">
                in <Link to={`/events/${slug}`} className="font-semibold text-brand hover:underline">{election.name}</Link>
              </p>
            </div>
          </div>

          {candidate.bio && <p className="mt-7 max-w-[600px] whitespace-pre-line text-lg leading-relaxed">{candidate.bio}</p>}

          <div className="mt-7 flex flex-wrap gap-3.5">
            {showVotes && (
              <div className="min-w-[150px] rounded-[14px] border border-line bg-white px-5 py-3.5">
                <div className="text-[13px] text-muted">Total votes</div>
                <div className="mt-0.5 font-display text-[28px] font-bold leading-tight">{candidate.totalVotes.toLocaleString()}</div>
              </div>
            )}
            <div className="min-w-[150px] rounded-[14px] border border-line bg-white px-5 py-3.5">
              <div className="text-[13px] text-muted">Standing in</div>
              <div className="mt-0.5 font-display text-[28px] font-bold leading-tight">
                {standingIn.length} categor{standingIn.length === 1 ? 'y' : 'ies'}
              </div>
            </div>
          </div>

          {others.length > 0 && (
            // Hidden on a phone, so the vote card is what comes next.
            <div className="hidden md:block">
              <h2 className="mb-1.5 mt-12 font-display text-[26px] font-bold tracking-tight">Also in {categoryName(current)}</h2>
              <p className="mb-4 text-base text-muted">The other candidates in this category, each with their own code.</p>
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((o) => (
                  <Link key={o.slug} to={`/events/${slug}/candidates/${o.slug}`} className="flex items-center gap-3 rounded-[14px] border border-line bg-white p-3 text-ink hover:shadow-md">
                    <CandidatePhoto name={o.name} src={o.imageUrl} className="h-12 w-12 shrink-0 rounded-xl text-base" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold leading-snug">{o.name}</div>
                      <div className="mt-0.5 text-[13px] text-muted">
                        Code <strong className="text-sm text-ink">{pad(o.code)}</strong>
                        {showVotes && <> · {o.votes.toLocaleString()} {o.votes === 1 ? 'vote' : 'votes'}</>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* How: the code is the hero. */}
        <aside aria-label={`How to vote for ${candidate.name}`} className="w-full min-w-0 lg:sticky lg:top-6 lg:w-auto lg:min-w-[340px] lg:max-w-[460px] lg:flex-[0_1_460px]">
          <div className="rounded-[28px] bg-ink p-7 text-[#e8efeb] shadow-[0_24px_50px_rgba(16,32,27,0.22)]">
            <div className="text-[13px] font-bold uppercase tracking-[0.16em] text-accent">Vote for {candidate.name}</div>

            {closed ? (
              <p className="mt-4 text-base leading-relaxed">Voting in this election has closed. Thank you to everyone who took part.</p>
            ) : (
              <>
                {standingIn.length > 1 ? (
                  <>
                    <div className="mt-[18px] text-sm text-[#a9bbb3]">Which category are you voting in?</div>
                    <div role="radiogroup" aria-label="Category" className="mt-2.5 flex flex-col gap-2">
                      {standingIn.map((s, i) => {
                        const on = s.categoryId === current.categoryId
                        return (
                          <button
                            key={s.categoryId}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => setSel(i)}
                            className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-2.5 text-left text-white ${on ? 'border-accent bg-accent/10' : 'border-white/15 hover:bg-white/5'}`}
                          >
                            <span className={`h-5 w-5 shrink-0 rounded-full border-2 ${on ? 'border-accent bg-accent' : 'border-[#6f8a7f]'}`} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[15px] font-semibold leading-snug">{categoryName(s)}</span>
                              {showVotes && <span className="mt-0.5 block text-xs text-[#a9bbb3]">{s.votes.toLocaleString()} {s.votes === 1 ? 'vote' : 'votes'}</span>}
                            </span>
                            <span className="font-display text-lg font-bold text-accent">{pad(s.code)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="mt-[18px] text-[15px] text-[#c5d3cc]">{categoryName(current)}</div>
                )}

                <div className="mt-5 rounded-[22px] bg-accent px-[22px] py-[18px] text-center text-ink">
                  <div className="text-xs font-bold tracking-[0.18em]">CANDIDATE CODE</div>
                  <div aria-live="polite" className="mt-1.5 font-display text-[72px] font-bold leading-none tracking-[0.02em] md:text-[84px]">{pad(current.code)}</div>
                </div>

                <ol className="mt-[22px] flex flex-col gap-3.5">
                  <li className="flex items-center gap-3">
                    <span className={step}>1</span>
                    <span className="text-base">{dial ? <>Dial <strong className="text-xl text-white">{dial}</strong></> : 'Dial the short code'}</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className={step}>2</span>
                    <span className="text-base">Enter code <strong className="text-xl text-accent">{pad(current.code)}</strong></span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className={step}>3</span>
                    <span className="text-base">Confirm and approve the payment</span>
                  </li>
                </ol>

                {dial && (
                  <a href={`tel:${dial.replace(/#/g, '%23')}`} className="mt-[22px] flex min-h-[52px] items-center justify-center gap-2.5 rounded-[14px] bg-brand text-base font-bold !text-white hover:bg-brand-dark">
                    <Phone size={20} strokeWidth={2} aria-hidden="true" />
                    Tap to dial on this phone
                  </a>
                )}
              </>
            )}

            <div className="mt-[22px] flex justify-between gap-3 border-t border-white/15 pt-[18px]">
              <div>
                <div className="text-[13px] text-[#a9bbb3]">Price per vote</div>
                <div className="font-display text-[26px] font-bold text-white">{ghs(election.pricePerVote)}</div>
              </div>
              <div className="text-right">
                <div className="text-[13px] text-[#a9bbb3]">{closed ? 'Voting' : election.status === 'upcoming' ? 'Voting opens in' : 'Voting closes in'}</div>
                <div className="mt-1 text-lg font-bold">{closed ? 'Closed' : clock.replace(/^Voting (closes|opens) in /, '')}</div>
              </div>
            </div>
          </div>
          <p className="mx-1 mt-3.5 text-[13px] leading-relaxed text-muted">One paid vote per phone number in each category.</p>
        </aside>
      </div>
    </Section>
  )
}
