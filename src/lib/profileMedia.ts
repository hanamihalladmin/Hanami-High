import { supabase } from './supabase'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const extensionByType: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const PROFILE_MEDIA_BUCKET = 'profile-media'
export const PROFILE_MEDIA_MAX_BYTES = 5 * 1024 * 1024

export function validateProfileImage(file: File) {
  if (!allowedTypes.has(file.type)) {
    throw new Error('Use a JPEG, PNG, WebP, or GIF image.')
  }
  if (file.size > PROFILE_MEDIA_MAX_BYTES) {
    throw new Error('Profile images must be 5 MB or smaller.')
  }
}

export async function uploadProfileImage(
  accountId: string,
  characterId: string,
  kind: string,
  file: File,
): Promise<{ path: string; url: string }> {
  const client = supabase
  if (!client) throw new Error('Supabase is not configured.')
  validateProfileImage(file)

  const safeKind = kind.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'image'
  const extension = extensionByType[file.type] ?? 'img'
  const path = `${accountId}/${characterId}/${safeKind}/${crypto.randomUUID()}.${extension}`

  const { error } = await client.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (error) throw error
  const url = await getSignedProfileMediaUrl(path)
  if (!url) throw new Error('Uploaded image could not be previewed.')
  return { path, url }
}

export async function getSignedProfileMediaUrl(path: string | null, expiresIn = 3600) {
  if (!path) return null
  const client = supabase
  if (!client) return null
  const { data, error } = await client.storage
    .from(PROFILE_MEDIA_BUCKET)
    .createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}

export async function deleteProfileMedia(path: string | null) {
  if (!path) return
  const client = supabase
  if (!client) return
  const { error } = await client.storage.from(PROFILE_MEDIA_BUCKET).remove([path])
  if (error) throw error
}

export async function deleteCharacterProfileMedia(accountId: string, characterId: string) {
  const client = supabase
  if (!client) return
  const root = `${accountId}/${characterId}`
  const bucket = client.storage.from(PROFILE_MEDIA_BUCKET)
  const { data: rootEntries, error: rootError } = await bucket.list(root, { limit: 100 })
  if (rootError) throw rootError

  const paths: string[] = []
  for (const entry of rootEntries ?? []) {
    if (entry.id) {
      paths.push(`${root}/${entry.name}`)
      continue
    }
    const folder = `${root}/${entry.name}`
    const { data: files, error: folderError } = await bucket.list(folder, { limit: 100 })
    if (folderError) throw folderError
    for (const file of files ?? []) {
      if (file.id) paths.push(`${folder}/${file.name}`)
    }
  }

  if (paths.length === 0) return
  const { error: removeError } = await bucket.remove(paths)
  if (removeError) throw removeError
}
