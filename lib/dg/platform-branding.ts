import { CSIRT_BRAND } from '@/lib/csirt/brand';
import type { PlatformConfig } from '@/lib/dg/platform-config';

export const PLATFORM_BRANDING_LOGO_PATH = '/api/platform/branding/logo';
export const PLATFORM_BRANDING_CERT_LOGO_PATH = '/api/platform/branding/cert-logo';

function versionedLogoUrl(path: string, version?: string | number) {
  if (version === undefined || version === '') return path;
  return `${path}?v=${encodeURIComponent(String(version))}`;
}

export function platformBrandingLogoUrl(version?: string | number) {
  return versionedLogoUrl(PLATFORM_BRANDING_LOGO_PATH, version);
}

export function platformBrandingCertLogoUrl(version?: string | number) {
  return versionedLogoUrl(PLATFORM_BRANDING_CERT_LOGO_PATH, version);
}

export type PlatformPublicContact = {
  email: string;
  phone: string;
  address: string;
  hours: string;
};

export type PlatformBranding = {
  organizationName: string;
  institutionAcronym: string;
  institutionLogoUrl: string;
  certLogoUrl: string;
  contact: PlatformPublicContact;
};

export const DEFAULT_PLATFORM_BRANDING: PlatformBranding = {
  organizationName: 'CSIRT-ARPT',
  institutionAcronym: 'CSIRT',
  institutionLogoUrl: '',
  certLogoUrl: '',
  contact: {
    email: CSIRT_BRAND.email,
    phone: 'Standard ARPT',
    address: CSIRT_BRAND.address,
    hours: CSIRT_BRAND.hours,
  },
};

/** Ancien stockage base64 tronqué par la limite MySQL TEXT (65 535 octets). */
const MYSQL_TEXT_MAX_BYTES = 65_535;

export function normalizeInstitutionLogoUrl(value: string | undefined | null): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  if (trimmed.startsWith(PLATFORM_BRANDING_LOGO_PATH)) return trimmed;
  if (trimmed.startsWith('data:') && trimmed.length >= MYSQL_TEXT_MAX_BYTES) return '';
  return trimmed;
}

export function pickPlatformPublicContact(config: PlatformConfig): PlatformPublicContact {
  return {
    email: config.institutionOfficialEmail?.trim() || DEFAULT_PLATFORM_BRANDING.contact.email,
    phone: config.institutionPhone?.trim() || DEFAULT_PLATFORM_BRANDING.contact.phone,
    address: config.institutionAddress?.trim() || DEFAULT_PLATFORM_BRANDING.contact.address,
    hours: config.institutionHours?.trim() || DEFAULT_PLATFORM_BRANDING.contact.hours,
  };
}

export function pickPlatformBranding(config: PlatformConfig): PlatformBranding {
  return {
    organizationName: config.organizationName?.trim() || DEFAULT_PLATFORM_BRANDING.organizationName,
    institutionAcronym: config.institutionAcronym?.trim() || DEFAULT_PLATFORM_BRANDING.institutionAcronym,
    institutionLogoUrl: normalizeInstitutionLogoUrl(config.institutionLogoUrl),
    certLogoUrl: normalizeInstitutionLogoUrl(config.certLogoUrl),
    contact: pickPlatformPublicContact(config),
  };
}
