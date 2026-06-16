import { supabase } from './supabaseClient'

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp']

const COMMUNITY_IMAGE_BUCKET = 'community-images'

export const STORAGE_BUCKET = COMMUNITY_IMAGE_BUCKET
export const STORAGE_FOLDERS = {
  profiles: 'profiles',
  players: 'players',
  news: 'news',
  ads: 'ads',
  ptm: 'ptm',
}

export const STORAGE_BUCKETS = {
  avatar: COMMUNITY_IMAGE_BUCKET,
  player: COMMUNITY_IMAGE_BUCKET,
  ptm: COMMUNITY_IMAGE_BUCKET,
  ptmActivity: COMMUNITY_IMAGE_BUCKET,
  news: COMMUNITY_IMAGE_BUCKET,
  ads: COMMUNITY_IMAGE_BUCKET,
}

// community-images is the current working bucket. Keep reading old full URLs
// from player-photos or other buckets, but store new paths under these folders.
export function buildStoragePath(folder, ...parts) {
  const safeFolder = STORAGE_FOLDERS[folder] || String(folder || 'uploads')
  const safeParts = parts
    .filter((part) => part !== undefined && part !== null && String(part).trim() !== '')
    .map((part) => String(part).replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9/_-]+/g, '-'))
  return [safeFolder, ...safeParts].join('/')
}

export function getImageUrl(value, bucket = COMMUNITY_IMAGE_BUCKET) {
  const raw = String(value || '').trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^(data|blob):/i.test(raw)) return raw
  if (!supabase) return null

  const path = raw
    .replace(/^\/+/, '')
    .replace(new RegExp(`^${bucket}/`, 'i'), '')

  if (!path || /^javascript:/i.test(path)) return null

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data?.publicUrl || null
}

export function validateImageFile(file) {
  if (!file) return 'Pilih file gambar terlebih dahulu.'
  if (!ALLOWED_IMAGE_MIME.includes(file.type)) {
    return 'File harus berupa JPG, PNG, atau WEBP.'
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return 'Ukuran file maksimal 2MB.'
  }
  return ''
}

export function sanitizeFileName(fileName = 'image.jpg') {
  const parts = String(fileName).toLowerCase().split('.')
  const extension = parts.length > 1 ? parts.pop() : 'jpg'
  const base = parts.join('.') || 'image'
  const safeBase = base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'image'
  return `${safeBase}.${extension}`
}

export async function uploadImage({ bucket, pathPrefix, file }) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')

  const validationError = validateImageFile(file)
  if (validationError) throw new Error(validationError)

  const prefix = String(pathPrefix || 'uploads').replace(/^\/+|\/+$/g, '')
  const fileName = `${Date.now()}-${sanitizeFileName(file.name)}`
  const path = `${prefix}/${fileName}`

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  })

  if (error) throw error

  const publicResult = supabase.storage.from(bucket).getPublicUrl(data.path)
  return {
    path: data.path,
    publicUrl: publicResult.data.publicUrl,
  }
}
