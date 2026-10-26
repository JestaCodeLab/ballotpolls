import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, errorMessage, type AdminOrganisation } from '../../lib/api'
import { Button, Card, Input, LinkButton, PageHeader, Select, Textarea } from '../../components/ui'
import DateTimeField from '../../components/DateTimeField'
import { toast } from '../../store/toast'
import { fromLocalInput } from '../../lib/format'
import { firstProblem } from '../../lib/validate'

// A super admin creating an election on an organisation's behalf. The organiser adds the cover image from their own dashboard.
export default function AdminElectionNew() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [orgs, setOrgs] = useState<AdminOrganisation[] | null>(null)
  const [orgId, setOrgId] = useState(params.get('org') ?? '')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [price, setPrice] = useState('1.00')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .get<{ items: AdminOrganisation[] }>('/admin/organisations', { params: { pageSize: 100 } })
      .then((r) => setOrgs(r.data.items))
      .catch((e) => toast.error(errorMessage(e)))
  }, [])

  const priceNum = Number(price)
  const back = params.get('org') ? `/admin/organisations/${params.get('org')}` : '/admin/elections'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = firstProblem([
      [!orgId, 'Choose the organisation this election is for'],
      [name.trim().length < 2, 'Enter an election name'],
      [!startsAt, 'Choose when voting opens'],
      [!endsAt, 'Choose when voting closes'],
      [price.trim() === '' || Number.isNaN(priceNum) || priceNum < 0, 'Enter a price per vote (use 0 for a free vote)'],
    ])
    if (problem) return toast.error(problem)
    if (new Date(endsAt) <= new Date(startsAt)) return toast.error('Voting must close after it opens')
    setBusy(true)
    try {
      const { data } = await api.post<{ id: string }>(`/admin/organisations/${orgId}/elections`, {
        name,
        description: description || undefined,
        startsAt: fromLocalInput(startsAt),
        endsAt: fromLocalInput(endsAt),
        pricePerVote: priceNum,
      })
      toast.success('Election created', 'Now add its categories and candidates.')
      navigate(`/admin/elections/${data.id}?tab=candidates`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader back={{ to: back, label: 'Back' }} title="New election" subtitle="Create an election for an organisation. You will add its categories and candidates next." />
      <form onSubmit={submit} noValidate className="max-w-3xl">
        <Card className="space-y-5">
          <Select
            label="Organisation"
            value={orgId}
            onChange={setOrgId}
            placeholder={orgs ? 'Choose an organisation' : 'Loading…'}
            options={(orgs ?? []).map((o) => ({ value: o.id, label: o.name }))}
          />
          <Input label="Election name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          <Textarea label="Description" rows={4} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <DateTimeField label="Voting opens" value={startsAt} onChange={setStartsAt} />
            <DateTimeField label="Voting closes" value={endsAt} onChange={setEndsAt} minDate={startsAt.split('T')[0] || undefined} />
          </div>
          <Input label="Price per vote" hint="(GHS)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          <p className="-mt-2 text-[13px] text-muted">The organisation is notified. The event code is made for you, and the organiser adds the cover image from their dashboard.</p>
          <div className="flex flex-wrap justify-end gap-2.5">
            <LinkButton to={back} variant="secondary">
              Cancel
            </LinkButton>
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create election'}
            </Button>
          </div>
        </Card>
      </form>
    </>
  )
}
