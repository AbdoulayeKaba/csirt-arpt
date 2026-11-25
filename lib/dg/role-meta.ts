import type { DgRole } from '@/lib/dg/rbac';
import { dgRoleLabel } from '@/lib/dg/role-labels';

export type RoleMeta = {
  id: DgRole;
  label: string;
  description: string;
};

export const DG_ROLE_META: Record<DgRole, Omit<RoleMeta, 'id'>> = {
  ASSISTANT: {
    label: dgRoleLabel('ASSISTANT'),
    description: 'Administration de la console : utilisateurs, rôles et paramétrage.',
  },
  DG: {
    label: dgRoleLabel('DG'),
    description: 'Direction : consultation du tableau de bord institutionnel.',
  },
  MANAGER: {
    label: dgRoleLabel('MANAGER'),
    description: 'Agent interne : accès à la console CSIRT-ARPT.',
  },
  EXTERNAL: {
    label: dgRoleLabel('EXTERNAL'),
    description: 'Accès limité à la console.',
  },
  CORRESPONDANT: {
    label: dgRoleLabel('CORRESPONDANT'),
    description:
      'Correspondant d’une organisation partenaire : déclaration d’incidents (accès CSIRT limité).',
  },
};

export const SYSTEM_ROLES: DgRole[] = [
  'ASSISTANT',
  'DG',
  'MANAGER',
  'EXTERNAL',
  'CORRESPONDANT',
];
