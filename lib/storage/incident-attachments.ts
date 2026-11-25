import 'server-only'

import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'
import { getObject, listKeys, objectStoreEnabled, putObject } from '@/lib/storage/object-store'

const ATTACHMENTS_ROOT = path.join(process.cwd(), 'data', 'incident-attachments')

export const INCIDENT_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024
export const INCIDENT_ATTACHMENT_MAX_FILES = 5

const ALLOWED_EXT = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.txt',
  '.csv',
  '.zip',
  '.eml',
  '.msg',
  '.pcap',
  '.pcapng',
  '.log',
  '.json',
  '.xml',
])

function incidentDir(incidentId: string) {
  const safeId = incidentId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(ATTACHMENTS_ROOT, safeId)
}

function safeAttachmentId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_') || `att-${randomBytes(4).toString('hex')}`
}

function safeOriginalName(name: string): string {
  const base = path.basename(name).replace(/[^\w.\- ()àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]+/g, '_')
  return base.slice(0, 120) || 'fichier'
}

export function isAllowedIncidentAttachment(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase()
  return ALLOWED_EXT.has(ext)
}

export function incidentAttachmentDownloadPath(incidentId: string, attachmentId: string) {
  return `/api/admin/incidents/${encodeURIComponent(incidentId)}/attachments/${encodeURIComponent(attachmentId)}`
}

export async function saveIncidentAttachment(params: {
  incidentId: string
  attachmentId: string
  fileName: string
  mimeType?: string
  buffer: Buffer
}): Promise<{ storedName: string; size: number; mimeType: string; url: string }> {
  const ext = path.extname(params.fileName).toLowerCase() || '.bin'
  const id = safeAttachmentId(params.attachmentId)
  const storedName = `${id}${ext}`
  const safeId = params.incidentId.replace(/[^a-zA-Z0-9_-]/g, '_')
  if (objectStoreEnabled()) {
    await putObject(`incident-attachments/${safeId}/${storedName}`, params.buffer, params.mimeType)
  } else {
    const dir = incidentDir(params.incidentId)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, storedName), params.buffer)
  }
  return {
    storedName,
    size: params.buffer.length,
    mimeType: params.mimeType || 'application/octet-stream',
    url: incidentAttachmentDownloadPath(params.incidentId, id),
  }
}

async function readStoredBuffer(incidentId: string, attachmentId: string): Promise<Buffer | null> {
  const id = safeAttachmentId(attachmentId)
  const safeId = incidentId.replace(/[^a-zA-Z0-9_-]/g, '_')
  if (objectStoreEnabled()) {
    const keys = await listKeys(`incident-attachments/${safeId}/`)
    const match = keys.find((key) => {
      const base = key.split('/').pop() || ''
      return base === id || base.startsWith(`${id}.`)
    })
    return match ? getObject(match) : null
  }
  const dir = incidentDir(incidentId)
  try {
    const { readdir } = await import('fs/promises')
    const files = await readdir(dir)
    const match = files.find((file) => file === id || file.startsWith(`${id}.`))
    return match ? readFile(path.join(dir, match)) : null
  } catch {
    return null
  }
}

export async function readIncidentAttachment(params: {
  incidentId: string
  attachmentId: string
  fallbackName?: string
  mimeType?: string
  /** Si le fichier est absent (ex. seed), génère un contenu démo téléchargeable. */
  allowDemoFallback?: boolean
}): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null> {
  const fileName = safeOriginalName(params.fallbackName || `${params.attachmentId}.bin`)
  const mimeType = params.mimeType || 'application/octet-stream'

  try {
    const buffer = await readStoredBuffer(params.incidentId, params.attachmentId)
    if (buffer) return { buffer, mimeType, fileName }
  } catch {
    // fall through
  }

  if (!params.allowDemoFallback) return null

  const demo = Buffer.from(
    [
      `# CSIRT-ARPT — pièce jointe de démonstration`,
      `# Fichier : ${fileName}`,
      `# Incident : ${params.incidentId}`,
      `# Généré automatiquement car le binaire d’origine n’est pas stocké.`,
      ``,
    ].join('\n'),
    'utf8'
  )
  await saveIncidentAttachment({
    incidentId: params.incidentId,
    attachmentId: params.attachmentId,
    fileName,
    mimeType: 'application/octet-stream',
    buffer: demo,
  }).catch(() => undefined)

  return {
    buffer: demo,
    mimeType: 'application/octet-stream',
    fileName,
  }
}
