import type { DgRole } from '@/lib/dg/rbac';

export type PermissionDefinition = {
  id: string;
  label: string;
  categoryId: string;
};

export type PermissionCategory = {
  id: string;
  label: string;
  icon?: 'admin' | 'audit' | 'pilotage' | 'users' | 'settings' | 'site';
};

/** Catalogue affiché dans Gestion des rôles. */
export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  { id: 'pilotage', label: 'Pilotage', icon: 'pilotage' },
  { id: 'site_public', label: 'Site public', icon: 'site' },
  { id: 'actions_users', label: 'Actions utilisateurs', icon: 'users' },
  { id: 'actions_settings', label: 'Actions paramètres système', icon: 'settings' },
  { id: 'administration', label: 'Administration', icon: 'admin' },
];

/** Sous-menus Administration (sidebar). */
export const ADMIN_MENU_PERMISSION_IDS = [
  'menu.admin.users',
  'menu.admin.organizations',
  'menu.admin.roles',
  'menu.admin.referentiels',
  'menu.admin.settings',
  'menu.admin.audit',
] as const;

/** Boutons d’action de la gestion des utilisateurs. */
export const USER_ACTION_PERMISSION_IDS = [
  'action.users.view',
  'action.users.create',
  'action.users.edit',
  'action.users.toggle_active',
  'action.users.archive',
  'action.users.restore',
  'action.users.delete',
  'action.users.import',
] as const;

/** Organisations partenaires & invitations correspondants. */
export const ORGANIZATION_ACTION_PERMISSION_IDS = [
  'action.organizations.view',
  'action.organizations.create',
  'action.organizations.edit',
  'action.organizations.toggle_active',
  'action.invitations.create',
  'action.invitations.resend',
  'action.invitations.cancel',
] as const;

/** Menus Site public — contenu du site public. */
export const SITE_MENU_PERMISSION_IDS = [
  'menu.site.dashboard',
  'menu.site.home',
  'menu.site.pages',
  'menu.site.news',
  'menu.site.media',
  'menu.site.menus',
  'menu.site.footer',
  'menu.site.newsletter',
  'menu.site.contact',
  'menu.site.assistant',
] as const;

