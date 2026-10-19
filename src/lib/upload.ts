import axios from 'axios'
import { api } from './api'

interface Signature {
  cloudName: string
  apiKey: string
  timestamp: number
  folder: string
  signature: string
}

// Signed upload straight to Cloudinary: the secret never leaves the server.
export async function uploadToCloudinary(blob: Blob, kind: 'candidates' | 'elections' = 'candidates') {
  const { data: s } = await api.post<Signature>('/uploads/signature', { kind })
  const form = new FormData()
  form.append('file', blob)
  form.append('api_key', s.apiKey)
  form.append('timestamp', String(s.timestamp))
  form.append('folder', s.folder)
  form.append('signature', s.signature)
  const res = await axios.post<{ secure_url: string; public_id: string }>(
    `https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`,
    form,
  )
  return { imageUrl: res.data.secure_url, imagePublicId: res.data.public_id }
}
