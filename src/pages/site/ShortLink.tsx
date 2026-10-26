import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useSeo } from '../../lib/useSeo'
import { Section } from '../../components/site/parts'
import SiteNotFound from './SiteNotFound'

// What a flyer's QR code opens: /v/<nomination id>. It finds the candidate's page and goes there, replacing itself in the
// history so Back does not land here again.
export default function ShortLink() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [missing, setMissing] = useState(false)
  useSeo({ title: 'Opening candidate | BallotPolls', description: 'Opening the candidate page.', noindex: true })

  useEffect(() => {
    let live = true
    api
      .get<{ election: string; candidate: string }>(`/public/nominations/${encodeURIComponent(id)}`)
      .then((r) => live && navigate(`/events/${r.data.election}/candidates/${r.data.candidate}`, { replace: true }))
      .catch(() => live && setMissing(true))
    return () => {
      live = false
    }
  }, [id, navigate])

  if (missing) return <SiteNotFound what="candidate" />
  return (
    <Section className="py-10">
      <div role="status" aria-label="Opening candidate" className="flex flex-wrap gap-8">
        <div className="skeleton aspect-square w-[200px] max-w-full rounded-[28px]" />
        <div className="skeleton h-12 w-80 rounded-lg" />
      </div>
    </Section>
  )
}
