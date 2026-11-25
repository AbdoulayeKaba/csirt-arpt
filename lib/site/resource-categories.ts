import type { SitePublicationCategory } from '@/lib/site/types'

export const RESOURCE_CATEGORY_LABELS: Record<SitePublicationCategory, string> = {
  guides: 'Guides et manuels',
  alertes: 'Alertes et avis',
  rapports: 'Rapports',
  reglementation: 'Cadre réglementaire',
  notes: 'Notes',
  procedures: 'Procédures',
  modeles: 'Modèles',
  sensibilisation: 'Sensibilisation',
}

export const RESOURCE_CATEGORY_OPTIONS = (
  Object.entries(RESOURCE_CATEGORY_LABELS) as [SitePublicationCategory, string][]
).map(([id, label]) => ({ id, label }))
