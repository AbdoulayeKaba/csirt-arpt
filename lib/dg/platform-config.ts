import type { AdImportSource } from '@/lib/dg/ldap-config';
import type { DateTimeFormat, SystemLanguage } from '@/lib/dg/institutional-options';
import type { DgRole } from '@/lib/dg/rbac';

export type PlatformConfig = {
  organizationName: string;
  institutionAcronym: string;
  institutionLogoUrl: string;
  /** Logo CERT (CSIRT), affiché à côté du logo ARPT sur le portail public. */
  certLogoUrl: string;
  institutionAddress: string;
  /** Lieu, coordonnées ou lien Google Maps affiché sur la page Contacts. */
  institutionMapUrl: string;
  institutionPhone: string;
  institutionOfficialEmail: string;
  institutionHours: string;
  institutionWebsite: string;
  systemLanguage: SystemLanguage;
  dateTimeFormat: DateTimeFormat;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  smtpFromEmail: string;
  notifyNewDocuments: boolean;
  timezone: string;
  defaultImportPassword: string;
  adImportSource: AdImportSource;
  ldapUrl: string;
  ldapBindDn: string;
  ldapBaseDn: string;
  ldapUserFilter: string;
  ldapDefaultRole: DgRole;
  ldapTlsRejectUnauthorized: boolean;
  passwordMinLength: number;
  passwordExpirationDays: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  sessionExpirationMinutes: number;
  sessionSinglePerUser: boolean;
  twoFactorRequired: boolean;
};

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  organizationName: 'CSIRT-ARPT',
  institutionAcronym: 'CSIRT',
  institutionLogoUrl: '',
  certLogoUrl: '',
  institutionAddress: 'Kaloum, Conakry, République de Guinée',
  institutionMapUrl: '',
  institutionPhone: 'Standard ARPT',
  institutionOfficialEmail: 'csirt@arpt.gov.gn',
  institutionHours: 'Prise en charge 24h/24',
  institutionWebsite: 'https://csirt.arpt.gov.gn',
  systemLanguage: 'fr',
  dateTimeFormat: 'DD/MM/YYYY HH:mm',
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPassword: '',
  smtpFromEmail: '',
  notifyNewDocuments: true,
  timezone: 'Africa/Conakry',
  defaultImportPassword: 'Password@2026',
  adImportSource: 'graph',
  ldapUrl: 'ldaps://dc.organisation.local:636',
  ldapBindDn: 'CN=svc-ldap,OU=Service Accounts,DC=organisation,DC=local',
  ldapBaseDn: 'OU=Utilisateurs,DC=organisation,DC=local',
  ldapUserFilter: '(&(objectClass=user)(objectCategory=person)(mail=*))',
  ldapDefaultRole: 'MANAGER',
  ldapTlsRejectUnauthorized: true,
  passwordMinLength: 10,
  passwordExpirationDays: 90,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecialChars: true,
  sessionExpirationMinutes: 15,
  sessionSinglePerUser: true,
  twoFactorRequired: false,
};

export const PLATFORM_SETTING_KEYS: (keyof PlatformConfig)[] = [
  'organizationName',
  'institutionAcronym',
  'institutionLogoUrl',
  'certLogoUrl',
  'institutionAddress',
  'institutionMapUrl',
  'institutionPhone',
  'institutionOfficialEmail',
  'institutionHours',
  'institutionWebsite',
  'systemLanguage',
  'dateTimeFormat',
  'smtpHost',
  'smtpPort',
  'smtpSecure',
  'smtpUser',
  'smtpPassword',
  'smtpFromEmail',
  'notifyNewDocuments',
  'timezone',
  'defaultImportPassword',
  'passwordMinLength',
  'passwordExpirationDays',
  'passwordRequireUppercase',
  'passwordRequireLowercase',
  'passwordRequireNumbers',
  'passwordRequireSpecialChars',
  'sessionExpirationMinutes',
  'sessionSinglePerUser',
  'twoFactorRequired',
  'adImportSource',
  'ldapUrl',
  'ldapBindDn',
  'ldapBaseDn',
  'ldapUserFilter',
  'ldapDefaultRole',
  'ldapTlsRejectUnauthorized',
];

