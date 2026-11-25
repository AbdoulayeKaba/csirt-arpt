import 'server-only';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { deleteObject, getObject, objectStoreEnabled, putObject } from '@/lib/storage/object-store';

const BRANDING_ROOT = path.join(process.cwd(), 'data', 'platform-branding');

export type BrandLogoSlot = 'cert' | 'arpt';

const LOGO_BASENAME: Record<BrandLogoSlot, string> = {
  cert: 'cert-logo',
  arpt: 'institution-logo',
};

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/** Lecture seule : un logo SVG déjà enregistré reste servi, les nouveaux dépôts sont refusés. */
const READ_EXTS = [...Object.keys(MIME_BY_EXT), '.svg'];
const READ_MIME: Record<string, string> = { ...MIME_BY_EXT, '.svg': 'image/svg+xml' };

function extFromMime(mimeType: string, fileName: string): string {
  const fromName = path.extname(fileName).toLowerCase();
  if (fromName && MIME_BY_EXT[fromName]) return fromName;
  switch (mimeType) {
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '.jpg';
  }
}

function logoPathForExt(slot: BrandLogoSlot, ext: string) {
  return path.join(BRANDING_ROOT, `${LOGO_BASENAME[slot]}${ext}`);
}

async function ensureDir() {
  await mkdir(BRANDING_ROOT, { recursive: true });
}

export async function saveBrandLogo(
  slot: BrandLogoSlot,
  buffer: Buffer,
  mimeType: string,
  fileName: string
) {
  const ext = extFromMime(mimeType, fileName);
  const basename = LOGO_BASENAME[slot];
  if (objectStoreEnabled()) {
    for (const candidate of READ_EXTS) {
      if (candidate !== ext) await deleteObject(`platform-branding/${basename}${candidate}`);
    }
    await putObject(`platform-branding/${basename}${ext}`, buffer, MIME_BY_EXT[ext] ?? mimeType);
    return { ext, mimeType: MIME_BY_EXT[ext] ?? mimeType };
  }

  await ensureDir();
  const target = logoPathForExt(slot, ext);
  for (const candidate of READ_EXTS) {
    const other = logoPathForExt(slot, candidate);
    if (other !== target) await unlink(other).catch(() => undefined);
  }
  await writeFile(target, buffer);
  return { ext, mimeType: MIME_BY_EXT[ext] ?? mimeType };
}

export async function readBrandLogo(
  slot: BrandLogoSlot
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (objectStoreEnabled()) {
    for (const ext of READ_EXTS) {
      const buffer = await getObject(`platform-branding/${LOGO_BASENAME[slot]}${ext}`);
      if (!buffer || buffer.length === 0) continue;
      return { buffer, mimeType: READ_MIME[ext]! };
    }
    return null;
  }
  for (const ext of READ_EXTS) {
    const full = logoPathForExt(slot, ext);
    try {
      const buffer = await readFile(full);
      if (buffer.length === 0) continue;
      return { buffer, mimeType: READ_MIME[ext]! };
    } catch {
      continue;
    }
  }
  return null;
}

export async function deleteBrandLogo(slot: BrandLogoSlot) {
  if (objectStoreEnabled()) {
    for (const ext of READ_EXTS) {
      await deleteObject(`platform-branding/${LOGO_BASENAME[slot]}${ext}`);
    }
    return;
  }
  await ensureDir();
  for (const ext of READ_EXTS) {
    await unlink(logoPathForExt(slot, ext)).catch(() => undefined);
  }
}

export async function saveInstitutionLogo(buffer: Buffer, mimeType: string, fileName: string) {
  return saveBrandLogo('arpt', buffer, mimeType, fileName);
}

export async function readInstitutionLogo() {
  return readBrandLogo('arpt');
}

export async function deleteInstitutionLogo() {
  return deleteBrandLogo('arpt');
}
