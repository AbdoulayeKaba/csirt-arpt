export type IncidentStatus =
  | 'NOUVEAU'
  | 'EN_COURS'
  | 'INVESTIGATION'
  | 'CONTENU'
  | 'RESOLU'
  | 'REJETE';

export type IncidentSeverity = 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';

export type IncidentTlp = 'CLEAR' | 'GREEN' | 'AMBER' | 'RED';

export type IncidentDeclarantType =
  | 'particulier'
  | 'entreprise'
  | 'operateur'
  | 'administration'
  | 'autre';

export type IncidentAttachment = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedAt: string;
};

export type IncidentNote = {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  content: string;
  createdAt: string;
  isInternal: boolean;
};

export type IncidentActivity = {
  id: string;
  actorName: string;
  action: string;
  details?: string;
  createdAt: string;
};

export type CsirtIncident = {
  id: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  tlp: IncidentTlp;
  identify: 'yes' | 'no';
  declarantType: IncidentDeclarantType;
  declarantTypeName: string;
  fullName: string;
  organization: string;
  email: string;
  phone: string;
  types: string[];
  typeLabels: string[];
  description: string;
  measures: string;
  target: string;
  reported: 'yes' | 'no';
  attachments: IncidentAttachment[];
  assignedTo: { id: string; name: string; email: string } | null;
  notes: IncidentNote[];
  activityLog: IncidentActivity[];
  resolutionSummary?: string;
  archived: boolean;
  archivedAt?: string | null;
};

export type IncidentFilterStatus = 'ALL' | IncidentStatus | 'TRASH';

export type IncidentStats = {
  total: number;
  nouveaux: number;
  enCours: number;
  investigation: number;
  critiques: number;
  resolus: number;
  rejetes: number;
  archived: number;
};

export const INCIDENT_STATUS_META: Record<
  IncidentStatus,
  { label: string; tone: 'danger' | 'warning' | 'info' | 'success' | 'muted'; desc: string }
> = {
  NOUVEAU: {
    label: 'Nouveau',
    tone: 'danger',
    desc: 'Signalement reçu en attente de qualification',
  },
  EN_COURS: {
    label: 'Qualifié & En cours',
    tone: 'warning',
    desc: 'Pris en charge par l’équipe CSIRT',
  },
  INVESTIGATION: {
    label: 'Investigation',
    tone: 'info',
    desc: 'Analyse technique et collecte de preuves',
  },
  CONTENU: {
    label: 'Contenu',
    tone: 'info',
    desc: 'Menace circonscrite, remédiation active',
  },
  RESOLU: {
    label: 'Résolu',
    tone: 'success',
    desc: 'Incident clôturé et mesures appliquées',
  },
  REJETE: {
    label: 'Rejeté / Faux positif',
    tone: 'muted',
    desc: 'Non pertinent ou non avéré',
  },
};

export const INCIDENT_SEVERITY_META: Record<
  IncidentSeverity,
  { label: string; color: string; badgeClass: string }
> = {
  CRITIQUE: {
    label: 'Critique (P1)',
    color: '#dc2626',
    badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/35',
  },
  ELEVE: {
    label: 'Élevé (P2)',
    color: '#ea580c',
    badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/35',
  },
  MOYEN: {
    label: 'Moyen (P3)',
    color: '#2563eb',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/35',
  },
  FAIBLE: {
    label: 'Faible (P4)',
    color: '#059669',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/35',
  },
};

export function getIncidentSeverityMeta(severity?: string | null) {
  if (!severity) return INCIDENT_SEVERITY_META.MOYEN;
  const key = String(severity).toUpperCase().trim() as IncidentSeverity;
  return INCIDENT_SEVERITY_META[key] || INCIDENT_SEVERITY_META.MOYEN;
}

export function getIncidentStatusMeta(status?: string | null) {
  if (!status) return INCIDENT_STATUS_META.NOUVEAU;
  const key = String(status).toUpperCase().trim() as IncidentStatus;
  return INCIDENT_STATUS_META[key] || INCIDENT_STATUS_META.NOUVEAU;
}

export function getIncidentTlpMeta(tlp?: string | null) {
  if (!tlp) return INCIDENT_TLP_META.AMBER;
  const key = String(tlp).toUpperCase().trim() as IncidentTlp;
  return INCIDENT_TLP_META[key] || INCIDENT_TLP_META.AMBER;
}

export const INCIDENT_TLP_META: Record<IncidentTlp, { label: string; desc: string; color: string }> = {
  CLEAR: { label: 'TLP:CLEAR', desc: 'Diffusion publique autorisée', color: '#64748b' },
  GREEN: { label: 'TLP:GREEN', desc: 'Diffusion restreinte à la communauté', color: '#10b981' },
  AMBER: { label: 'TLP:AMBER', desc: 'Diffusion limitée aux organisations concernées', color: '#f59e0b' },
  RED: { label: 'TLP:RED', desc: 'Strictement confidentiel CSIRT-ARPT', color: '#ef4444' },
};
