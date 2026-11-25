import type { LucideIcon } from 'lucide-react';
import { Bookmark, Building2, Landmark, ShieldAlert, UserCheck } from 'lucide-react';

export type ReferentialCategoryId =
  | 'thematiques'
  | 'departements'
  | 'types_declarant'
  | 'organisations'
  | 'natures_signalement';

export type ReferentialCategoryKind = 'list';

export type ReferentialCategory = {
  id: ReferentialCategoryId;
  label: string;
  description: string;
  icon: LucideIcon;
  kind: ReferentialCategoryKind;
  menuPermission?: string;
};

export const REFERENTIAL_CATEGORIES: ReferentialCategory[] = [
  {
    id: 'thematiques',
    label: 'Thématiques',
    description: 'Thématiques cyber et réglementaires utilisées pour classer les flux de veille et actualités.',
    icon: Bookmark,
    kind: 'list',
    menuPermission: 'menu.admin.referentiels',
  },
  {
    id: 'departements',
    label: 'Départements',
    description: 'Directions et services internes de l’organisation.',
    icon: Building2,
    kind: 'list',
    menuPermission: 'menu.admin.referentiels',
  },
  {
    id: 'types_declarant',
    label: 'Types de déclarant',
    description: 'Profils et qualités des déclarants d’incidents (Particulier, Entreprise, Opérateur, Administration…).',
    icon: UserCheck,
    kind: 'list',
    menuPermission: 'menu.admin.referentiels',
  },
  {
    id: 'organisations',
    label: 'Organisations',
    description: 'Opérateurs télécoms, régulateurs, ministères, institutions et entreprises partenaires.',
    icon: Landmark,
    kind: 'list',
    menuPermission: 'menu.admin.referentiels',
  },
  {
    id: 'natures_signalement',
    label: 'Nature du signalement',
    description: 'Types d’incidents cyber proposés sur le formulaire public de signalement CSIRT-ARPT.',
    icon: ShieldAlert,
    kind: 'list',
    menuPermission: 'menu.admin.referentiels',
  },
];

export const REFERENTIAL_CATEGORY_MAP = Object.fromEntries(
  REFERENTIAL_CATEGORIES.map((c) => [c.id, c])
) as Record<ReferentialCategoryId, ReferentialCategory>;

export function isReferentialCategoryId(val: string): val is ReferentialCategoryId {
  return val in REFERENTIAL_CATEGORY_MAP;
}
