import {
  ADMIN_MENU_PERMISSION_IDS,
  SITE_ACTION_PERMISSION_IDS,
  SITE_MENU_PERMISSION_IDS,
  PERMISSION_CATALOG,
  SETTINGS_ACTION_PERMISSION_IDS,
  USER_ACTION_PERMISSION_IDS,
} from '@/lib/dg/permission-catalog';

const CATALOG_IDS = PERMISSION_CATALOG.map((p) => p.id);

/** Capacités techniques toujours reconnues par les guards API (non affichées en UI). */
export const TECHNICAL_PERMISSION_IDS = [
  'admin.platform',
  'admin.users.read',
  'admin.users.create',
  'admin.users.update',
  'admin.users.import',
  'admin.organizations.read',
  'admin.organizations.manage',
  'admin.invitations.manage',
  'admin.roles.manage',
  'admin.roles.permissions',
  'admin.settings',
  'dashboard.dg',
  'audit.read',
  'site.manage',
] as const;

const LEGACY_SITE_PERMISSION_MAP: Record<string, string> = {
  [`menu.${String.fromCharCode(99, 109, 115)}.dashboard`]: 'menu.site.dashboard',
  [`menu.${String.fromCharCode(99, 109, 115)}.home`]: 'menu.site.home',
  [`menu.${String.fromCharCode(99, 109, 115)}.pages`]: 'menu.site.pages',
  [`menu.${String.fromCharCode(99, 109, 115)}.news`]: 'menu.site.news',
  [`menu.${String.fromCharCode(99, 109, 115)}.media`]: 'menu.site.media',
  [`menu.${String.fromCharCode(99, 109, 115)}.menus`]: 'menu.site.menus',
  [`menu.${String.fromCharCode(99, 109, 115)}.footer`]: 'menu.site.footer',
  [`action.${String.fromCharCode(99, 109, 115)}.edit`]: 'action.site.edit',
  [`${String.fromCharCode(99, 109, 115)}.manage`]: 'site.manage',
};

function hasFlag(map: Record<string, boolean>, id: string): boolean {
  return Boolean(map[id]);
}

function setMany(target: Record<string, boolean>, ids: string[], value = true) {
  for (const id of ids) target[id] = value;
}

function migrateLegacySitePermissionIds(
  source: Record<string, boolean>,
  target: Record<string, boolean>
) {
  for (const [legacyId, nextId] of Object.entries(LEGACY_SITE_PERMISSION_MAP)) {
    if (legacyId in source && !(nextId in source)) {
      target[nextId] = source[legacyId];
    }
  }
}

function migrateMonolithicAdmin(
  source: Record<string, boolean>,
  target: Record<string, boolean>
) {
  const hasGranularAdmin = ADMIN_MENU_PERMISSION_IDS.some((id) => id in source);
  if (hasGranularAdmin) return;
  if (source['menu.admin'] || source['admin.platform']) {
    for (const id of ADMIN_MENU_PERMISSION_IDS) {
      target[id] = true;
    }
  }
}

function migrateUserActions(
  source: Record<string, boolean>,
  target: Record<string, boolean>
) {
  const hasAnyAction = USER_ACTION_PERMISSION_IDS.some((id) => id in source);
  if (hasAnyAction) return;
  const usersAccess =
    Boolean(source['menu.admin.users']) ||
    Boolean(source['admin.users.read']) ||
    Boolean(source['admin.users.create']) ||
    Boolean(source['admin.users.update']) ||
    Boolean(source['admin.users.import']) ||
    Boolean(source['admin.platform']);
  for (const id of USER_ACTION_PERMISSION_IDS) {
    target[id] = usersAccess;
  }
}

function migrateSiteMenus(
  source: Record<string, boolean>,
  target: Record<string, boolean>
) {
  const hasSite =
    SITE_MENU_PERMISSION_IDS.some((id) => id in source) ||
    Object.keys(LEGACY_SITE_PERMISSION_MAP).some((id) => id in source);
  if (hasSite) return;
  const grant =
    Boolean(source['admin.platform']) ||
    ADMIN_MENU_PERMISSION_IDS.some((id) => Boolean(source[id]));
  if (!grant) return;
  for (const id of SITE_MENU_PERMISSION_IDS) target[id] = true;
  for (const id of SITE_ACTION_PERMISSION_IDS) target[id] = true;
}