export const SITE_ACTION_PERMISSION_IDS = ['action.site.edit'] as const;
export const SETTINGS_ACTION_PERMISSION_IDS = [
  'action.settings.general',
  'action.settings.notifications',
  'action.settings.security',
  'action.settings.integrations',
] as const;

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  { id: 'menu.dashboard', label: 'Dashboard', categoryId: 'pilotage' },
  { id: 'menu.incidents', label: 'Signalements & Incidents', categoryId: 'pilotage' },
  { id: 'action.incidents.view_all', label: 'Voir tous les signalements (pas seulement les siens)', categoryId: 'pilotage' },
  { id: 'action.incidents.manage', label: 'Qualifier & traiter les incidents', categoryId: 'pilotage' },
  { id: 'action.incidents.resolve', label: 'Clôturer & résoudre les incidents', categoryId: 'pilotage' },
  { id: 'action.incidents.delete', label: 'Supprimer / archiver les incidents', categoryId: 'pilotage' },
  { id: 'menu.site.dashboard', label: 'Vue d’ensemble du site', categoryId: 'site_public' },
  { id: 'menu.site.home', label: 'Accueil', categoryId: 'site_public' },
  { id: 'menu.site.pages', label: 'Pages', categoryId: 'site_public' },
  { id: 'menu.site.news', label: 'Sources & actualités', categoryId: 'site_public' },
  { id: 'menu.site.media', label: 'Médiathèque', categoryId: 'site_public' },
  { id: 'menu.site.menus', label: 'Menus & sous-menus', categoryId: 'site_public' },
  { id: 'menu.site.footer', label: 'Pied de page', categoryId: 'site_public' },
  { id: 'menu.site.newsletter', label: 'Newsletter', categoryId: 'site_public' },
  { id: 'menu.site.contact', label: 'Contact', categoryId: 'site_public' },
  { id: 'menu.site.assistant', label: 'Assistant (FAQ)', categoryId: 'site_public' },
  { id: 'action.site.edit', label: 'Publier les contenus du site', categoryId: 'site_public' },
  { id: 'action.users.view', label: 'Voir le détail', categoryId: 'actions_users' },
  { id: 'action.users.create', label: 'Nouvel utilisateur', categoryId: 'actions_users' },
  { id: 'action.users.edit', label: 'Modifier', categoryId: 'actions_users' },
  { id: 'action.users.toggle_active', label: 'Activer / Désactiver', categoryId: 'actions_users' },
  { id: 'action.users.archive', label: 'Corbeille', categoryId: 'actions_users' },
  { id: 'action.users.restore', label: 'Restaurer', categoryId: 'actions_users' },
  { id: 'action.users.delete', label: 'Supprimer définitivement', categoryId: 'actions_users' },
  { id: 'action.users.import', label: 'Importer AD / LDAP', categoryId: 'actions_users' },
  { id: 'action.organizations.view', label: 'Voir les organisations partenaires', categoryId: 'actions_users' },
  { id: 'action.organizations.create', label: 'Créer une organisation partenaire', categoryId: 'actions_users' },
  { id: 'action.organizations.edit', label: 'Modifier une organisation partenaire', categoryId: 'actions_users' },
  { id: 'action.organizations.toggle_active', label: 'Activer / désactiver une organisation', categoryId: 'actions_users' },
  { id: 'action.invitations.create', label: 'Inviter un correspondant', categoryId: 'actions_users' },
  { id: 'action.invitations.resend', label: 'Renvoyer une invitation', categoryId: 'actions_users' },
  { id: 'action.invitations.cancel', label: 'Annuler une invitation', categoryId: 'actions_users' },
  { id: 'action.settings.general', label: 'Général', categoryId: 'actions_settings' },
  { id: 'action.settings.notifications', label: 'Notifications', categoryId: 'actions_settings' },
  { id: 'action.settings.security', label: 'Sécurité', categoryId: 'actions_settings' },
  { id: 'action.settings.integrations', label: 'Intégrations', categoryId: 'actions_settings' },
  { id: 'menu.admin.users', label: 'Utilisateurs', categoryId: 'administration' },
  { id: 'menu.admin.organizations', label: 'Organisations partenaires', categoryId: 'administration' },
  { id: 'menu.admin.roles', label: 'Rôles & Permissions', categoryId: 'administration' },
  { id: 'menu.admin.referentiels', label: 'Référentiels', categoryId: 'administration' },
  { id: 'action.referentiel.edit', label: 'Gérer les référentiels & thématiques', categoryId: 'administration' },
  { id: 'menu.admin.settings', label: 'Paramètres', categoryId: 'administration' },
  { id: 'menu.admin.audit', label: "Journal d'audit", categoryId: 'administration' },
];

const CATALOG_IDS = PERMISSION_CATALOG.map((p) => p.id);

function catalogFlags(enabled: string[]): Record<string, boolean> {
  return Object.fromEntries(CATALOG_IDS.map((id) => [id, enabled.includes(id)]));
}

/** Matrice par défaut (menus + actions). */
export const DEFAULT_ROLE_PERMISSIONS: Record<DgRole, Record<string, boolean>> = {
  ASSISTANT: catalogFlags(CATALOG_IDS),
  DG: catalogFlags(['menu.dashboard']),
  MANAGER: catalogFlags(['menu.dashboard']),
  EXTERNAL: catalogFlags(['menu.dashboard']),
  /** Accès CSIRT limité — le signalement authentifié sera branché à l’étape 3. */
  CORRESPONDANT: catalogFlags([]),
};

const VISIBLE_PERMISSION_IDS = new Set<string>(CATALOG_IDS);

export function catalogByCategory() {
  return PERMISSION_CATEGORIES.map((cat) => ({
    ...cat,
    permissions: PERMISSION_CATALOG.filter((p) => p.categoryId === cat.id && VISIBLE_PERMISSION_IDS.has(p.id)),
  })).filter((cat) => cat.permissions.length > 0);
}

export function isVisiblePermissionId(id: string): boolean {
  return VISIBLE_PERMISSION_IDS.has(id);
}

export function isMenuPermissionId(id: string): boolean {
  return id.startsWith('menu.');
}

export function isActionPermissionId(id: string): boolean {
  return id.startsWith('action.');
}

export function hasAnyAdminMenuPermission(map: Record<string, boolean>): boolean {
  return ADMIN_MENU_PERMISSION_IDS.some((id) => Boolean(map[id]));
}

export function hasAnySiteMenuPermission(map: Record<string, boolean>): boolean {
  return SITE_MENU_PERMISSION_IDS.some((id) => Boolean(map[id]));
}
