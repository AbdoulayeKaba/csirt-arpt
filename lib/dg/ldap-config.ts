import type { DgRole } from '@/lib/dg/rbac';

export type AdImportSource = 'graph' | 'ldap';

export type LdapConnectionConfig = {
  url: string;
  bindDn: string;
  bindPassword: string;
  baseDn: string;
  userFilter: string;
  defaultRole: DgRole;
  tlsRejectUnauthorized: boolean;
};

export const DEFAULT_LDAP_CONFIG: Omit<LdapConnectionConfig, 'bindPassword'> = {
  url: 'ldaps://dc.organisation.local:636',
  bindDn: 'CN=svc-ldap,OU=Service Accounts,DC=organisation,DC=local',
  baseDn: 'OU=Utilisateurs,DC=organisation,DC=local',
  userFilter: '(&(objectClass=user)(objectCategory=person)(mail=*))',
  defaultRole: 'MANAGER',
  tlsRejectUnauthorized: true,
};

export type AdDirectoryUser = {
  externalId: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  role: DgRole;
  alreadyExists?: boolean;
};

export function parseLdapConfigFromSettings(raw: Record<string, string>): Omit<LdapConnectionConfig, 'bindPassword'> {
  return {
    url: raw.ldapUrl ?? DEFAULT_LDAP_CONFIG.url,
    bindDn: raw.ldapBindDn ?? DEFAULT_LDAP_CONFIG.bindDn,
    baseDn: raw.ldapBaseDn ?? DEFAULT_LDAP_CONFIG.baseDn,
    userFilter: raw.ldapUserFilter ?? DEFAULT_LDAP_CONFIG.userFilter,
    defaultRole: (raw.ldapDefaultRole as DgRole) ?? DEFAULT_LDAP_CONFIG.defaultRole,
    tlsRejectUnauthorized: raw.ldapTlsRejectUnauthorized !== 'false',
  };
}

export function ldapSettingsToRecord(
  config: Partial<LdapConnectionConfig> & { ldapEnabled?: boolean; adImportSource?: AdImportSource }
): Record<string, string> {
  const out: Record<string, string> = {};
  if (config.ldapEnabled !== undefined) out.ldapEnabled = config.ldapEnabled ? 'true' : 'false';
  if (config.adImportSource) out.adImportSource = config.adImportSource;
  if (config.url) out.ldapUrl = config.url;
  if (config.bindDn) out.ldapBindDn = config.bindDn;
  if (config.baseDn) out.ldapBaseDn = config.baseDn;
  if (config.userFilter) out.ldapUserFilter = config.userFilter;
  if (config.defaultRole) out.ldapDefaultRole = config.defaultRole;
  if (config.tlsRejectUnauthorized !== undefined) {
    out.ldapTlsRejectUnauthorized = config.tlsRejectUnauthorized ? 'true' : 'false';
  }
  return out;
}
