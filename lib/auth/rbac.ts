/**
 * Rôle applicatif porté par la session (hors rôles métier CSIRT).
 * Les anciennes valeurs RH (pointage) sont ramenées au rôle unique.
 */

export type AppRoleKey = 'employee';

export function parseAppRole(raw: string | null | undefined): AppRoleKey {
  void raw;
  return 'employee';
}
