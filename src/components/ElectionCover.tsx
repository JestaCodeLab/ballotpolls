import { Vote } from 'lucide-react'

// An election's cover picture at whatever size the page needs. Elections made before covers existed have none,
// so a quiet placeholder stands in. Pass the size and shape with className, e.g. "h-16 w-28 rounded-lg".
export default function ElectionCover({ src, name, className = '' }: { src?: string; name: string; className?: string }) {
  return src ? (
    <img src={src} alt={`Cover image for ${name}`} loading="lazy" className={`shrink-0 bg-[#e6ede9] object-cover ${className}`} />
  ) : (
    <div role="img" aria-label={`No cover image for ${name}`} className={`flex shrink-0 items-center justify-center bg-[#e6ede9] text-ink/35 ${className}`}>
      <Vote size={22} strokeWidth={1.6} aria-hidden="true" />
    </div>
  )
}
