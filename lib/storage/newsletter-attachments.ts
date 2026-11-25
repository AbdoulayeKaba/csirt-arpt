import 'server-only'

import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'
import { deletePrefix, getObject, objectStoreEnabled, putObject } from '@/lib/storage/object-store'

const ATTACHMENTS_ROOT = path.join(process.cwd(), 'data', 'newsletter-attachments')

export const NEWSLETTER_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024
export const NEWSLETTER_ATTACHMENT_MAX_FILES = 5
export const NEWSLETTER_ATTACHMENT_MAX_TOTAL_BYTES = 20 * 1024 * 1024

const ALLOWED_EXT = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.txt',
  '.csv',
  '.zip',
])

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.zip': 'application/zip',
}

export type NewsletterStoredAttachment = {
  filename: string
  contentType: string
  size: number
  storedName: string
}

function safeOriginalName(name: string): string {
  const base = path.basename(name).replace(/[^\w.\- ()àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]+/g, '_')
  return base.slice(0, 120) || 'fichier'
}

function campaignDir(campaignId: string) {
  const safeId = campaignId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(ATTACHMENTS_ROOT, safeId)
}

export function isAllowedNewsletterAttachment(fileName: string, mimeType?: string): boolean {
  const ext = path.extname(fileName).toLowerCase()
  if (!ALLOWED_EXT.has(ext)) return false
  if (!mimeType || mimeType === 'application/octet-stream') return true
  const expected = MIME_BY_EXT[ext]
  return !expected || mimeType === expected || mimeType.startsWith('application/') || mimeType.startsWith('image/') || mimeType.startsWith('text/')
}

export async function saveNewsletterAttachments(
  campaignId: string,
  files: Array<{ filename: string; contentType: string; buffer: Buffer }>
): Promise<NewsletterStoredAttachment[]> {
  if (!files.length) return []
  const safeId = campaignId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const dir = campaignDir(campaignId)
  if (!objectStoreEnabled()) await mkdir(dir, { recursive: true })

  const saved: NewsletterStoredAttachment[] = []
  for (const file of files) {
    const ext = path.extname(file.filename).toLowerCase() || '.bin'
    const storedName = `${Date.now()}-${randomBytes(4).toString('hex')}${ext}`
    if (objectStoreEnabled()) {
      await putObject(`newsletter-attachments/${safeId}/${storedName}`, file.buffer, file.contentType)
    } else {
      await writeFile(path.join(dir, storedName), file.buffer)
    }
    saved.push({
      filename: safeOriginalName(file.filename),
      contentType: file.contentType || MIME_BY_EXT[ext] || 'application/octet-stream',
      size: file.buffer.length,
      storedName,
    })
  }
  return saved
}

export async function readNewsletterAttachments(
  campaignId: string,
  meta: NewsletterStoredAttachment[] | undefined | null
): Promise<Array<{ filename: string; contentType: string; content: Buffer }>> {
  if (!meta?.length) return []
  const safeId = campaignId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const dir = campaignDir(campaignId)
  const out: Array<{ filename: string; contentType: string; content: Buffer }> = []
  for (const item of meta) {
    try {
      const storedName = path.basename(item.storedName)
      const content = objectStoreEnabled()
        ? await getObject(`newsletter-attachments/${safeId}/${storedName}`)
        : await readFile(path.join(dir, storedName))
      if (!content) continue
      out.push({
        filename: item.filename,
        contentType: item.contentType,
        content,
      })
    } catch {
      // skip missing files
    }
  }
  return out
}

export async function deleteNewsletterAttachments(campaignId: string): Promise<void> {
  const safeId = campaignId.replace(/[^a-zA-Z0-9_-]/g, '_')
  if (objectStoreEnabled()) {
    await deletePrefix(`newsletter-attachments/${safeId}/`)
    return
  }
  await rm(campaignDir(campaignId), { recursive: true, force: true }).catch(() => undefined)
}
