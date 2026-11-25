import { parseAssigneeEmails } from '@/lib/csirt/incident-assignment-email'
import { canAdminPlatform, type DgRole } from '@/lib/dg/rbac'
import { isDgRole, type RoleId } from '@/lib/dg/role-ids'
import { userHasPermission } from '@/lib/auth/permission-guard'
import type { CsirtIncident } from '@/lib/types/incident'

export type IncidentActor = {
  userId: string
  email: string
  role: RoleId | DgRole
}

/** L’incident est-il assigné à cet utilisateur (e-mail ou id) ? */
export function isIncidentAssignedToActor(
  incident: CsirtIncident,
  actor: Pick<IncidentActor, 'userId' | 'email'>
): boolean {
  const email = actor.email.trim().toLowerCase()
  if (email) {
    const emails = parseAssigneeEmails(incident.assignedTo?.email)
    if (emails.includes(email)) return true
  }

  const rawIds = incident.assignedTo?.id || ''
  if (!rawIds.trim() || !actor.userId) return false
  return rawIds
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .includes(actor.userId)
}

/**
 * Voir tous les signalements (admin) vs uniquement ceux assignés (analyste).
 * Les administrateurs (ASSISTANT) voient toujours tout.
 */
export async function canViewAllIncidents(role: RoleId | DgRole): Promise<boolean> {
  if (isDgRole(role) && canAdminPlatform(role)) return true
  return userHasPermission(role, 'action.incidents.view_all')
}

export async function assertCanAccessIncident(
  incident: CsirtIncident | null | undefined,
  actor: IncidentActor
): Promise<{ ok: true } | { ok: false; error: 'NOT_FOUND' | 'FORBIDDEN' }> {
  if (!incident) return { ok: false, error: 'NOT_FOUND' }
  if (await canViewAllIncidents(actor.role)) return { ok: true }
  if (isIncidentAssignedToActor(incident, actor)) return { ok: true }
  return { ok: false, error: 'FORBIDDEN' }
}
