import { useEffect, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import type { AdminElectionDetail, Nomination } from '../../lib/api'
import { Button } from '../ui'
import Modal from '../Modal'
import { downloadFlyer, renderFlyer, type FlyerData } from '../../lib/flyer'
import { candidateShortUrl } from '../../lib/site'

// The flyer for one candidate in one category, as the organiser would download it: this organisation's colours and USSD
// code, the candidate's code and a QR code to their page. A super admin can look at it and save it.
export const adminFlyerData = (e: AdminElectionDetail, n: Nomination, categoryName: string): FlyerData => ({
  candidateName: n.candidate.name,
  photoUrl: n.candidate.imageUrl,
  number: n.code,
  categoryName,
  electionName: e.name,
  eventCode: e.eventCode,
  shortcode: e.shortcode ?? undefined,
  price: e.pricePerVote,
  closesAt: e.endsAt,
  brand: e.brand ?? undefined,
  profileUrl: candidateShortUrl(n.id),
})

export default function FlyerModal({ election, nomination, categoryName, onClose }: { election: AdminElectionDetail; nomination: Nomination; categoryName: string; onClose: () => void }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const data = adminFlyerData(election, nomination, categoryName)

  // Drawn once at preview size when the window opens.
  useEffect(() => {
    let live = true
    let url = ''
    renderFlyer(data, 1.5)
      .then((blob) => {
        if (!live) return
        url = URL.createObjectURL(blob)
        setPreview(url)
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
    // The picture depends only on this nomination.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomination.id])

  const save = async () => {
    setSaving(true)
    try {
      await downloadFlyer(data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Flyer: ${nomination.candidate.name}`}
      description={`${categoryName} · ${election.name}${election.organisation ? ` · ${election.organisation.name}` : ''}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
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
      <div className="mx-auto aspect-square w-full max-w-[560px] overflow-hidden rounded-[14px] border border-line bg-ground">
        {preview ? (
          <img src={preview} alt={`Flyer for ${nomination.candidate.name}`} className="h-full w-full object-contain" />
        ) : failed ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">The flyer could not be made. Try again in a moment.</div>
        ) : (
          <div role="status" className="skeleton h-full w-full">
            <span className="sr-only">Making the flyer…</span>
          </div>
        )}
      </div>
      {!election.shortcode && <p className="mt-3 text-center text-[13px] text-muted">{election.organisation?.name ?? 'This organisation'} has no USSD code yet, so the flyer says "Dial the short code".</p>}
      <p className="mt-2 text-center text-[13px] text-muted">Saved as a 1200 × 1200 picture, in the organisation's own colours.</p>
    </Modal>
  )
}
