import { useState } from 'react'
import { FileSpreadsheet, ListPlus } from 'lucide-react'
import type { Category, Election } from '../lib/api'
import Modal from './Modal'
import { Button } from './ui'
import ImportCandidates, { type ImportResult } from './ImportCandidates'

interface Props {
  election: Election
  categories: Category[]
  onClose: () => void
  onImported: (result: ImportResult) => void
}

// Shown right after an election is created: bring everything in from a spreadsheet, or set the categories up by hand
// on the election page behind this window.
export default function ElectionSetupModal({ election, categories, onClose, onImported }: Props) {
  const [view, setView] = useState<'choose' | 'import'>('choose')

  if (view === 'import') return <ImportCandidates election={election} categories={categories} onClose={onClose} onBack={() => setView('choose')} onImported={onImported} />

  const option = 'flex w-full items-start gap-4 rounded-2xl border border-line bg-white p-5 text-left transition-colors hover:border-brand hover:bg-brand-tint/50 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:outline-none'
  return (
    <Modal
      title="Your election is ready"
      description={`How would you like to set up the categories and candidates for ${election.name}?`}
      onClose={onClose}
      footer={
        <>
          <span className="text-[13px] text-muted">You can do either of these later from the election page.</span>
          <Button variant="secondary" onClick={onClose}>
            Skip for now
          </Button>
        </>
      }
    >
      <div className="space-y-3 pb-4">
        <button type="button" onClick={() => setView('import')} className={option}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
            <FileSpreadsheet size={24} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span>
            <span className="block font-display text-lg font-bold">Import candidates and categories</span>
            <span className="mt-1 block text-sm leading-relaxed text-muted">Upload a spreadsheet. We create the categories and candidates and put everyone where they belong.</span>
          </span>
        </button>
        <button type="button" onClick={onClose} className={option}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e6ede9] text-ink">
            <ListPlus size={24} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span>
            <span className="block font-display text-lg font-bold">Create categories</span>
            <span className="mt-1 block text-sm leading-relaxed text-muted">Set up the categories yourself, or pick ones you already have. Then add candidates one by one, from your library, or by pasting a list.</span>
          </span>
        </button>
      </div>
    </Modal>
  )
}
