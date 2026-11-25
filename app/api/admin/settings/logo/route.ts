import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireApiPermission, userHasPermission } from '@/lib/auth/permission-guard';
import { LOGO_MAX_BYTES } from '@/lib/dg/institutional-options';
import {
  platformBrandingCertLogoUrl,
  platformBrandingLogoUrl,
} from '@/lib/dg/platform-branding';
import {
  deleteBrandLogo,
  saveBrandLogo,
  type BrandLogoSlot,
} from '@/lib/storage/platform-branding';
import { updatePlatformSettings } from '@/lib/services/platform-settings';

const LOGO_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function parseLogoSlot(value: unknown): BrandLogoSlot {
  return value === 'cert' ? 'cert' : 'arpt';
}

function logoSettingPatch(slot: BrandLogoSlot, logoUrl: string) {
  return slot === 'cert' ? { certLogoUrl: logoUrl } : { institutionLogoUrl: logoUrl };
}

export async function POST(req: Request) {
  const auth = await requireApiPermission('admin.settings');
  if (auth.error) return auth.error;
  if (!(await userHasPermission(auth.session.role, 'action.settings.general'))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'INVALID_FORM' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0 || buffer.length > LOGO_MAX_BYTES) {
    return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 422 });
  }

  const mimeType = file.type || 'application/octet-stream';
  if (!LOGO_MIME_TYPES.has(mimeType)) {
    return NextResponse.json({ error: 'UNSUPPORTED_FILE_TYPE' }, { status: 422 });
  }

  const slot = parseLogoSlot(formData.get('slot'));
  await saveBrandLogo(slot, buffer, mimeType, file.name);
  const logoUrl =
    slot === 'cert' ? platformBrandingCertLogoUrl(Date.now()) : platformBrandingLogoUrl(Date.now());
  await updatePlatformSettings(logoSettingPatch(slot, logoUrl), auth.session.userId);
  revalidateTag('dg-platform-branding', 'max');

  return NextResponse.json({ logoUrl, slot });
}

export async function DELETE(req: Request) {
  const auth = await requireApiPermission('admin.settings');
  if (auth.error) return auth.error;
  if (!(await userHasPermission(auth.session.role, 'action.settings.general'))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const slot = parseLogoSlot(new URL(req.url).searchParams.get('slot'));
  await deleteBrandLogo(slot);
  await updatePlatformSettings(logoSettingPatch(slot, ''), auth.session.userId);
  revalidateTag('dg-platform-branding', 'max');

  return NextResponse.json({ ok: true, slot });
}
