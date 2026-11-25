import type { DgRole } from '@/lib/dg/rbac';

export const DG_ROLE_LABELS: Record<DgRole, string> = {
  ASSISTANT: 'Administrateur',
  DG: 'Direction',
  MANAGER: 'Agent',
  EXTERNAL: 'Invité',
  CORRESPONDANT: 'Correspondant',
};

export function dgRoleLabel(role: DgRole): string {
  return DG_ROLE_LABELS[role] ?? role;
}

export function userInitials(firstName: string, lastName: string): string {
  const a = firstName.trim()[0] ?? '';
  const b = lastName.trim()[0] ?? '';
  return (a + b).toUpperCase() || '?';
}
