import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { EmptyState, LinkButton } from '../../components/ui'
import { useSeo } from '../../lib/useSeo'
import { Section } from '../../components/site/parts'

// Shown for an address that does not exist, or an election or candidate that is gone. Kept out of search results.
export default function SiteNotFound({ what = 'page' }: { what?: 'page' | 'election' | 'candidate' }) {
  useSeo({ title: 'Page not found | Tally', description: 'This page could not be found.', noindex: true })
  return (
    <Section className="py-20">
      <EmptyState icon={SearchX} title={`We could not find that ${what}`} action={<LinkButton to="/events">Browse elections</LinkButton>}>
        It may have been removed, or the address may be mistyped. <Link to="/" className="font-semibold text-brand hover:underline">Go to the home page</Link>.
      </EmptyState>
    </Section>
  )
}
