import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireApiPermission } from '@/lib/auth/permission-guard';
import { filterSettingsPatchByPermissions } from '@/lib/dg/settings-tab-permissions';
import {
  getPlatformSettingsForAdmin,
  updatePlatformSettingsForAdmin,
} from '@/lib/services/platform-settings-admin';
import { getEffectivePermissionMap } from '@/lib/auth/effective-permissions';
import { mockWriteAudit } from '@/lib/mock/audit';
import { writeAudit } from '@/lib/services/audit';
import { isMockDataEnabled } from '@/lib/mock/config';

const optionalEmail = z.union([z.literal(''), z.string().email()]).optional();
const optionalUrl = z.union([z.literal(''), z.string().url()]).optional();

const patchSchema = z.object({
  organizationName: z.string().min(2).max(191).optional(),
  institutionAcronym: z.string().max(32).optional(),
  institutionLogoUrl: z.string().max(600_000).optional(),
  certLogoUrl: z.string().max(600_000).optional(),
  institutionAddress: z.string().max(500).optional(),
  institutionPhone: z.string().max(64).optional(),
  institutionOfficialEmail: optionalEmail,
  institutionHours: z.string().max(120).optional(),
  institutionWebsite: optionalUrl,
  systemLanguage: z.enum(['fr', 'en']).optional(),
  dateTimeFormat: z
    .enum(['DD/MM/YYYY HH:mm', 'DD/MM/YYYY', 'YYYY-MM-DD HH:mm', 'MM/DD/YYYY h:mm a'])
    .optional(),
  smtpHost: z.string().max(255).optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().max(255).optional(),
  smtpPassword: z.string().max(256).optional(),
  smtpFromEmail: optionalEmail,
  notifyNewDocuments: z.boolean().optional(),
  timezone: z.string().min(2).max(64).optional(),
  defaultImportPassword: z.string().min(6).max(128).optional(),
  adImportSource: z.enum(['graph', 'ldap']).optional(),
  ldapUrl: z.string().max(255).optional(),
  ldapBindDn: z.string().max(255).optional(),
  ldapBaseDn: z.string().max(255).optional(),
  ldapUserFilter: z.string().max(500).optional(),
  ldapDefaultRole: z.enum(['DG', 'ASSISTANT', 'MANAGER', 'EXTERNAL']).optional(),
  ldapTlsRejectUnauthorized: z.boolean().optional(),
  passwordMinLength: z.number().int().min(6).max(128).optional(),
  passwordExpirationDays: z.number().int().min(0).max(3650).optional(),
  passwordRequireUppercase: z.boolean().optional(),
  passwordRequireLowercase: z.boolean().optional(),
  passwordRequireNumbers: z.boolean().optional(),
  passwordRequireSpecialChars: z.boolean().optional(),
  sessionExpirationMinutes: z.number().int().min(5).max(1440).optional(),
  sessionSinglePerUser: z.boolean().optional(),
  twoFactorRequired: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireApiPermission('admin.settings');
  if (auth.error) return auth.error;

  const settings = await getPlatformSettingsForAdmin();
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const auth = await requireApiPermission('admin.settings');
  if (auth.error) return auth.error;
  const { session } = auth;

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Données invalides.',
      },
      { status: 422 }
    );
  }

  const permMap = await getEffectivePermissionMap(session.userId, session.role);
  const filtered = filterSettingsPatchByPermissions(
    parsed.data as Record<string, unknown>,
    permMap
  );
  if (Object.keys(filtered).length === 0) {
    return NextResponse.json(
      {
        error: 'FORBIDDEN',
        message: 'Aucun champ autorisé pour votre rôle dans cette requête.',
      },
      { status: 403 }
    );
  }

  try {
    const settings = await updatePlatformSettingsForAdmin(
      filtered as Parameters<typeof updatePlatformSettingsForAdmin>[0],
      session.userId
    );
    try {
      revalidateTag('dg-platform-branding', 'max');
    } catch {
      // Non bloquant — la config est déjà persistée.
    }
    if (isMockDataEnabled()) {
      mockWriteAudit(session.userId, 'admin.settings.update');
    } else {
      await writeAudit(session.userId, 'admin.settings.update');
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[PATCH /api/admin/settings]', error);
    return NextResponse.json(
      { error: 'SAVE_FAILED', message: 'Enregistrement impossible.' },
      { status: 500 }
    );
  }
}
