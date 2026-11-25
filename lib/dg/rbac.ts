export type DgRole = 'DG' | 'ASSISTANT' | 'MANAGER' | 'EXTERNAL' | 'CORRESPONDANT';

export function parseDgRole(raw: string | null | undefined): DgRole {
  if (
    raw === 'DG' ||
    raw === 'ASSISTANT' ||
    raw === 'MANAGER' ||
    raw === 'EXTERNAL' ||
    raw === 'CORRESPONDANT'
  ) {
    return raw;
  }
  return 'MANAGER';
}

/** Administratrice de la plateforme : utilisateurs, import, paramétrage. */
export function canAdminPlatform(role: DgRole) {
  return role === 'ASSISTANT';
}