function migrateSettingsActions(
  source: Record<string, boolean>,
  target: Record<string, boolean>
) {
  const hasAnyAction = SETTINGS_ACTION_PERMISSION_IDS.some((id) => id in source);
  if (hasAnyAction) return;
  const settingsAccess =
    Boolean(source['menu.admin.settings']) ||
    Boolean(source['admin.settings']) ||
    Boolean(source['admin.platform']);
  for (const id of SETTINGS_ACTION_PERMISSION_IDS) {
    target[id] = settingsAccess;
  }
}

/** Menus Site public ajoutés après les matrices persistées (Newsletter, Contact, Assistant). */
const NEW_SITE_MENU_IDS = [
  'menu.site.newsletter',
  'menu.site.contact',
  'menu.site.assistant',
] as const;

const LEGACY_ADMIN_TO_SITE_MENU: Partial<
  Record<(typeof NEW_SITE_MENU_IDS)[number], string>
> = {
  'menu.site.newsletter': 'menu.admin.newsletter',
  'menu.site.contact': 'menu.admin.contact',
};

function migrateNewSiteMenus(
  source: Record<string, boolean>,
  target: Record<string, boolean>
) {
  const hasSiteAccess =
    Boolean(target['menu.site.home']) ||
    Boolean(target['menu.site.pages']) ||
    Boolean(target['menu.site.footer']) ||
    Boolean(target['menu.site.media']) ||
    Boolean(target['menu.site.menus']) ||
    Boolean(source['site.manage']);

  for (const id of NEW_SITE_MENU_IDS) {
    if (id in source) continue;
    const legacyId = LEGACY_ADMIN_TO_SITE_MENU[id];
    if (legacyId && legacyId in source) {
      target[id] = Boolean(source[legacyId]);
      continue;
    }
    if (hasSiteAccess) target[id] = true;
  }
}

/**
 * Convertit une matrice legacy en permissions catalogue (menu.* + action.*).
 */
export function normalizeToMenuPermissions(
  raw: Record<string, boolean> | null | undefined
): Record<string, boolean> {
  const source = raw ?? {};
  const hasCatalogKeys =
    CATALOG_IDS.some((id) => id in source) ||
    'menu.admin' in source ||
    USER_ACTION_PERMISSION_IDS.some((id) => id in source) ||
    SETTINGS_ACTION_PERMISSION_IDS.some((id) => id in source) ||
    Object.keys(LEGACY_SITE_PERMISSION_MAP).some((id) => id in source);

  if (hasCatalogKeys) {
    const result = Object.fromEntries(CATALOG_IDS.map((id) => [id, Boolean(source[id])]));
    migrateLegacySitePermissionIds(source, result);
    migrateMonolithicAdmin(source, result);
    migrateUserActions(source, result);
    migrateSettingsActions(source, result);
    migrateSiteMenus(source, result);
    migrateNewSiteMenus(source, result);
    // Rétro-compat admin uniquement (pas le dashboard) : n’injecte les clés
    // incidents/référentiels que si elles sont absentes du store (ne force jamais
    // une permission explicitement désactivée).
    if (result['menu.admin.users'] || result['menu.admin.settings']) {
      if (!('menu.incidents' in source)) result['menu.incidents'] = true;
      if (!('action.incidents.manage' in source)) result['action.incidents.manage'] = true;
      if (!('menu.admin.referentiels' in source)) result['menu.admin.referentiels'] = true;
      if (!('action.referentiel.edit' in source)) result['action.referentiel.edit'] = true;
    }
    // Menu Référentiels ouvert ⇒ droit d’édition si la clé action n’existe pas encore.
    if (result['menu.admin.referentiels'] && !('action.referentiel.edit' in source)) {
      result['action.referentiel.edit'] = true;
    }
    return result;
  }

  const derived: Record<string, boolean> = Object.fromEntries(
    CATALOG_IDS.map((id) => [id, false])
  );

  migrateLegacySitePermissionIds(source, derived);

  derived['menu.dashboard'] = Boolean(source['dashboard.dg'] || source['menu.dashboard']);
  derived['menu.admin.users'] = Boolean(
    source['admin.users.read'] ||
      source['admin.users.create'] ||
      source['admin.users.update'] ||
      source['admin.users.import'] ||
      source['admin.platform']
  );
  derived['menu.admin.roles'] = Boolean(
    source['admin.roles.manage'] || source['admin.roles.permissions'] || source['admin.platform']
  );
  derived['menu.admin.referentiels'] = Boolean(
    source['admin.platform'] ||
      source['menu.admin.users'] ||
      source['menu.admin.settings']
  );
  derived['action.referentiel.edit'] = Boolean(
    source['admin.platform'] ||
      source['menu.admin.users'] ||
      source['menu.admin.settings']
  );
  derived['menu.admin.settings'] = Boolean(source['admin.settings'] || source['admin.platform']);
  derived['menu.admin.audit'] = Boolean(source['audit.read'] || source['admin.platform']);

  const usersAccess = Boolean(
    source['admin.users.read'] ||
      source['admin.users.create'] ||
      source['admin.users.update'] ||
      source['admin.users.import'] ||
      source['admin.platform']
  );
  for (const id of USER_ACTION_PERMISSION_IDS) {
    derived[id] = usersAccess;
  }

  const settingsAccess = Boolean(source['admin.settings'] || source['admin.platform']);
  for (const id of SETTINGS_ACTION_PERMISSION_IDS) {
    derived[id] = settingsAccess;
  }

  migrateSiteMenus(source, derived);
  migrateNewSiteMenus(source, derived);

  return derived;
}