export function parsePlatformConfig(raw: Record<string, string>): PlatformConfig {
  const systemLanguage =
    raw.systemLanguage === 'en' ? 'en' : DEFAULT_PLATFORM_CONFIG.systemLanguage;
  const dateTimeFormat =
    raw.dateTimeFormat === 'DD/MM/YYYY' ||
    raw.dateTimeFormat === 'YYYY-MM-DD HH:mm' ||
    raw.dateTimeFormat === 'MM/DD/YYYY h:mm a'
      ? raw.dateTimeFormat
      : DEFAULT_PLATFORM_CONFIG.dateTimeFormat;

  return {
    organizationName: raw.organizationName ?? DEFAULT_PLATFORM_CONFIG.organizationName,
    institutionAcronym: raw.institutionAcronym ?? DEFAULT_PLATFORM_CONFIG.institutionAcronym,
    institutionLogoUrl: raw.institutionLogoUrl ?? DEFAULT_PLATFORM_CONFIG.institutionLogoUrl,
    certLogoUrl: raw.certLogoUrl ?? DEFAULT_PLATFORM_CONFIG.certLogoUrl,
    institutionAddress: raw.institutionAddress ?? DEFAULT_PLATFORM_CONFIG.institutionAddress,
    institutionMapUrl: raw.institutionMapUrl ?? DEFAULT_PLATFORM_CONFIG.institutionMapUrl,
    institutionPhone: raw.institutionPhone ?? DEFAULT_PLATFORM_CONFIG.institutionPhone,
    institutionOfficialEmail:
      raw.institutionOfficialEmail ?? DEFAULT_PLATFORM_CONFIG.institutionOfficialEmail,
    institutionHours: raw.institutionHours ?? DEFAULT_PLATFORM_CONFIG.institutionHours,
    institutionWebsite: raw.institutionWebsite ?? DEFAULT_PLATFORM_CONFIG.institutionWebsite,
    systemLanguage,
    dateTimeFormat,
    smtpHost: raw.smtpHost ?? DEFAULT_PLATFORM_CONFIG.smtpHost,
    smtpPort: Number.isFinite(Number(raw.smtpPort))
      ? Math.max(1, Math.min(65535, Number(raw.smtpPort)))
      : DEFAULT_PLATFORM_CONFIG.smtpPort,
    smtpSecure: raw.smtpSecure === 'true',
    smtpUser: raw.smtpUser ?? DEFAULT_PLATFORM_CONFIG.smtpUser,
    smtpPassword: raw.smtpPassword ?? DEFAULT_PLATFORM_CONFIG.smtpPassword,
    smtpFromEmail: raw.smtpFromEmail ?? DEFAULT_PLATFORM_CONFIG.smtpFromEmail,
    notifyNewDocuments: raw.notifyNewDocuments !== 'false',
    timezone: raw.timezone ?? DEFAULT_PLATFORM_CONFIG.timezone,
    defaultImportPassword: raw.defaultImportPassword ?? DEFAULT_PLATFORM_CONFIG.defaultImportPassword,
    adImportSource: raw.adImportSource === 'ldap' ? 'ldap' : 'graph',
    ldapUrl: raw.ldapUrl ?? DEFAULT_PLATFORM_CONFIG.ldapUrl,
    ldapBindDn: raw.ldapBindDn ?? DEFAULT_PLATFORM_CONFIG.ldapBindDn,
    ldapBaseDn: raw.ldapBaseDn ?? DEFAULT_PLATFORM_CONFIG.ldapBaseDn,
    ldapUserFilter: raw.ldapUserFilter ?? DEFAULT_PLATFORM_CONFIG.ldapUserFilter,
    ldapDefaultRole:
      raw.ldapDefaultRole === 'DG' ||
      raw.ldapDefaultRole === 'ASSISTANT' ||
      raw.ldapDefaultRole === 'MANAGER' ||
      raw.ldapDefaultRole === 'EXTERNAL'
        ? raw.ldapDefaultRole
        : DEFAULT_PLATFORM_CONFIG.ldapDefaultRole,
    ldapTlsRejectUnauthorized: raw.ldapTlsRejectUnauthorized !== 'false',
    passwordMinLength: clampInt(
      raw.passwordMinLength,
      DEFAULT_PLATFORM_CONFIG.passwordMinLength,
      6,
      128
    ),
    passwordExpirationDays: clampInt(
      raw.passwordExpirationDays,
      DEFAULT_PLATFORM_CONFIG.passwordExpirationDays,
      0,
      3650
    ),
    passwordRequireUppercase: raw.passwordRequireUppercase !== 'false',
    passwordRequireLowercase: raw.passwordRequireLowercase !== 'false',
    passwordRequireNumbers: raw.passwordRequireNumbers !== 'false',
    passwordRequireSpecialChars: raw.passwordRequireSpecialChars !== 'false',
    sessionExpirationMinutes: clampInt(
      raw.sessionExpirationMinutes,
      DEFAULT_PLATFORM_CONFIG.sessionExpirationMinutes,
      5,
      1440
    ),
    sessionSinglePerUser: raw.sessionSinglePerUser !== 'false',
    twoFactorRequired: raw.twoFactorRequired === 'true',
  };
}

