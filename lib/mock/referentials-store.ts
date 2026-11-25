import type { ReferentialCategoryId } from '@/lib/dg/referential-catalog';
import type { ReferentialItemMeta } from '@/lib/dg/referential-types';
import { isExpiredTrash } from '@/lib/utils/trash-retention';

export type ReferentialItem = {
  id: string;
  categoryId: ReferentialCategoryId;
  name: string;
  value?: string;
  meta?: ReferentialItemMeta;
  archived: boolean;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const STORE_KEY = '__dg_referentials_store__';

type Store = {
  items: ReferentialItem[];
};

function defaultItems(): ReferentialItem[] {
  return [
    { id: 'thm-1', categoryId: 'thematiques', name: 'Cybersécurité', value: 'cybersecurite', archived: false },
    { id: 'thm-2', categoryId: 'thematiques', name: 'Infrastructure & Réseaux', value: 'infrastructure-reseaux', archived: false },
    { id: 'thm-3', categoryId: 'thematiques', name: 'Licences & Autorisations', value: 'licences-autorisations', archived: false },
    { id: 'thm-4', categoryId: 'thematiques', name: 'Service Universel', value: 'service-universel', archived: false },
    { id: 'thm-5', categoryId: 'thematiques', name: 'Protection des consommateurs', value: 'protection-consommateurs', archived: false },
    { id: 'thm-6', categoryId: 'thematiques', name: 'Fréquences & Spectre', value: 'frequences-spectre', archived: false },
    { id: 'thm-7', categoryId: 'thematiques', name: 'Données personnelles', value: 'donnees-personnelles', archived: false },
    { id: 'thm-8', categoryId: 'thematiques', name: 'Interconnexion', value: 'interconnexion', archived: false },
    { id: 'thm-9', categoryId: 'thematiques', name: 'Qualité de service', value: 'qualite-service', archived: false },
    { id: 'thm-10', categoryId: 'thematiques', name: 'Tarification', value: 'tarification', archived: false },
    { id: 'dep-1', categoryId: 'departements', name: 'CSIRT-ARPT', value: 'csirt-arpt', archived: false },
    { id: 'dep-2', categoryId: 'departements', name: 'Direction générale', value: 'direction-generale', archived: false },
    { id: 'dep-3', categoryId: 'departements', name: 'Affaires réglementaires', value: 'affaires-reglementaires', archived: false },
    { id: 'dep-4', categoryId: 'departements', name: 'Communication', value: 'communication', archived: false },
    { id: 'dep-5', categoryId: 'departements', name: 'Juridique', value: 'juridique', archived: false },
    { id: 'dec-1', categoryId: 'types_declarant', name: 'Particulier', value: 'particulier', archived: false },
    { id: 'dec-2', categoryId: 'types_declarant', name: 'Entreprise / organisation privée', value: 'entreprise', archived: false },
    { id: 'dec-3', categoryId: 'types_declarant', name: 'Opérateur / FAI', value: 'operateur', archived: false },
    { id: 'dec-4', categoryId: 'types_declarant', name: 'Administration / institution', value: 'administration', archived: false },
    { id: 'dec-5', categoryId: 'types_declarant', name: 'Opérateur d’Importance Vitale (OIV)', value: 'oiv', archived: false },
    { id: 'dec-6', categoryId: 'types_declarant', name: 'Autre', value: 'autre', archived: false },
    { id: 'org-1', categoryId: 'organisations', name: 'ARPT (Autorité de Régulation)', value: 'arpt', meta: { declarantType: 'administration', description: 'Autorité de régulation' }, archived: false },
    { id: 'org-2', categoryId: 'organisations', name: 'Orange Guinée', value: 'orange-guinee', meta: { declarantType: 'operateur', description: 'Opérateur télécoms et FAI', emailDomains: ['orange-sonatel.com'] }, archived: false },
    { id: 'org-3', categoryId: 'organisations', name: 'MTN Guinée', value: 'mtn-guinee', meta: { declarantType: 'operateur', description: 'Opérateur télécoms' }, archived: false },
    { id: 'org-4', categoryId: 'organisations', name: 'Cellcom Guinée', value: 'cellcom-guinee', meta: { declarantType: 'operateur', description: 'Opérateur télécoms' }, archived: false },
    { id: 'org-5', categoryId: 'organisations', name: 'Guinée Télécom', value: 'guinee-telecom', meta: { declarantType: 'operateur', description: 'Opérateur public national' }, archived: false },
    { id: 'org-6', categoryId: 'organisations', name: 'SOGEB (Backbone National)', value: 'sogeb', meta: { declarantType: 'operateur', description: 'Société de gestion du backbone national' }, archived: false },
    { id: 'org-7', categoryId: 'organisations', name: 'ANSUTEN', value: 'ansuten', meta: { declarantType: 'administration', description: 'Agence nationale du service universel' }, archived: false },
    { id: 'org-8', categoryId: 'organisations', name: 'Ministère des Postes & Télécoms', value: 'mpten', meta: { declarantType: 'administration', description: 'Ministère de tutelle' }, archived: false },
    { id: 'org-9', categoryId: 'organisations', name: 'Secteur Bancaire & Financier', value: 'secteur-bancaire', meta: { declarantType: 'entreprise', description: 'Banques et institutions financières' }, archived: false },
    { id: 'nat-1', categoryId: 'natures_signalement', name: 'Attaques réseau', value: 'reseau', archived: false },
    { id: 'nat-2', categoryId: 'natures_signalement', name: 'Intrusion / accès illégal', value: 'intrusion', archived: false },
    { id: 'nat-3', categoryId: 'natures_signalement', name: 'Exploitation de vulnérabilités', value: 'vulnerabilite', archived: false },
    { id: 'nat-4', categoryId: 'natures_signalement', name: 'Code malveillant', value: 'malware', archived: false },
    { id: 'nat-5', categoryId: 'natures_signalement', name: 'Hameçonnage / ingénierie sociale', value: 'phishing', archived: false },
    { id: 'nat-6', categoryId: 'natures_signalement', name: 'Déni de service (DDoS)', value: 'ddos', archived: false },
    { id: 'nat-7', categoryId: 'natures_signalement', name: 'Compromission de compte', value: 'compte', archived: false },
    { id: 'nat-8', categoryId: 'natures_signalement', name: 'Fuite / vol de données', value: 'fuite', archived: false },
    { id: 'nat-9', categoryId: 'natures_signalement', name: 'Fraude / usurpation', value: 'fraude', archived: false },
    { id: 'nat-10', categoryId: 'natures_signalement', name: 'Autre incident', value: 'autre', archived: false },
  ];
}

function getStore(): Store {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: Store };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = { items: defaultItems() };
  }
  return g[STORE_KEY];
}

