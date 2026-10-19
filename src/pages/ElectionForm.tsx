import { useEffect, useState, type FormEvent } from 'react'
import ImagePicker from '../components/ImagePicker'
import ElectionCover from '../components/ElectionCover'
import { uploadToCloudinary } from '../lib/upload'
import { useNavigate, useParams } from 'react-router-dom'
import { api, errorMessage, type Election } from '../lib/api'
import { Banner, Button, Card, Input, LinkButton, PageHeader, Textarea } from '../components/ui'
import { formatDateTime, fromLocalInput, ghs, toLocalInput } from '../lib/format'
import { FormPageSkeleton } from '../components/Loading'
import { toast } from '../store/toast'
import DateTimeField from '../components/DateTimeField'
import { todayISO } from '../lib/datetime'
import { firstProblem } from '../lib/validate'

const PRESETS = [0.5, 1, 2, 5]

export default function ElectionForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [price, setPrice] = useState('1.00')
  const [status, setStatus] = useState<Election['status']>('upcoming')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // The cover already saved on the election, and a newly chosen one (cropped, not uploaded until Save).
  const [cover, setCover] = useState<{ url?: string; publicId?: string }>({})
  const [newCover, setNewCover] = useState<{ blob: Blob; preview: string } | null>(null)
  const [ready, setReady] = useState(!editing)

  useEffect(() => {
    if (!id) return
    api
      .get<Election>(`/elections/${id}`)
      .then(({ data: e }) => {
        setName(e.name)
        setDescription(e.description ?? '')
        setStartsAt(toLocalInput(e.startsAt))
        setEndsAt(toLocalInput(e.endsAt))
        setPrice(e.pricePerVote.toFixed(2))
        setStatus(e.status)
        setCover({ url: e.coverImageUrl, publicId: e.coverImagePublicId })
        setReady(true)
      })
      .catch((err) => { setError(errorMessage(err)); toast.fromError(err) })
  }, [id])

  useEffect(() => () => {
    if (newCover) URL.revokeObjectURL(newCover.preview)
  }, [newCover])

  const live = status === 'live'
  const closed = status === 'closed'
  const priceNum = Number(price)

  const windowNote = (() => {
    if (!startsAt || !endsAt) return null
    const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime()
    if (ms <= 0) return null
    const days = Math.floor(ms / 86_400_000)
    const hours = Math.floor((ms % 86_400_000) / 3_600_000)
    return `Voting runs for ${days ? `${days} day${days > 1 ? 's' : ''} ` : ''}${hours ? `${hours} hour${hours > 1 ? 's' : ''}` : days ? '' : 'under an hour'}. It closes by itself at the end time.`
  })()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = firstProblem([
      [name.trim().length < 2, 'Enter an election name'],
      [!startsAt, 'Choose when voting opens'],
      [!endsAt, 'Choose when voting closes'],
      [price.trim() === '' || Number.isNaN(priceNum), 'Enter a price per vote (use 0 for a free vote)'],
      [priceNum < 0, 'The price cannot be negative'],
      [!newCover && !cover.url, 'Add a cover image for the election'],
    ])
    if (problem) return toast.error(problem)
    if (new Date(endsAt) <= new Date(startsAt)) return toast.error('Voting must close after it opens')
    setBusy(true)
    try {
      // Upload a newly chosen cover first; otherwise keep the one already saved.
      let image = { coverImageUrl: cover.url, coverImagePublicId: cover.publicId }
      if (newCover) {
        const up = await uploadToCloudinary(newCover.blob, 'elections')
        image = { coverImageUrl: up.imageUrl, coverImagePublicId: up.imagePublicId }
      }
      const payload = {
        ...image,
        name,
        description: description || undefined,
        startsAt: fromLocalInput(startsAt),
        endsAt: fromLocalInput(endsAt),
        pricePerVote: priceNum,
      }
      if (editing) {
        await api.put(`/elections/${id}`, payload)
        toast.success('Changes saved')
        navigate(`/elections/${id}`)
      } else {
        const { data } = await api.post<Election>('/elections', payload)
        toast.success('Election created', 'Now set up its categories and candidates.')
        // The election page opens its setup window when it sees this.
        navigate(`/elections/${data.id}?setup=1`)
      }
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  if (!ready) return error ? <p className="text-muted">{error}</p> : <FormPageSkeleton />

  return (
    <>
      <PageHeader
        back={{ to: editing ? `/elections/${id}` : '/elections', label: editing ? 'Back to election' : 'Back to elections' }}
        title={editing ? 'Edit election' : 'New election'}
        subtitle={editing ? undefined : 'Set the basics now. You will add candidates to categories next.'}
      />
      {closed && <Banner>This election has closed and can no longer be edited.</Banner>}

      <form noValidate onSubmit={submit} className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-[320px] flex-[2] flex-col gap-5">
          <Card className="space-y-4">
            <h2 className="font-display text-xl font-bold">Basics</h2>
            <Input label="Election name" value={name} onChange={(e) => setName(e.target.value)} aria-required="true" maxLength={120} disabled={closed} />
            <Textarea label="Description" hint="(optional)" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} disabled={closed} />
          </Card>

          <Card className="space-y-4">
            <div>
              <h2 className="font-display text-xl font-bold">Cover image</h2>
              <p className="mt-1 text-sm text-muted">Shown on your dashboard and on the public election pages. Required.</p>
            </div>
            <ImagePicker
              src={newCover?.preview ?? cover.url}
              alt={name ? `Cover image for ${name}` : 'Election cover image'}
              aspect={16 / 9}
              output={{ width: 1600, height: 900 }}
              cropTitle="Crop cover image"
              shapeHint="16:9 landscape, cropped before upload"
              disabled={closed}
              onCropped={(blob) => setNewCover({ blob, preview: URL.createObjectURL(blob) })}
            />
          </Card>

          <Card className="space-y-4">
            <h2 className="font-display text-xl font-bold">Voting window</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <DateTimeField label="Voting opens" value={startsAt} onChange={setStartsAt} minDate={editing ? undefined : todayISO()} disabled={live || closed} />
              <DateTimeField label="Voting closes" value={endsAt} onChange={setEndsAt} minDate={startsAt ? startsAt.slice(0, 10) : editing ? undefined : todayISO()} disabled={closed} />
            </div>
            {live && <p className="text-sm text-muted">Voting has started, so only the closing time can move, and only later.</p>}
            {windowNote && <div className="rounded-[10px] bg-brand-tint px-3.5 py-3 text-sm leading-relaxed text-[#0b5a43]">{windowNote} Payments that started before then still count.</div>}
          </Card>

          <Card className="space-y-4">
            <h2 className="font-display text-xl font-bold">Price per vote</h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={live || closed}
                  aria-pressed={priceNum === p}
                  onClick={() => setPrice(p.toFixed(2))}
                  className={`min-h-11 rounded-[10px] border-2 px-[18px] text-sm font-semibold disabled:opacity-50 ${priceNum === p ? 'border-brand bg-brand-tint text-[#0b5a43]' : 'border-field bg-white'}`}
                >
                  {ghs(p)}
                </button>
              ))}
            </div>
            <div className="max-w-60">
              <Input label="Amount in GHS" type="number" min="0" step="0.10" value={price} onChange={(e) => setPrice(e.target.value)} aria-required="true" disabled={live || closed} />
            </div>
            <p className="text-[13px] leading-relaxed text-muted">The price is locked once voting opens. Each paid vote counts for one candidate in one category.</p>
          </Card>
        </div>

        <aside className="flex min-w-[280px] flex-1 flex-col gap-4">
          <div className="rounded-[14px] bg-ink p-6 text-[#e8efeb]">
            <ElectionCover src={newCover?.preview ?? cover.url} name={name || 'this election'} className="mb-5 aspect-video w-full rounded-lg" />
            <div className="text-[13px] text-[#a9bbb3]">Summary</div>
            <div className="mt-1.5 font-display text-2xl font-bold">{name || 'Untitled election'}</div>
            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
              <dt className="text-[#a9bbb3]">Opens</dt>
              <dd className="text-right">{startsAt ? formatDateTime(fromLocalInput(startsAt)) : '–'}</dd>
              <dt className="text-[#a9bbb3]">Closes</dt>
              <dd className="text-right">{endsAt ? formatDateTime(fromLocalInput(endsAt)) : '–'}</dd>
              <dt className="text-[#a9bbb3]">Price</dt>
              <dd className="text-right">{price !== '' ? `${ghs(priceNum)} per vote` : '–'}</dd>
              <dt className="text-[#a9bbb3]">Event code</dt>
              <dd className="text-right">
                <span className="rounded-md bg-accent px-2 py-0.5 font-bold text-ink">{editing ? 'Unchanged' : 'Made on save'}</span>
              </dd>
            </dl>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <LinkButton to={editing ? `/elections/${id}` : '/elections'} variant="secondary" className="min-h-12">
              Cancel
            </LinkButton>
            <Button type="submit" disabled={busy || closed} className="min-h-12 px-7">
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Create election'}
            </Button>
          </div>
        </aside>
      </form>
    </>
  )
}
