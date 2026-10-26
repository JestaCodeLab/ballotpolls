import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Loader2 } from 'lucide-react'
import { api, type Candidate, type Election, type Nomination } from '../lib/api'
import { Avatar, Button } from './ui'
import Modal from './Modal'
import { downloadFlyer, renderFlyer, type FlyerData } from '../lib/flyer'
import { codeLabel, ghs } from '../lib/format'
import { useAuth } from '../store/auth'
import { candidateShortUrl } from '../lib/site'

interface Props {
  nomination: Nomination
  categoryName: string
  election: Election
  shortcode?: string
  // Removing a candidate is only allowed before voting starts.
  canRemove: boolean
  onRemove: () => void
  onClose: () => void
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-4 border-t border-line py-2.5 text-sm first:border-t-0">
    <dt className="text-muted">{k}</dt>
    <dd className="text-right font-semibold">{v}</dd>
  </div>
)

// A candidate standing in a category of this election: who they are on the left, their flyer on the right.
export default function CandidateModal({ nomination: n, categoryName, election, shortcode, canRemove, onRemove, onClose }: Props) {
  const [bio, setBio] = useState<string | null>(null)
  const [flyer, setFlyer] = useState<{ blob: Blob; url: string } | null>(null)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const brand = useAuth((s) => s.user?.organisation?.brand)

  const data: FlyerData = {
    candidateName: n.candidate.name,
    photoUrl: n.candidate.imageUrl,
    number: n.code,
    categoryName,
    electionName: election.name,
    eventCode: election.eventCode,
    shortcode,
    price: election.pricePerVote,
    closesAt: election.endsAt,
    brand: brand ?? undefined,
    profileUrl: candidateShortUrl(n.id),
  }

  // The bio is not in the nominations list, so it is fetched when the window opens.
  useEffect(() => {
    let live = true
    api
      .get<Candidate>(`/candidates/${n.candidate.id}`)
      .then((r) => live && setBio(r.data.bio?.trim() || ''))
      .catch(() => live && setBio(''))
    return () => {
      live = false
    }
  }, [n.candidate.id])

  // The flyer is drawn once for the preview, and the same picture is what Download saves.
  useEffect(() => {
    let live = true
    let url = ''
    renderFlyer(data, 1)
      .then(async (preview) => {
        if (!live) return
        url = URL.createObjectURL(preview)
        setFlyer({ blob: preview, url })
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
    // The picture only depends on this nomination.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n.id])

  const save = async () => {
    setSaving(true)
    try {
      // The saved file is drawn at double size, so it stays sharp when shared.
      await downloadFlyer(data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={n.candidate.name}
      description={`${categoryName} · ${election.name}`}
      size="xl"
      onClose={onClose}
      footer={
        <>
          {canRemove && (
            <Button variant="secondary" onClick={onRemove} className="mr-auto text-danger">
              Remove from category
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={save} disabled={saving || failed} className="gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} strokeWidth={1.8} aria-hidden="true" />}
            Download flyer
          </Button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <section aria-label="Candidate details">
          <div className="flex items-center gap-4">
            <Avatar name={n.candidate.name} src={n.candidate.imageUrl} size={72} />
            <div className="min-w-0">
              <div className="font-display text-2xl font-bold leading-tight">{n.candidate.name}</div>
              <div className="mt-1 text-sm text-muted">{categoryName}</div>
            </div>
          </div>
          <dl className="mt-5">
            <Row k="Code" v={codeLabel(n.code)} />
            {election.status !== 'upcoming' && <Row k="Votes" v={n.voteCount.toLocaleString()} />}
            <Row k="Event code" v={election.eventCode} />
            <Row k="Price per vote" v={ghs(election.pricePerVote)} />
          </dl>
          <div className="mt-4">
            <div className="text-sm font-semibold">About</div>
            {bio === null ? (
              <div className="skeleton mt-2 h-4 w-3/4 rounded" />
            ) : bio ? (
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">{bio}</p>
            ) : (
              <p className="mt-1.5 text-sm text-muted">No bio added.</p>
            )}
          </div>
          <Link to={`/candidates/${n.candidate.id}`} className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
            Edit candidate
          </Link>
        </section>

        <section aria-label="Flyer preview">
          <div className="mb-2 text-sm font-semibold">Flyer</div>
          <div className="aspect-square w-full overflow-hidden rounded-[14px] border border-line bg-ground">
            {flyer ? (
              <img src={flyer.url} alt={`Flyer for ${n.candidate.name}`} className="h-full w-full object-contain" />
            ) : failed ? (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">The flyer could not be made. Try again in a moment.</div>
            ) : (
              <div role="status" className="skeleton h-full w-full">
                <span className="sr-only">Making the flyer…</span>
              </div>
            )}
          </div>
          <p className="mt-2 text-[13px] text-muted">Saved as a 1200 × 1200 picture, ready to share.</p>
        </section>
      </div>
    </Modal>
  )
}
