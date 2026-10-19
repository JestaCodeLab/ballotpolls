import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import ImageCropper, { type CropOutput } from './ImageCropper'
import { Button } from './ui'
import { toast } from '../store/toast'

const MAX_FILE_MB = 10

interface Props {
  // The picture shown now: one already saved, or the cropped one just chosen.
  src?: string
  alt: string
  // Called with the cropped picture when the person confirms a crop.
  onCropped: (blob: Blob) => void
  // Width divided by height of the frame, e.g. 16 / 9.
  aspect: number
  output: CropOutput
  cropTitle: string
  // Short description of the frame shown inside the zone, e.g. "16:9 landscape".
  shapeHint: string
  disabled?: boolean
}

// A drag-and-drop zone for one picture: drop a file or press the button, crop it to the frame, and it is handed back.
// The zone is a <label> around the file input, so a click anywhere in it opens the picker and the keyboard can reach it.
export default function ImagePicker({ src, alt, onCropped, aspect, output, cropTitle, shapeHint, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  useEffect(() => () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
  }, [cropSrc])

  const handleFile = (file: File | undefined) => {
    if (!file || disabled) return
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file')
    if (file.size > MAX_FILE_MB * 1024 * 1024) return toast.error(`Image must be under ${MAX_FILE_MB} MB`)
    setCropSrc(URL.createObjectURL(file))
  }

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    handleFile(file)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        } ${dragging ? 'border-brand bg-brand-tint' : 'border-field bg-ground hover:border-brand hover:bg-brand-tint/60'}`}
        style={{ aspectRatio: String(aspect) }}
      >
        <input ref={fileRef} type="file" accept="image/*" onChange={onPick} disabled={disabled} className="sr-only" aria-label={src ? 'Replace image' : 'Choose image'} />
        {src ? (
          <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 px-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand shadow-sm">
              <ImagePlus size={26} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="text-[15px] font-semibold">{dragging ? 'Drop to upload' : 'Drag and drop an image here'}</span>
            <span className="text-[13px] text-muted">
              JPG, PNG or WebP · up to {MAX_FILE_MB} MB · {shapeHint}
            </span>
          </span>
        )}
        {src && dragging && (
          <span className="absolute inset-0 flex items-center justify-center bg-brand-tint/90 text-[15px] font-semibold text-[#0b5a43]">Drop to replace</span>
        )}
      </label>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Button type="button" variant="secondary" disabled={disabled} onClick={() => fileRef.current?.click()}>
          {src ? 'Replace image' : 'Choose image'}
        </Button>
        {src && (
          <span className="text-[13px] text-muted">
            JPG, PNG or WebP · up to {MAX_FILE_MB} MB · {shapeHint}
          </span>
        )}
      </div>

      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          aspect={aspect}
          output={output}
          title={cropTitle}
          onCancel={() => setCropSrc(null)}
          onDone={(blob) => {
            setCropSrc(null)
            onCropped(blob)
          }}
        />
      )}
    </div>
  )
}
