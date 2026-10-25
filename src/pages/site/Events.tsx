import { useEffect, useMemo, useState } from 'react'
import { Search, SearchX } from 'lucide-react'
import { api, type ElectionStatus, type PublicElection } from '../../lib/api'
import { useSeo } from '../../lib/useSeo'
import { absoluteUrl, ogImage } from '../../lib/site'
import { EmptyState } from '../../components/ui'
import Pagination from '../../components/Pagination'
import { usePaged } from '../../lib/usePaged'
import { EventCard, EventGridSkeleton, Section } from '../../components/site/parts'

type Filter = 'all' | ElectionStatus
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'closed', label: 'Closed' },
]

export default function Events() {
  const [items, setItems] = useState<PublicElection[] | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    api
      .get<PublicElection[]>('/public/elections')
      .then((r) => setItems(r.data))
      .catch(() => setItems([]))
  }, [])

  useSeo({
    title: 'Elections you can vote in by phone | BallotPolls',
    description: 'Find an election, see the candidates and learn how to vote. Dial the short code from any phone and pay with mobile money.',
    path: '/events',
    image: ogImage('events'),
    jsonLd: items?.length
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: items.slice(0, 30).map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.name, url: absoluteUrl(`/events/${e.slug}`) })),
        }
      : undefined,
  })

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (items ?? []).filter((e) => !q || e.name.toLowerCase().includes(q) || e.eventCode.toLowerCase().includes(q))
  }, [items, query])
  const count = (f: Filter) => (f === 'all' ? matches.length : matches.filter((e) => e.status === f).length)
  const shown = filter === 'all' ? matches : matches.filter((e) => e.status === filter)
  const paged = usePaged(shown, 12, [12, 24, 48])

  return (
    <>
      <div className="border-b border-line bg-white">
        <Section className="py-12 md:py-14">
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Elections</h1>
          <p className="mt-2.5 max-w-[620px] text-lg text-muted">Find an election, see the candidates, and learn how to vote.</p>
        </Section>
      </div>
      <Section className="pb-[72px] pt-10">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`min-h-11 rounded-full border px-5 text-[15px] font-semibold ${filter === f.key ? 'border-ink bg-ink text-white' : 'border-field bg-white hover:bg-ground'}`}
              >
                {f.label}
                {items ? ` (${count(f.key)})` : ''}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-80">
            <Search size={18} strokeWidth={1.8} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              aria-label="Search elections"
              placeholder="Search by name or code"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[46px] w-full rounded-[10px] border border-field bg-white pl-10 pr-3.5 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>
        {items === null ? (
          <EventGridSkeleton count={6} />
        ) : shown.length ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paged.pageItems.map((e) => (
                <EventCard key={e.slug} e={e} />
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-line bg-white">
              <Pagination {...paged.pagination} noun="elections" />
            </div>
          </>
        ) : (
          <EmptyState icon={SearchX} title={items.length ? 'No elections match' : 'No elections yet'}>
            {items.length ? 'Check the spelling, try another status, or search by the event code.' : 'Elections appear here once organisers publish them.'}
          </EmptyState>
        )}
      </Section>
    </>
  )
}
