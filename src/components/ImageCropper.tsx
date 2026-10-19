import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Button } from './ui'
import { toast } from '../store/toast'

export interface CropOutput {
  width: number
  height: number
}

const SQUARE: CropOutput = { width: 800, height: 800 }

// Draws the chosen area to a canvas of the output size and returns it as a JPEG blob.
async function cropToBlob(src: string, area: Area, out: CropOutput): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Could not read the image'))
    i.src = src
  })
  const canvas = document.createElement('canvas')
  canvas.width = out.width
  canvas.height = out.height
  canvas.getContext('2d')!.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, out.width, out.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not crop the image'))), 'image/jpeg', 0.9),
  )
}

export default function ImageCropper({
  src,
  onCancel,
  onDone,
  aspect = 1,
  output = SQUARE,
  title = 'Crop photo',
}: {
  src: string
  onCancel: () => void
  onDone: (blob: Blob) => void
  // Width divided by height of the crop frame: 1 for a square, 16 / 9 for a cover.
  aspect?: number
  // The size of the picture that is uploaded.
  output?: CropOutput
  title?: string
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)

  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), [])

  const confirm = async () => {
    if (!area) return
    setBusy(true)
    try {
      onDone(await cropToBlob(src, area, output))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Crop failed')
      setBusy(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <div className="relative mt-4 h-80 overflow-hidden rounded-xl bg-[#0e1a16]">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onComplete}
          />
        </div>
        <div className="mt-4 flex items-center gap-3.5">
          <label htmlFor="zoom" className="text-sm font-medium">
            Zoom
          </label>
          <input id="zoom" type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="min-h-11 flex-1 accent-brand" />
          <span className="w-10 text-right text-sm text-muted">{zoom.toFixed(1)}x</span>
        </div>
        <p className="mt-1 text-[13px] text-muted">Drag to reposition. Only the cropped area is uploaded, at {output.width} by {output.height} pixels.</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={busy || !area}>
            {busy ? 'Cropping…' : 'Use this crop'}
          </Button>
        </div>
      </div>
    </div>
  )
}
