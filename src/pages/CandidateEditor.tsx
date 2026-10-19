import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ImagePlus } from 'lucide-react'
import { api, errorMessage, type Candidate } from '../lib/api'
import ImageCropper from '../components/ImageCropper'
import { uploadToCloudinary } from '../lib/upload'
import { Button, Card, Input, LinkButton, PageHeader, Textarea } from '../components/ui'
import { FormPageSkeleton } from '../components/Loading'
import { toast } from '../store/toast'
import { confirmDelete } from '../store/confirm'
import { firstProblem } from '../lib/validate'

const MAX_FILE_MB = 10

export default function CandidateEditor() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [existing, setExisting] = useState<Pick<Candidate, 'imageUrl' | 'imagePublicId'>>({})
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [newBlob, setNewBlob] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [ready, setReady] = useState(!editing)

  useEffect(() => {
    if (!id) return
    api
      .get<Candidate>(`/candidates/${id}`)
      .then(({ data }) => {
        setName(data.name)
        setBio(data.bio ?? '')
        setExisting({ imageUrl: data.imageUrl, imagePublicId: data.imagePublicId })
        setReady(true)
      })
      .catch((e) => { setError(errorMessage(e)); toast.fromError(e) })
  }, [id])

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file')
    if (file.size > MAX_FILE_MB * 1024 * 1024) return toast.error(`Image must be under ${MAX_FILE_MB} MB`)
    setCropSrc(URL.createObjectURL(file))
  }

  const pickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    handleFile(file)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  const cropped = (blob: Blob) => {
    setNewBlob(blob)
    setPreview(URL.createObjectURL(blob))
    setRemoveImage(false)
    closeCrop()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = firstProblem([
      [name.trim().length < 2, "Enter the candidate's full name"],
    ])
    if (problem) return toast.error(problem)
    setBusy(true)
    try {
      let image: { imageUrl?: string; imagePublicId?: string } = removeImage ? {} : existing
      if (newBlob) image = await uploadToCloudinary(newBlob)
      const payload = { name, bio: bio || undefined, ...image }
      if (editing) await api.put(`/candidates/${id}`, payload)
      else await api.post('/candidates', payload)
      toast.success(editing ? 'Candidate updated' : 'Candidate added', name)
      navigate('/candidates')
    } catch (err) {
      toast.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    const ok = await confirmDelete({
      title: `Delete ${name}?`,
      message: 'This also removes them from elections that have not started. This cannot be undone.',
      confirmLabel: 'Delete candidate',
    })
    if (!ok) return
    try {
      await api.delete(`/candidates/${id}`)
      toast.success('Candidate deleted', name)
      navigate('/candidates')
    } catch (err) {
      toast.fromError(err)
    }
  }

  if (!ready) return error ? <p className="text-muted">{error}</p> : <FormPageSkeleton />

  const shownImage = preview ?? (removeImage ? undefined : existing.imageUrl)

  return (
    <>
      <PageHeader back={{ to: '/candidates', label: 'Back to candidates' }} title={editing ? 'Edit candidate' : 'Add candidate'} />
      <form noValidate onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-5">
        <Card className="space-y-[18px] lg:col-span-3">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} aria-required="true" maxLength={100} />
          <Textarea label="Short bio" hint="(optional)" rows={5} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} />
          <p className="rounded-[10px] bg-ground px-4 py-3.5 text-sm leading-relaxed text-muted">
            Categories are assigned per election. The same candidate can be nominated in several categories.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy} className="min-h-[46px] px-6">
              {busy ? 'Saving…' : 'Save candidate'}
            </Button>
            <LinkButton to="/candidates" variant="secondary" className="min-h-[46px]">
              Cancel
            </LinkButton>
            {editing && (
              <Button type="button" variant="danger" onClick={remove} className="ml-auto">
                Delete
              </Button>
            )}
          </div>
        </Card>

        <Card className="space-y-4 lg:col-span-2">
          <div>
            <h2 className="font-display text-xl font-bold">Photo</h2>
            <p className="mt-1 text-sm text-muted">Shown next to the candidate in elections and results.</p>
          </div>

          {/* A <label> around the file input, so a click anywhere in the zone opens the picker and the keyboard can reach it. */}
          <label
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex min-h-[220px] w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-colors focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 ${dragging ? 'border-brand bg-brand-tint' : 'border-field bg-ground hover:border-brand hover:bg-brand-tint/60'
              }`}
          >
            <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="sr-only" aria-label={shownImage ? 'Replace photo' : 'Choose photo'} />
            <span className={`flex items-center gap-5 ${shownImage ? 'flex-col sm:flex-row' : 'flex-col text-center'}`}>
              {shownImage ? (
                <img src={shownImage} alt={name ? `Photo of ${name}` : 'Candidate photo'} className="h-36 w-36 shrink-0 rounded-xl border border-line object-cover" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand shadow-sm">
                  <ImagePlus size={26} strokeWidth={1.8} aria-hidden="true" />
                </span>
              )}
              <span className={`flex flex-col gap-1.5 ${shownImage ? 'items-center text-center sm:items-start sm:text-left' : 'items-center'}`}>
                <span className="text-[15px] font-semibold">
                  {dragging ? 'Drop to upload' : shownImage ? 'Drag and drop a new photo to replace it' : 'Drag and drop a photo here'}
                </span>
                <span className="text-[13px] text-muted">JPG, PNG or WebP | Max file size: {MAX_FILE_MB} MB</span>
              </span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
              {shownImage ? 'Replace photo' : 'Choose photo'}
            </Button>
            {shownImage && (
              <button
                type="button"
                onClick={() => {
                  setRemoveImage(true)
                  setNewBlob(null)
                  setPreview(null)
                }}
                className="min-h-11 px-1 text-sm font-semibold text-danger hover:underline"
              >
                Remove photo
              </button>
            )}
          </div>
        </Card>
      </form>
      {cropSrc && <ImageCropper src={cropSrc} onCancel={closeCrop} onDone={cropped} />}
    </>
  )
}
