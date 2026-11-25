/**
 * Règle de rétention automatique des éléments de la corbeille.
 * Tous les éléments archivés / mis en corbeille sont purgés définitivement après 3 mois (90 jours).
 */

export const TRASH_RETENTION_DAYS = 90; // 3 mois
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Retourne la date limite avant laquelle les éléments archivés sont considérés comme expirés.
 */
export function getTrashCutoffDate(days = TRASH_RETENTION_DAYS): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Vérifie si un élément archivé a dépassé la période de rétention de 3 mois.
 */
export function isExpiredTrash(
  archivedAt: string | Date | null | undefined,
  maxAgeDays = TRASH_RETENTION_DAYS
): boolean {
  if (!archivedAt) return false;
  const time = typeof archivedAt === 'string' ? Date.parse(archivedAt) : archivedAt.getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time > maxAgeDays * 24 * 60 * 60 * 1000;
}

/**
 * Calcule le nombre de jours restants avant purge définitive d'un élément en corbeille.
 */
export function getRemainingTrashDays(
  archivedAt: string | Date | null | undefined,
  maxAgeDays = TRASH_RETENTION_DAYS
): number {
  if (!archivedAt) return maxAgeDays;
  const time = typeof archivedAt === 'string' ? Date.parse(archivedAt) : archivedAt.getTime();
  if (Number.isNaN(time)) return maxAgeDays;
  const elapsedMs = Date.now() - time;
  const remainingMs = maxAgeDays * 24 * 60 * 60 * 1000 - elapsedMs;
  return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
}
