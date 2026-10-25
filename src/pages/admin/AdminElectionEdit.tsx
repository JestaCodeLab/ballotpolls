import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, errorMessage, type AdminElectionDetail } from '../../lib/api'
import { Button, Card, Input, LinkButton, PageHeader, Textarea } from '../../components/ui'
import ElectionCover from '../../components/ElectionCover'
import DateTimeField from '../../components/DateTimeField'
import { FormPageSkeleton } from '../../components/Loading'
import { confirmDelete } from '../../store/confirm'
import { toast } from '../../store/toast'
import { fromLocalInput, toLocalInput } from '../../lib/format'
import { firstProblem } from '../../lib/validate'

export default function AdminElectionEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [el, setEl] = useState<AdminElectionDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .get<AdminElectionDetail>(`/admin/elections/${id}`)
      .then(({ data }) => {
        setEl(data)
        setName(data.name)
        setDescription(data.description)
        setStartsAt(toLocalInput(data.startsAt))
        setEndsAt(toLocalInput(data.endsAt))
        setPrice(data.pricePerVote.toFixed(2))
      })
      .catch((e) => setError(errorMessage(e)))
  }, [id])

  if (error) return <p className="text-muted">{error}</p>
  if (!el) return <FormPageSkeleton />

  const back = `/admin/elections/${el.id}`
  const priceNum = Number(price)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = firstProblem([
      [name.trim().length < 2, 'Enter an election name'],
      [!startsAt, 'Choose when voting opens'],
      [!endsAt, 'Choose when voting closes'],
      [price.trim() === '' || Number.isNaN(priceNum) || priceNum < 0, 'Enter a price per vote (use 0 for a free vote)'],
    ])
    if (problem) return toast.error(problem)
    if (new Date(endsAt) <= new Date(startsAt)) return toast.error('Voting must close after it opens')
    setBusy(true)
    try {
      await api.put(`/admin/elections/${id}`, { name, description: description || undefined, startsAt: fromLocalInput(startsAt), endsAt: fromLocalInput(endsAt), pricePerVote: priceNum })
      toast.success('Changes saved')
      navigate(back)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!(await confirmDelete({ title: `Delete ${el.name}?`, message: `This permanently removes the election, its nominations and its event code ${el.eventCode}. The organisation is told by notification. This cannot be undone.`, confirmLabel: 'Delete election' }))) return
    try {
      await api.delete(`/admin/elections/${id}`)
      toast.success('Election deleted')
      // Its own page is gone, so go to the organisation's.
      navigate(el.organisation ? `/admin/organisations/${el.organisation.id}` : '/admin/elections')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <>
      <PageHeader back={{ to: back, label: 'Back to election' }} title="Edit election" subtitle={`${el.name}${el.organisation ? ` · ${el.organisation.name}` : ''}`} />

      <form onSubmit={submit} noValidate className="grid items-start gap-5 lg:grid-cols-3">
        <Card className="space-y-5 lg:col-span-2">
          <h2 className="font-display text-xl font-bold">Election details</h2>
          <Input label="Election name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          <Textarea label="Description" rows={4} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <DateTimeField label="Voting opens" value={startsAt} onChange={setStartsAt} disabled={el.locked} />
            <DateTimeField label="Voting closes" value={endsAt} onChange={setEndsAt} minDate={startsAt.split('T')[0] || undefined} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Price per vote" hint="(GHS)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} disabled={el.locked} />
            <Input label="Event code" hint="(cannot be changed)" value={el.eventCode} disabled readOnly />
          </div>
          <p className="-mt-2 text-[13px] text-muted">
            {el.locked ? 'Payments exist for this election, so the price and opening time are locked.' : 'No payments yet, so everything can be changed. Once voters pay, the price and opening time are locked.'}
          </p>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-3.5 p-5">
            <h2 className="font-display text-xl font-bold">Cover image</h2>
            <ElectionCover src={el.coverImageUrl} name={el.name} className="aspect-video w-full rounded-[10px]" />
            <p className="text-[13px] text-muted">Shown on the dashboard and the public pages. The organiser changes it from their own dashboard.</p>
          </Card>
          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <Button type="button" variant="secondary" disabled={el.locked} title={el.locked ? 'It has payments, so it cannot be deleted.' : undefined} onClick={remove} className="text-danger">
              Delete election
            </Button>
            <div className="flex flex-wrap justify-end gap-2.5">
              <LinkButton to={back} variant="secondary">
                Cancel
              </LinkButton>
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </>
  )
}
