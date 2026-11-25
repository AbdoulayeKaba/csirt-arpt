import { NextResponse } from 'next/server'
import { requireApiPermission } from '@/lib/auth/permission-guard'
import { canEditSiteContent } from '@/lib/dg/site-access'
import { SITE_THEME_MEDIA } from '@/lib/site/types'
import {
  SITE_DOCUMENT_MAX_BYTES,
  SITE_IMAGE_MAX_BYTES,
  detectSiteUploadKind,
  listSiteUploads,
  saveSiteUpload,
} from '@/lib/site/uploads'

export async function GET() {
  const auth = await requireApiPermission('site.manage')
  if (auth.error) return auth.error
  const uploads = await listSiteUploads()
  return NextResponse.json({
    theme: SITE_THEME_MEDIA,
    uploads: uploads.filter((item) => item.kind === 'image'),
    documents: uploads.filter((item) => item.kind === 'document'),
  })
}

export async function POST(req: Request) {
  const auth = await requireApiPermission('site.manage')
  if (auth.error) return auth.error
  if (!(await canEditSiteContent(auth.session.role))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'INVALID_FORM' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 })
  }

  const mimeType = file.type || 'application/octet-stream'
  const kind = detectSiteUploadKind(mimeType, file.name)
  if (!kind) {
    return NextResponse.json(
      { error: 'UNSUPPORTED_FILE_TYPE', message: 'Images (PNG, JPG, WebP, GIF) ou PDF.' },
      { status: 422 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const maxBytes = kind === 'document' ? SITE_DOCUMENT_MAX_BYTES : SITE_IMAGE_MAX_BYTES
  if (buffer.length === 0 || buffer.length > maxBytes) {
    return NextResponse.json(
      {
        error: 'FILE_TOO_LARGE',
        message:
          kind === 'document'
            ? 'PDF limité à 15 Mo.'
            : 'Image limitée à 2 Mo.',
      },
      { status: 422 }
    )
  }

  const saved = await saveSiteUpload(buffer, mimeType === 'application/octet-stream' && kind === 'document' ? 'application/pdf' : mimeType, file.name)
  return NextResponse.json(saved)
}
