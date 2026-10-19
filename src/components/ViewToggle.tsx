import { LayoutGrid, List } from 'lucide-react'
import type { ViewMode } from '../lib/useViewMode'

const options: { mode: ViewMode; label: string; Icon: typeof List }[] = [
  { mode: 'cards', label: 'Card view', Icon: LayoutGrid },
  { mode: 'table', label: 'Table view', Icon: List },
]

// Two icon buttons that switch a list between cards and a table.
export default function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div role="group" aria-label="View" className="inline-flex shrink-0 rounded-[10px] border border-field bg-white p-0.5">
      {options.map(({ mode, label, Icon }) => (
        <button
          key={mode}
          type="button"
          aria-pressed={value === mode}
          aria-label={label}
          title={label}
          onClick={() => onChange(mode)}
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${value === mode ? 'bg-ink text-white' : 'text-muted hover:bg-ground hover:text-ink'}`}
        >
          <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
