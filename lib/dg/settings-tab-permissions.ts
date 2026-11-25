export type SettingsTabId = 'general' | 'notifications' | 'security' | 'integrations';

/** Permission catalogue ↔ onglet paramètres. */
export const SETTINGS_TAB_PERMISSION: Record<SettingsTabId, string> = {
  general: 'action.settings.general',
  notifications: 'action.settings.notifications',
  security: 'action.settings.security',
  integrations: 'action.settings.integrations',
};

/** Clés PlatformConfig modifiables par onglet (PATCH /api/admin/settings). */
export const SETTINGS_TAB_FIELDS: Record<SettingsTabId, readonly string[]> = {
  general: [
    'organizationName',
    'institutionAcronym',
    'institutionLogoUrl',
    'certLogoUrl',
    'institutionAddress',
    'institutionPhone',
    'institutionOfficialEmail',
    'institutionHours',
    'institutionWebsite',
    'systemLanguage',
    'dateTimeFormat',
    'timezone',
  ],
  notifications: [
    'smtpHost',
    'smtpPort',
    'smtpSecure',
    'smtpUser',
    'smtpPassword',
    'smtpFromEmail',
    'notifyNewDocuments',
  ],
  security: [
    'passwordMinLength',
    'passwordExpirationDays',
    'passwordRequireUppercase',
    'passwordRequireLowercase',
    'passwordRequireNumbers',
    'passwordRequireSpecialChars',
    'sessionExpirationMinutes',
    'sessionSinglePerUser',
    'twoFactorRequired',
    'defaultImportPassword',
  ],
  integrations: [
    'adImportSource',
    'ldapUrl',
    'ldapBindDn',
    'ldapBaseDn',
    'ldapUserFilter',
    'ldapDefaultRole',
    'ldapTlsRejectUnauthorized',
  ],
};

export function settingsTabPermission(tab: SettingsTabId): string {
  return SETTINGS_TAB_PERMISSION[tab];
}

export function canAccessSettingsTab(
  permissions: Record<string, boolean>,
  tab: SettingsTabId
): boolean {
  if (permissions[settingsTabPermission(tab)] === true) return true;
  return permissions['admin.settings'] === true;
}

export function pickSettingsPatchForTab(
  settings: Record<string, unknown>,
  tab: SettingsTabId
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of SETTINGS_TAB_FIELDS[tab]) {
    if (key in settings) out[key] = settings[key];
  }
  return out;
}

export function firstAccessibleSettingsTab(
  permissions: Record<string, boolean>
): SettingsTabId | null {
  const order: SettingsTabId[] = ['general', 'notifications', 'security', 'integrations'];
  return order.find((tab) => canAccessSettingsTab(permissions, tab)) ?? null;
}

/** Filtre un payload PATCH aux champs autorisés selon les permissions d’onglets. */
function canEditSettingsTab(permissions: Record<string, boolean>, tab: SettingsTabId): boolean {
  if (permissions[SETTINGS_TAB_PERMISSION[tab]] === true) return true;
  return permissions['admin.settings'] === true;
}

export function filterSettingsPatchByPermissions(
  patch: Record<string, unknown>,
  permissions: Record<string, boolean>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const tab of Object.keys(SETTINGS_TAB_FIELDS) as SettingsTabId[]) {
    if (!canEditSettingsTab(permissions, tab)) continue;
    for (const key of SETTINGS_TAB_FIELDS[tab]) {
      if (key in patch) out[key] = patch[key];
    }
  }
  return out;
}
