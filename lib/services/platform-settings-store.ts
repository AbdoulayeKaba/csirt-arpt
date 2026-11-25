import { prisma } from '@/lib/prisma';

type PlatformSettingRow = { key: string; value: string };

type PlatformSettingDelegate = {
  findMany: () => Promise<Array<PlatformSettingRow>>;
  findUnique: (args: { where: { key: string } }) => Promise<PlatformSettingRow | null>;
  upsert: (args: {
    where: { key: string };
    create: { key: string; value: string; updatedById?: string };
    update: { value: string; updatedById?: string };
  }) => Promise<unknown>;
};

function delegate(): PlatformSettingDelegate | null {
  const d = (prisma as unknown as { platformSetting?: PlatformSettingDelegate }).platformSetting;
  return d ?? null;
}

export function hasPlatformSettingsStore(): boolean {
  return Boolean(delegate());
}

export async function listPlatformSettingsRows(): Promise<Array<PlatformSettingRow>> {
  const d = delegate();
  if (!d) return [];
  try {
    return await d.findMany();
  } catch {
    return [];
  }
}

const BRANDING_SETTING_KEYS = [
  'organizationName',
  'institutionAcronym',
  'institutionLogoUrl',
  'certLogoUrl',
  'institutionAddress',
  'institutionPhone',
  'institutionOfficialEmail',
  'institutionHours',
  'institutionWebsite',
] as const

/** Seulement les champs d’identité. Évite de charger le contenu du site et les incidents. */
export async function listBrandingSettingRows(): Promise<Array<PlatformSettingRow>> {
  try {
    return await prisma.platformSetting.findMany({
      where: { key: { in: [...BRANDING_SETTING_KEYS] } },
      select: { key: true, value: true },
    })
  } catch {
    return []
  }
}

export async function getPlatformSettingValue(key: string): Promise<string | null> {
  const d = delegate();
  if (!d) return null;
  try {
    const row = await d.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function upsertPlatformSettingValue(
  key: string,
  value: string,
  updatedById?: string
): Promise<boolean> {
  const d = delegate();
  if (!d) return false;
  try {
    await d.upsert({
      where: { key },
      create: { key, value, updatedById },
      update: { value, updatedById },
    });
    return true;
  } catch (error) {
    console.error('[platform-settings] upsert failed', key, value.length, error);
    return false;
  }
}
