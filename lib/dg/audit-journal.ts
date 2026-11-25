import type { DgRole } from '@/lib/dg/rbac';
import { dgRoleLabel } from '@/lib/dg/role-labels';

export type AuditActionCategory = 'LOGIN' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'BUSINESS' | 'OTHER';

export type AuditJournalEntry = {
  id: string;
  createdAt: string;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: DgRole;
    roleLabel: string;
  };
  actionCode: string;
  actionLabel: string;
  category: AuditActionCategory;
  description: string;
  resourceType: string;
  resourceLabel: string;
  comments: string[];
  ip: string | null;
};

export type AuditJournalStats = {
  actions24h: number;
  actions24hTrendPct: number;
  logins24h: number;
  businessOps24h: number;
  activeUsers24h: number;
};

export type AuditJournalFilters = {
  q?: string;
  category?: AuditActionCategory | 'ALL';
  userId?: string;
  from?: string;
  to?: string;
};

const ACTION_LABELS: Record<string, string> = {
  login: 'Connexion',
  'auth.login': 'Connexion',
  'admin.user.create': 'Création utilisateur',
  'admin.user.update': 'Modification utilisateur',
  'admin.user.delete': 'Suppression utilisateur',
  'admin.users.import': 'Import utilisateurs',
  'admin.users.ad_import': 'Import AD',
  'admin.users.trash.empty': 'Vidage corbeille utilisateurs',
  'admin.settings.update': 'Modification paramètres',
  'admin.roles.update': 'Modification rôles',
  'site.update': 'Modification site',
  'site.news.auto_sync': 'Sync. actualités',
  'site.news.scrape': 'Collecte actualités',
  'site.news.refresh_dates': 'Rafraîchissement dates actus',
  'referential.create': 'Création référentiel',
  'referential.update': 'Modification référentiel',
  'referential.archive': 'Mise en corbeille référentiel',
  'referential.restore': 'Restauration référentiel',
  'referential.purge': 'Suppression définitive référentiel',
  'referential.trash.empty': 'Vidage corbeille référentiels',
  'incident.create': 'Création signalement',
  'incident.update': 'Qualification incident',
  'incident.archive': 'Mise en corbeille incident',
  'incident.restore': 'Restauration incident',
  'incident.delete': 'Suppression définitive incident',
  'incident.note': 'Note d’investigation',
  'incident.reply': 'Réponse au déclarant',
  export: 'Export',
};

/** Anciens codes `cms.*` : on les lit comme `site.*`, sans afficher « cms ». */
export function canonicalAuditAction(actionCode: string): string {
  return actionCode.replace(/(^|\.)cms\./gi, '$1site.')
}

export function resolveActionCategory(actionCode: string): AuditActionCategory {
  const a = canonicalAuditAction(actionCode).toLowerCase();
  if (a.includes('login') || a.startsWith('auth.')) return 'LOGIN';
  if (a.includes('export') || a.includes('import')) return 'EXPORT';
  if (a.includes('delete') || a.includes('purge') || a.includes('archive')) return 'DELETE';
  if (a.includes('restore')) return 'UPDATE';
  if (a.startsWith('incident.') || a.startsWith('signalement.') || a.startsWith('referential.')) {
    return 'BUSINESS';
  }
  if (
    a.includes('update') ||
    a.includes('create') ||
    a.startsWith('admin.') ||
    a.startsWith('site.')
  ) {
    return 'UPDATE';
  }
  return 'OTHER';
}

export function resolveActionLabel(actionCode: string): string {
  const code = canonicalAuditAction(actionCode)
  if (ACTION_LABELS[code]) return ACTION_LABELS[code];
  const cat = resolveActionCategory(code);
  if (cat === 'LOGIN') return 'Connexion';
  if (cat === 'UPDATE') return 'Modification';
  if (cat === 'DELETE') return 'Suppression';
  if (cat === 'EXPORT') return 'Export';
  if (cat === 'BUSINESS') return 'Opération métier';
  return code;
}

export function buildAuditDescription(
  user: { firstName: string; lastName: string },
  actionLabel: string,
  target?: string
): string {
  const name = `${user.firstName} ${user.lastName}`.trim();
  const verb = actionLabel.toLowerCase();
  if (target) {
    return `${name} a effectué l'action « ${verb} » sur ${target}.`;
  }
  return `${name} a effectué l'action « ${verb} ».`;
}