function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function serializePlatformConfig(config: PlatformConfig): Record<string, string> {
  return {
    organizationName: config.organizationName,
    institutionAcronym: config.institutionAcronym,
    institutionLogoUrl: config.institutionLogoUrl,
    certLogoUrl: config.certLogoUrl,
    institutionAddress: config.institutionAddress,
    institutionMapUrl: config.institutionMapUrl,
    institutionPhone: config.institutionPhone,
    institutionOfficialEmail: config.institutionOfficialEmail,
    institutionHours: config.institutionHours,
    institutionWebsite: config.institutionWebsite,
    systemLanguage: config.systemLanguage,
    dateTimeFormat: config.dateTimeFormat,
    smtpHost: config.smtpHost,
    smtpPort: String(config.smtpPort),
    smtpSecure: config.smtpSecure ? 'true' : 'false',
    smtpUser: config.smtpUser,
    smtpPassword: config.smtpPassword,
    smtpFromEmail: config.smtpFromEmail,
    notifyNewDocuments: config.notifyNewDocuments ? 'true' : 'false',
    timezone: config.timezone,
    defaultImportPassword: config.defaultImportPassword,
    adImportSource: config.adImportSource,
    ldapUrl: config.ldapUrl,
    ldapBindDn: config.ldapBindDn,
    ldapBaseDn: config.ldapBaseDn,
    ldapUserFilter: config.ldapUserFilter,
    ldapDefaultRole: config.ldapDefaultRole,
    ldapTlsRejectUnauthorized: config.ldapTlsRejectUnauthorized ? 'true' : 'false',
    passwordMinLength: String(config.passwordMinLength),
    passwordExpirationDays: String(config.passwordExpirationDays),
    passwordRequireUppercase: config.passwordRequireUppercase ? 'true' : 'false',
    passwordRequireLowercase: config.passwordRequireLowercase ? 'true' : 'false',
    passwordRequireNumbers: config.passwordRequireNumbers ? 'true' : 'false',
    passwordRequireSpecialChars: config.passwordRequireSpecialChars ? 'true' : 'false',
    sessionExpirationMinutes: String(config.sessionExpirationMinutes),
    sessionSinglePerUser: config.sessionSinglePerUser ? 'true' : 'false',
    twoFactorRequired: config.twoFactorRequired ? 'true' : 'false',
  };
}