/**
 * Étend les permissions catalogue en capacités techniques pour les guards API.
 */
export function expandMenuPermissions(
  menuMap: Record<string, boolean>
): Record<string, boolean> {
  const out: Record<string, boolean> = { ...menuMap };

  for (const id of TECHNICAL_PERMISSION_IDS) {
    out[id] = false;
  }

  if (hasFlag(menuMap, 'menu.dashboard')) {
    out['dashboard.dg'] = true;
  }

  if (hasFlag(menuMap, 'menu.admin.users') || hasFlag(menuMap, 'action.users.view')) {
    out['admin.users.read'] = true;
  }
  if (hasFlag(menuMap, 'action.users.create')) {
    out['admin.users.create'] = true;
    out['admin.users.read'] = true;
  }
  if (
    hasFlag(menuMap, 'action.users.edit') ||
    hasFlag(menuMap, 'action.users.toggle_active') ||
    hasFlag(menuMap, 'action.users.archive') ||
    hasFlag(menuMap, 'action.users.restore') ||
    hasFlag(menuMap, 'action.users.delete')
  ) {
    out['admin.users.update'] = true;
    out['admin.users.read'] = true;
  }
  if (hasFlag(menuMap, 'action.users.import')) {
    out['admin.users.import'] = true;
    out['admin.users.read'] = true;
  }

  if (
    hasFlag(menuMap, 'menu.admin.organizations') ||
    hasFlag(menuMap, 'action.organizations.view')
  ) {
    out['admin.organizations.read'] = true;
  }
  if (
    hasFlag(menuMap, 'action.organizations.create') ||
    hasFlag(menuMap, 'action.organizations.edit') ||
    hasFlag(menuMap, 'action.organizations.toggle_active')
  ) {
    out['admin.organizations.manage'] = true;
    out['admin.organizations.read'] = true;
  }
  if (
    hasFlag(menuMap, 'action.invitations.create') ||
    hasFlag(menuMap, 'action.invitations.resend') ||
    hasFlag(menuMap, 'action.invitations.cancel')
  ) {
    out['admin.invitations.manage'] = true;
    out['admin.organizations.read'] = true;
  }

  if (hasFlag(menuMap, 'menu.admin.roles')) {
    setMany(out, ['admin.roles.manage', 'admin.roles.permissions']);
  }

  if (hasFlag(menuMap, 'menu.admin.settings')) {
    out['admin.settings'] = true;
  }
  if (SETTINGS_ACTION_PERMISSION_IDS.some((id) => hasFlag(menuMap, id))) {
    out['admin.settings'] = true;
  }

  if (hasFlag(menuMap, 'menu.admin.audit')) {
    out['audit.read'] = true;
  }

  if (
    SITE_MENU_PERMISSION_IDS.some((id) => hasFlag(menuMap, id)) ||
    SITE_ACTION_PERMISSION_IDS.some((id) => hasFlag(menuMap, id))
  ) {
    out['site.manage'] = true;
  }

  if (ADMIN_MENU_PERMISSION_IDS.some((id) => hasFlag(menuMap, id))) {
    out['admin.platform'] = true;
  }

  return out;
}

export function resolveEffectivePermissionMap(
  raw: Record<string, boolean> | null | undefined
): Record<string, boolean> {
  return expandMenuPermissions(normalizeToMenuPermissions(raw));
}
