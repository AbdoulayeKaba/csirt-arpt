import type { ReferentialCategoryId } from '@/lib/dg/referential-catalog';
import { CSIRT_INCIDENT_TYPES } from '@/lib/csirt/signalement';

export type ReferentialSeedRow = {
  categoryId: ReferentialCategoryId;
  name: string;
  value?: string;
  meta?: {
    declarantType?: string;
    description?: string;
    emailDomains?: string[];
    [key: string]: unknown;
  };
};

/** Thématiques de veille cyber & actualités par défaut */
export const DEFAULT_THEMES_SEED: ReferentialSeedRow[] = [
  { categoryId: 'thematiques', name: 'Cybersécurité', value: 'cybersecurite' },
  { categoryId: 'thematiques', name: 'Infrastructure & Réseaux', value: 'infrastructure-reseaux' },
  { categoryId: 'thematiques', name: 'Licences & Autorisations', value: 'licences-autorisations' },
  { categoryId: 'thematiques', name: 'Service Universel', value: 'service-universel' },
  { categoryId: 'thematiques', name: 'Protection des consommateurs', value: 'protection-consommateurs' },
  { categoryId: 'thematiques', name: 'Fréquences & Spectre', value: 'frequences-spectre' },
  { categoryId: 'thematiques', name: 'Données personnelles', value: 'donnees-personnelles' },
  { categoryId: 'thematiques', name: 'Interconnexion', value: 'interconnexion' },
  { categoryId: 'thematiques', name: 'Qualité de service', value: 'qualite-service' },
  { categoryId: 'thematiques', name: 'Tarification', value: 'tarification' },
];

/** Départements par défaut pour les fiches utilisateur. */
export const DEFAULT_DEPARTMENTS_SEED: ReferentialSeedRow[] = [
  { categoryId: 'departements', name: 'CSIRT-ARPT', value: 'csirt-arpt' },
  { categoryId: 'departements', name: 'Direction générale', value: 'direction-generale' },
  { categoryId: 'departements', name: 'Affaires réglementaires', value: 'affaires-reglementaires' },
  { categoryId: 'departements', name: 'Communication', value: 'communication' },
  { categoryId: 'departements', name: 'Juridique', value: 'juridique' },
];

/** Types de déclarant pour le guichet de signalement des incidents cyber */
export const DEFAULT_DECLARANT_TYPES_SEED: ReferentialSeedRow[] = [
  { categoryId: 'types_declarant', name: 'Particulier', value: 'particulier' },
  { categoryId: 'types_declarant', name: 'Entreprise / organisation privée', value: 'entreprise' },
  { categoryId: 'types_declarant', name: 'Opérateur / FAI', value: 'operateur' },
  { categoryId: 'types_declarant', name: 'Administration / institution', value: 'administration' },
  { categoryId: 'types_declarant', name: 'Opérateur d’Importance Vitale (OIV)', value: 'oiv' },
  { categoryId: 'types_declarant', name: 'Autre', value: 'autre' },
];

/** Natures d’incident cyber affichées sur le formulaire de signalement public */
export const DEFAULT_NATURES_SIGNALEMENT_SEED: ReferentialSeedRow[] = CSIRT_INCIDENT_TYPES.map(
  (item) => ({
    categoryId: 'natures_signalement',
    name: item.label,
    value: item.id,
  })
);

/** Organisations, opérateurs télécoms, régulateurs et partenaires liées par Type de déclarant */
export const DEFAULT_ORGANISATIONS_SEED: ReferentialSeedRow[] = [
  { categoryId: 'organisations', name: 'ARPT (Autorité de Régulation)', value: 'arpt', meta: { declarantType: 'administration', description: 'Autorité nationale de régulation des postes et télécommunications', emailDomains: ['arpt.gov.gn'] } },
  { categoryId: 'organisations', name: 'Orange Guinée', value: 'orange-guinee', meta: { declarantType: 'operateur', description: 'Opérateur de télécommunications et fournisseur d’accès Internet', emailDomains: ['orange-sonatel.com'] } },
  { categoryId: 'organisations', name: 'MTN Guinée', value: 'mtn-guinee', meta: { declarantType: 'operateur', description: 'Opérateur de télécommunications', emailDomains: ['mtn.gn'] } },
  { categoryId: 'organisations', name: 'Cellcom Guinée', value: 'cellcom-guinee', meta: { declarantType: 'operateur', description: 'Opérateur mobile et services télécoms', emailDomains: ['cellcom.gn'] } },
  { categoryId: 'organisations', name: 'Guinée Télécom', value: 'guinee-telecom', meta: { declarantType: 'operateur', description: 'Opérateur public national de télécommunications', emailDomains: ['guinee-telecom.gn'] } },
  { categoryId: 'organisations', name: 'SOGEB (Backbone National)', value: 'sogeb', meta: { declarantType: 'operateur', description: 'Société de gestion de l’infrastructure et fibre optique nationale', emailDomains: ['sogeb.gn'] } },
  { categoryId: 'organisations', name: 'ANSUTEN', value: 'ansuten', meta: { declarantType: 'administration', description: 'Agence nationale du service universel des télécommunications', emailDomains: ['ansuten.gov.gn'] } },
  { categoryId: 'organisations', name: 'Ministère des Postes & Télécoms', value: 'mpten', meta: { declarantType: 'administration', description: 'Ministère de tutelle du secteur numérique', emailDomains: ['mpten.gov.gn'] } },
  { categoryId: 'organisations', name: 'Secteur Bancaire & Financier', value: 'secteur-bancaire', meta: { declarantType: 'entreprise', description: 'Établissements bancaires et institutions financières partenaires', emailDomains: ['banque.gn', 'finance.gov.gn'] } },
];

export const DEFAULT_REFERENTIAL_SEED: ReferentialSeedRow[] = [
  ...DEFAULT_THEMES_SEED,
  ...DEFAULT_DEPARTMENTS_SEED,
  ...DEFAULT_DECLARANT_TYPES_SEED,
  ...DEFAULT_ORGANISATIONS_SEED,
  ...DEFAULT_NATURES_SIGNALEMENT_SEED,
];