export function mockListReferentials(categoryId?: ReferentialCategoryId, archived = false) {
  const store = getStore();
  // Auto-clean expired trash (older than 3 months)
  store.items = store.items.filter((i) => {
    if (!i.archived) return true;
    const archivedAt = (i.meta as Record<string, unknown> | undefined)?.archivedAt as string | undefined;
    return !isExpiredTrash(archivedAt);
  });

  return store.items.filter(
    (i) => i.categoryId === categoryId && i.archived === archived
  );
}

export function mockGetReferential(id: string) {
  return getStore().items.find((i) => i.id === id);
}

export function mockCreateReferential(
  data: Omit<ReferentialItem, 'id' | 'archived'>
): ReferentialItem {
  const item: ReferentialItem = {
    id: `ref-${Date.now()}`,
    archived: false,
    ...data,
  };
  getStore().items.push(item);
  return item;
}

export function mockUpdateReferential(
  id: string,
  patch: Partial<Pick<ReferentialItem, 'name' | 'value' | 'meta' | 'archived'>>
): ReferentialItem | null {
  const item = getStore().items.find((i) => i.id === id);
  if (!item) return null;
  Object.assign(item, patch);
  return item;
}

export function mockPurgeReferential(id: string): boolean {
  const store = getStore();
  const idx = store.items.findIndex((i) => i.id === id);
  if (idx < 0) return false;
  store.items.splice(idx, 1);
  return true;
}

export function mockEmptyReferentialsTrash(): number {
  const store = getStore();
  const before = store.items.length;
  store.items = store.items.filter((i) => !i.archived);
  return before - store.items.length;
}
