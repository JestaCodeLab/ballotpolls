import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Candidate, type Category, type Election } from '../lib/api'
import { useAuth } from '../store/auth'
import { CalendarDays, Radio, Users, Vote } from 'lucide-react'
import { Card, EmptyState, LinkButton, PageHeader, StatusChip } from '../components/ui'
import { formatDateTime, ghs } from '../lib/format'
import { toast } from '../store/toast'
import { Loading, Skeleton } from '../components/Loading'
import ElectionCover from '../components/ElectionCover'

export default function Overview() {
  const user = useAuth((s) => s.user)
  const [elections, setElections] = useState<Election[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<Election[]>('/elections'),
      api.get<Candidate[]>('/candidates'),
      api.get<Category[]>('/categories'),
    ])
      .then(([e, c, k]) => {
        setElections(e.data)
        setCandidates(c.data)
        setCategories(k.data)
      })
      .catch((err) => toast.fromError(err))
      .finally(() => setLoaded(true))
  }, [])

  const live = elections.filter((e) => e.status === 'live')
  const totalVotes = elections.reduce((s, e) => s + (e.totalVotes ?? 0), 0)
  const firstName = user?.firstName

  const steps = [
    { label: 'Create categories', done: categories.length > 0, to: '/categories' },
    { label: 'Add candidates', done: candidates.length > 0, to: '/candidates/new' },
    { label: 'Create an election and set the price', done: elections.length > 0, to: '/elections/new' },
    { label: 'Assign candidates to categories', done: elections.some((e) => (e.candidateCount ?? 0) > 0), to: '/elections' },
  ]

  const stats = [
    { label: 'Votes cast', value: totalVotes.toLocaleString(), icon: Vote },
    { label: 'Live elections', value: String(live.length), icon: Radio },
    { label: 'Elections', value: String(elections.length), icon: CalendarDays },
    { label: 'Candidates', value: String(candidates.length), icon: Users },
  ]

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        subtitle={live.length ? `${live.length} election${live.length > 1 ? 's are' : ' is'} live.` : 'No election is live right now.'}
        action={
          <div className="flex flex-wrap gap-3">
            <LinkButton to="/withdrawals" variant="secondary">Withdraw funds</LinkButton>
            <LinkButton to="/elections/new">New election</LinkButton>
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm text-muted">{s.label}</div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                <s.icon size={20} strokeWidth={1.8} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-1 font-display text-3xl font-bold tracking-tight">{loaded ? s.value : <Skeleton className="mt-1 h-9 w-20" />}</div>
          </Card>
        ))}
      </section>

      <section className="grid items-start gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-display text-xl font-bold">{live.length ? 'Live now' : 'Latest elections'}</h2>
          {!loaded && (
            <Loading label="Loading elections">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center justify-between gap-3 border-t border-line py-3.5 first:border-t-0">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-56" />
                    <Skeleton className="h-4 w-72 max-w-full" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </Loading>
          )}
          {(live.length ? live : elections.slice(0, 3)).map((e) => (
            <Link key={e.id} to={`/elections/${e.id}`} className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-3.5 first:border-t-0 hover:bg-ground/60">
              <ElectionCover src={e.coverImageUrl} name={e.name} className="h-12 w-[85px] rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 font-semibold">
                  {e.name} <StatusChip status={e.status} />
                </div>
                <div className="text-sm text-muted">
                  Closes {formatDateTime(e.endsAt)} · {ghs(e.pricePerVote)} per vote · code {e.eventCode}
                </div>
              </div>
              <div className="text-sm font-semibold">{(e.totalVotes ?? 0).toLocaleString()} votes</div>
            </Link>
          ))}
          {loaded && elections.length === 0 && (
            <EmptyState size="sm" icon={CalendarDays} title="No elections yet" action={<LinkButton to="/elections/new" variant="secondary">Create an election</LinkButton>}>
              Your latest elections will show up here.
            </EmptyState>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-lg font-bold">Set-up checklist</h2>
          {!loaded && (
            <Loading label="Loading checklist">
              <div className="space-y-3.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-[22px] w-[22px] shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-48 max-w-full" />
                  </div>
                ))}
              </div>
            </Loading>
          )}
          <ul className={`space-y-3.5 ${loaded ? '' : 'hidden'}`}>
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3 text-[15px]">
                <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${s.done ? 'border-brand bg-brand' : 'border-field'}`}>
                  {s.done && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                  )}
                </span>
                {s.done ? <span className="text-muted">{s.label}</span> : <Link to={s.to} className="hover:underline">{s.label}</Link>}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </>
  )
}
