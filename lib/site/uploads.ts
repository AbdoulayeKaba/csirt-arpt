import 'server-only'
import { mkdir, readdir, writeFile } from 'fs/promises'
import path from 'path'
import { listKeys, objectStoreEnabled, putObject } from '@/lib/storage/object-store'

export { normalizeSiteAssetUrl, scrubCmsUploadUrls } from '@/lib/site/asset-urls'

const SITE_UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'site')
const PREVIOUS_UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'legacy')
const PREVIOUS_UPLOAD_URL_PREFIX = '/uploads/legacy'

/** Images du site public (diaporama, une, contenu). */
export const SITE_IMAGE_MAX_BYTES = 2 * 1024 * 1024
/** Documents PDF joints aux pages. */
export const SITE_DOCUMENT_MAX_BYTES = 15 * 1024 * 1024

const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

const DOCUMENT_MIME = new Set(['application/pdf'])

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
}

export type SiteUploadKind = 'image' | 'document'

export function detectSiteUploadKind(mimeType: string, fileName: string): SiteUploadKind | null {
  if (IMAGE_MIME.has(mimeType)) return 'image'
  if (DOCUMENT_MIME.has(mimeType)) return 'document'
  const ext = path.extname(fileName).toLowerCase()
  if (ext === '.pdf') return 'document'
  if (MIME_BY_EXT[ext]?.startsWith('image/')) return 'image'
  return null
}

function extFrom(mimeType: string, fileName: string) {
  const fromName = path.extname(fileName).toLowerCase()
  if (fromName && MIME_BY_EXT[fromName]) return fromName
  switch (mimeType) {
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    case 'image/gif':
      return '.gif'
    case 'application/pdf':
      return '.pdf'
    default:
      return '.jpg'
  }
}

function safeBase(name: string) {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'media'
  )
}

export function mimeForSiteFilename(filename: string) {
  return MIME_BY_EXT[path.extname(filename).toLowerCase()] || 'application/octet-stream'
}

export async function saveSiteUpload(buffer: Buffer, mimeType: string, fileName: string) {
  const ext = extFrom(mimeType, fileName)
  const stamp = Date.now().toString(36)
  const filename = `${stamp}-${safeBase(path.parse(fileName).name)}${ext}`
  const storedMime = MIME_BY_EXT[ext] || mimeType
  if (objectStoreEnabled()) {
    await putObject(`uploads/site/${filename}`, buffer, storedMime)
  } else {
    await mkdir(SITE_UPLOAD_ROOT, { recursive: true })
    await writeFile(path.join(SITE_UPLOAD_ROOT, filename), buffer)
  }
  const kind = detectSiteUploadKind(mimeType, fileName) ?? 'image'
  return {
    url: `/uploads/site/${filename}`,
    filename,
    kind,
    mimeType: MIME_BY_EXT[ext] || mimeType,
    size: buffer.length,
  }
}

async function listUploadDir(root: string, urlPrefix: string) {
  try {
    const files = await readdir(root)
    return files
      .filter((file) => Boolean(MIME_BY_EXT[path.extname(file).toLowerCase()]))
      .sort()
      .reverse()
      .map((filename) => {
        const ext = path.extname(filename).toLowerCase()
        const mime = MIME_BY_EXT[ext] || 'application/octet-stream'
        const kind: SiteUploadKind = ext === '.pdf' ? 'document' : 'image'
        return {
          src: `${urlPrefix}/${filename}`,
          label: filename,
          kind,
          mimeType: mime,
        }
      })
  } catch {
    return []
  }
}

async function listObjectUploads() {
  const keys = await listKeys('uploads/site/')
  return keys
    .map((key) => key.split('/').pop() || '')
    .filter((filename) => Boolean(MIME_BY_EXT[path.extname(filename).toLowerCase()]))
    .sort()
    .reverse()
    .map((filename) => {
      const ext = path.extname(filename).toLowerCase()
      const kind: SiteUploadKind = ext === '.pdf' ? 'document' : 'image'
      return {
        src: `/uploads/site/${filename}`,
        label: filename,
        kind,
        mimeType: MIME_BY_EXT[ext] || 'application/octet-stream',
      }
    })
}

export async function listSiteUploads() {
  const [current, legacy] = await Promise.all([
    objectStoreEnabled() ? listObjectUploads() : listUploadDir(SITE_UPLOAD_ROOT, '/uploads/site'),
    listUploadDir(PREVIOUS_UPLOAD_ROOT, PREVIOUS_UPLOAD_URL_PREFIX),
  ])
  const seen = new Set<string>()
  const merged = [...current, ...legacy].filter((item) => {
    if (seen.has(item.src)) return false
    seen.add(item.src)
    return true
  })
  return merged
}
