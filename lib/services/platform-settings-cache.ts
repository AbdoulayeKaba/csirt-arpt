import { unstable_cache } from 'next/cache';
import {
  DEFAULT_PLATFORM_BRANDING,
  pickPlatformBranding,
} from '@/lib/dg/platform-branding';
import { parsePlatformConfig } from '@/lib/dg/platform-config';
import { listBrandingSettingRows } from '@/lib/services/platform-settings-store';

/** Branding institutionnel — cache court, sans le gros JSON du site. */
export const getCachedPlatformBranding = unstable_cache(
  async () => {
    try {
      const rows = await listBrandingSettingRows();
      const map: Record<string, string> = {};
      for (const row of rows) map[row.key] = row.value;
      return pickPlatformBranding(parsePlatformConfig(map));
    } catch {
      return DEFAULT_PLATFORM_BRANDING;
    }
  },
  ['dg-platform-branding'],
  { revalidate: 120, tags: ['dg-platform-branding'] }
);

export async function getLayoutPlatformBranding() {
  try {
    return await getCachedPlatformBranding();
  } catch {
    return DEFAULT_PLATFORM_BRANDING;
  }
}
