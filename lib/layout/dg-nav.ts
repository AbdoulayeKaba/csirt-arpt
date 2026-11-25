import type { LucideIcon } from 'lucide-react';
import {
  Bookmark,
  Contact,
  FileText,
  Bell,
  Globe,
  Home,
  Images,
  LayoutDashboard,
  Mail,
  Menu,
  MessageCircleQuestion,
  PanelBottom,
  ScrollText,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  UserCog,
  Users,
} from 'lucide-react';
import type { DgRole } from '@/lib/dg/rbac';
import { hasAnyPermission } from '@/lib/dg/role-access';
import {
  ADMIN_MENU_PERMISSION_IDS,
  SITE_MENU_PERMISSION_IDS,
} from '@/lib/dg/permission-catalog';
import { DG_SITE_ROUTES, isSitePublicNavActive } from '@/lib/dg/site-routes';

export type DgNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: DgRole[];
  /** Au moins une de ces permissions suffit (prioritaire sur `roles` si map fournie). */
  permissions?: string[];
  /** Masquer l'entrée si l’utilisateur possède l’une de ces permissions. */
  denyPermissions?: string[];
};

export type DgNavSection = {
  title: string;
  items: DgNavItem[];
  roles?: DgRole[];
  permissions?: string[];
  /** Section repliable (ex. Administration) */
  collapsible?: boolean;
  /** Une seule destination : le titre est le lien, sans sous-entrée. */
  linkOnly?: boolean;
  sectionIcon?: LucideIcon;
  /** Ouverte par défaut et non repliable (ex. Administration). */
  defaultOpen?: boolean;
};

export const DG_SITE_NAV_ITEMS: DgNavItem[] = [
  {
    label: 'Accueil',
    href: DG_SITE_ROUTES.home,
    icon: Home,
    permissions: ['menu.site.home'],
  },
  {
    label: 'Pages',
    href: DG_SITE_ROUTES.pages,
    icon: FileText,
    permissions: ['menu.site.pages'],
  },
  {
    label: 'Médiathèque',
    href: DG_SITE_ROUTES.media,
    icon: Images,
    permissions: ['menu.site.media'],
  },
  {
    label: 'Menus',
    href: DG_SITE_ROUTES.menus,
    icon: Menu,
    permissions: ['menu.site.menus'],
  },
  {
    label: 'Pied de page',
    href: DG_SITE_ROUTES.footer,
    icon: PanelBottom,
    permissions: ['menu.site.footer'],
  },
  {
    label: 'Newsletter',
    href: DG_SITE_ROUTES.newsletter,
    icon: Mail,
    permissions: ['menu.site.newsletter'],
  },
  {
    label: 'Contact',
    href: DG_SITE_ROUTES.contact,
    icon: Contact,
    permissions: ['menu.site.contact'],
  },
  {
    label: 'Assistant',
    href: DG_SITE_ROUTES.assistant,
    icon: MessageCircleQuestion,
    permissions: ['menu.site.assistant'],
  },
];

/** Alertes du site public, saisies manuellement et classées par catégorie. */
export const DG_ALERTS_NAV_ITEMS: DgNavItem[] = [
  {
    label: 'Alertes',
    href: DG_SITE_ROUTES.collected,
    icon: Bell,
    permissions: ['menu.site.news'],
  },
];

export const DG_ADMIN_NAV_ITEMS: DgNavItem[] = [
  {
    label: 'Utilisateurs',
    href: '/dg/admin/users',
    icon: Users,
    permissions: ['menu.admin.users'],
  },
  {
    label: 'Rôles & permissions',
    href: '/dg/admin/roles',
    icon: UserCog,
    permissions: ['menu.admin.roles'],
  },
  {
    label: 'Référentiels',
    href: '/dg/admin/referentiels',
    icon: Bookmark,
    permissions: ['menu.admin.referentiels'],
  },
  {
    label: 'Paramètres',
    href: '/dg/admin/settings',
    icon: Settings,
    permissions: ['menu.admin.settings'],
  },
  {
    label: "Journal d'audit",
    href: '/dg/audit',
    icon: ScrollText,
    permissions: ['menu.admin.audit'],
  },
];

export const DG_NAV_SECTIONS: DgNavSection[] = [
  {
    title: 'Console',
    items: [
      {
        label: 'Tableau de bord',
        href: '/dashboard',
        icon: LayoutDashboard,
        permissions: ['menu.dashboard'],
      },
      {
        label: 'Signalements & Incidents',
        href: '/dg/incidents',
        icon: ShieldAlert,
        permissions: ['menu.incidents'],
      },
    ],
  },
  {
    title: 'Site public',
    permissions: [...SITE_MENU_PERMISSION_IDS],
    collapsible: true,
    defaultOpen: true,
    sectionIcon: Globe,
    items: DG_SITE_NAV_ITEMS,
  },
  {
    title: 'Alertes',
    permissions: ['menu.site.news'],
    linkOnly: true,
    sectionIcon: Bell,
    items: DG_ALERTS_NAV_ITEMS,
  },
  {
    title: 'Administration',
    permissions: [...ADMIN_MENU_PERMISSION_IDS],
    collapsible: true,
    defaultOpen: true,
    sectionIcon: SlidersHorizontal,
    items: DG_ADMIN_NAV_ITEMS,
  },
];

function canAccessNavItem(
  item: DgNavItem,
  role: DgRole,
  permissionMap?: Record<string, boolean>
): boolean {
  if (permissionMap) {
    if (item.denyPermissions?.length && hasAnyPermission(permissionMap, item.denyPermissions)) {
      return false;
    }
    if (item.permissions?.length) {
      return item.permissions.some((id) => permissionMap[id] === true);
    }
    return !item.roles || item.roles.includes(role);
  }
  if (item.denyPermissions?.length) return false;
  return !item.roles || item.roles.includes(role);
}

function canAccessNavSection(
  section: DgNavSection,
  role: DgRole,
  permissionMap?: Record<string, boolean>
): boolean {
  if (permissionMap && section.permissions?.length) {
    return section.permissions.some((id) => permissionMap[id] === true);
  }
  if (permissionMap) {
    return true;
  }
  return !section.roles || section.roles.includes(role);
}

export function filterDgNav(
  sections: DgNavSection[],
  role: DgRole,
  permissionMap?: Record<string, boolean>
): DgNavSection[] {
  return sections
    .filter((section) => canAccessNavSection(section, role, permissionMap))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessNavItem(item, role, permissionMap)),
    }))
    .filter((section) => section.items.length > 0);
}

export function isDgAppPath(pathname: string): boolean {
  return (
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname.startsWith('/dg') ||
    pathname === '/account' ||
    pathname.startsWith('/account/')
  );
}

export function isSiteNavActive(pathname: string): boolean {
  return isSitePublicNavActive(pathname);
}

export function isAdminNavActive(pathname: string): boolean {
  return (
    pathname.startsWith('/dg/admin') ||
    pathname === '/dg/audit' ||
    pathname.startsWith('/dg/audit/')
  );
}
