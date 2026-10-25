import { Copy } from 'lucide-react'
import { toast } from '../../store/toast'

// A read-only value with a Copy button, for things the super admin pastes somewhere else (Hubtel addresses, passwords).
export default function CopyField({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Copied', label)
    } catch {
      toast.error('Could not copy', 'Select the text and copy it by hand.')
    }
  }
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium">{label}</div>
      <div className="flex gap-2">
        <input
          readOnly
          aria-label={label}
          value={value}
          type={secret ? 'text' : 'text'}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-[46px] min-w-0 flex-1 rounded-[10px] border border-field bg-ground px-3.5 font-mono text-[13px] outline-none focus:border-brand"
        />
        <button type="button" onClick={copy} className="flex min-h-[46px] items-center gap-2 rounded-[10px] border border-field bg-white px-4 text-sm font-semibold hover:bg-ground">
          <Copy size={16} strokeWidth={1.8} aria-hidden="true" />
          Copy
        </button>
      </div>
    </div>
  )
}
