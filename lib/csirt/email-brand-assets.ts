import 'server-only';

import { readFile } from 'fs/promises';
import path from 'path';
import { CSIRT_LOGO_MARK_SRC, CSIRT_LOGO_SRC } from '@/lib/csirt/brand';
import { readInstitutionLogo } from '@/lib/storage/platform-branding';

const RASTER_MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

const RASTER_MIMES = new Set(Object.values(RASTER_MIME_BY_EXT));

/** CID inline : compatible Gmail / Outlook (les data URI sont souvent bloqués). */
export const EMAIL_LOGO_CID = 'csirt-arpt-logo@arpt.gov.gn';

export type EmailLogoAttachment = {
  filename: string
  content: Buffer
  contentType: string
  cid: string
}

type ResolvedLogo = {
  /** src pour balise <img> (cid:...) */
  src: string
  attachment: EmailLogoAttachment
}

let cachedLogo: ResolvedLogo | null | undefined;

function filenameForMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'csirt-arpt-logo.jpg';
    case 'image/webp':
      return 'csirt-arpt-logo.webp';
    case 'image/gif':
      return 'csirt-arpt-logo.gif';
    default:
      return 'csirt-arpt-logo.png';
  }
}

function toResolved(buffer: Buffer, mimeType: string): ResolvedLogo {
  return {
    src: `cid:${EMAIL_LOGO_CID}`,
    attachment: {
      filename: filenameForMime(mimeType),
      content: buffer,
      contentType: mimeType,
      cid: EMAIL_LOGO_CID,
    },
  };
}

async function readRasterFromPublic(relativePath: string): Promise<ResolvedLogo | null> {
  const ext = path.extname(relativePath).toLowerCase();
  const mimeType = RASTER_MIME_BY_EXT[ext];
  if (!mimeType) return null;

  try {
    const filePath = path.join(process.cwd(), 'public', relativePath.replace(/^\//, ''));
    const buffer = await readFile(filePath);
    if (buffer.length === 0) return null;
    return toResolved(buffer, mimeType);
  } catch {
    return null;
  }
}

async function resolveEmailLogo(): Promise<ResolvedLogo | null> {
  if (cachedLogo !== undefined) return cachedLogo;

  const institution = await readInstitutionLogo();
  if (institution && RASTER_MIMES.has(institution.mimeType)) {
    cachedLogo = toResolved(institution.buffer, institution.mimeType);
    return cachedLogo;
  }

  for (const relativePath of [CSIRT_LOGO_SRC, CSIRT_LOGO_MARK_SRC]) {
    const resolved = await readRasterFromPublic(relativePath);
    if (resolved) {
      cachedLogo = resolved;
      return cachedLogo;
    }
  }

  cachedLogo = null;
  return cachedLogo;
}

/**
 * Logo pour balise <img> dans les e-mails.
 * Utilise un CID inline (pièce jointe) — pas de data URI (bloqué par la plupart des clients).
 */
export async function resolveEmailLogoSrc(): Promise<string | null> {
  const logo = await resolveEmailLogo();
  return logo?.src ?? null;
}

/** Pièce jointe inline à passer à nodemailer avec le HTML. */
export async function resolveEmailLogoAttachment(): Promise<EmailLogoAttachment | null> {
  const logo = await resolveEmailLogo();
  return logo?.attachment ?? null;
}