export function normalizeDgAuditRow(input: {
  id: string;
  createdAt: Date;
  userId: string;
  action: string;
  meta: unknown;
  user: { firstName: string; lastName: string; email: string; role: DgRole };
}): AuditJournalEntry {
  const meta =
    input.meta && typeof input.meta === 'object' && !Array.isArray(input.meta)
      ? (input.meta as Record<string, unknown>)
      : {};
  const action = canonicalAuditAction(input.action);
  const actionLabel = resolveActionLabel(action);
  const category = resolveActionCategory(action);
  const target =
    typeof meta.reference === 'string'
      ? meta.reference
      : typeof meta.email === 'string'
        ? meta.email
        : typeof meta.target === 'string'
          ? meta.target
          : typeof meta.userId === 'string'
            ? meta.userId
            : undefined;
  const comments: string[] = [];
  if (typeof meta.comment === 'string') comments.push(meta.comment);
  if (typeof meta.note === 'string') comments.push(meta.note);
  if (typeof meta.summary === 'string') comments.push(meta.summary);
  if (category === 'LOGIN' && typeof meta.otp === 'boolean' && meta.otp) {
    comments.push('Connexion validée par OTP');
  }
  if (target && !comments.some((c) => c.includes(target))) {
    comments.push(`Cible : ${target}`);
  }

  return {
    id: input.id,
    createdAt: input.createdAt.toISOString(),
    userId: input.userId,
    user: {
      firstName: input.user.firstName,
      lastName: input.user.lastName,
      email: input.user.email,
      role: input.user.role,
      roleLabel: dgRoleLabel(input.user.role),
    },
    actionCode: action,
    actionLabel,
    category,
    description: buildAuditDescription(input.user, actionLabel, target),
    resourceType:
      typeof meta.resource === 'string'
        ? meta.resource
        : action.startsWith('incident.')
          ? 'Incident'
          : action.startsWith('site.')
            ? 'Site'
            : category === 'LOGIN' || action.includes('user')
              ? 'User'
              : 'Platform',
    resourceLabel: target ?? '—',
    comments,
    ip: typeof meta.ip === 'string' ? meta.ip : null,
  };
}

export function filterAuditEntries(
  items: AuditJournalEntry[],
  filters: AuditJournalFilters
): AuditJournalEntry[] {
  const q = filters.q?.trim().toLowerCase();
  const from = filters.from ? new Date(filters.from).getTime() : null;
  const to = filters.to ? new Date(filters.to).getTime() : null;

  return items.filter((row) => {
    if (filters.category && filters.category !== 'ALL' && row.category !== filters.category) {
      return false;
    }
    if (filters.userId && row.userId !== filters.userId) return false;
    const t = new Date(row.createdAt).getTime();
    if (from !== null && t < from) return false;
    if (to !== null && t > to) return false;
    if (!q) return true;
    const haystack = [
      row.description,
      row.user.email,
      row.user.firstName,
      row.user.lastName,
      row.actionLabel,
      row.actionCode,
      row.resourceType,
      row.resourceLabel,
      row.ip ?? '',
      ...row.comments,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function computeAuditStats(
  all: AuditJournalEntry[],
  filtered: AuditJournalEntry[]
): { stats: AuditJournalStats; dominant: { label: string; count: number }[] } {
  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  const inLast24h = (iso: string) => now - new Date(iso).getTime() <= h24;
  const inPrev24h = (iso: string) => {
    const age = now - new Date(iso).getTime();
    return age > h24 && age <= 2 * h24;
  };

  const last24 = all.filter((r) => inLast24h(r.createdAt));
  const prev24 = all.filter((r) => inPrev24h(r.createdAt));
  const actions24h = last24.length;
  const prevCount = prev24.length;
  const actions24hTrendPct =
    prevCount === 0 ? (actions24h > 0 ? 100 : 0) : Math.round(((actions24h - prevCount) / prevCount) * 100);

  const logins24h = last24.filter((r) => r.category === 'LOGIN').length;
  const businessOps24h = last24.filter((r) => r.category === 'BUSINESS' || r.category === 'UPDATE').length;
  const activeUsers24h = new Set(last24.map((r) => r.userId)).size;

  const counts = new Map<string, number>();
  for (const row of filtered) {
    counts.set(row.actionLabel, (counts.get(row.actionLabel) ?? 0) + 1);
  }
  const dominant = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));

  return {
    stats: {
      actions24h,
      actions24hTrendPct,
      logins24h,
      businessOps24h,
      activeUsers24h,
    },
    dominant,
  };
}
