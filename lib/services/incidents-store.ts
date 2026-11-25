import { isIncidentAssignedToActor } from '@/lib/csirt/incident-access';
import {
  cooldownForEmail,
  type SignalementCooldown,
} from '@/lib/csirt/signalement-cooldown';
import { CSIRT_DECLARANT_TYPES } from '@/lib/csirt/signalement';
import {
  getDefaultSignalementNatures,
  resolveSignalementNatureLabels,
  type SignalementNature,
} from '@/lib/csirt/signalement-natures';
import { DEFAULT_DECLARANT_TYPES_SEED } from '@/lib/seed/referentials-default';
import {
  getPlatformSettingValue,
  upsertPlatformSettingValue,
} from '@/lib/services/platform-settings-store';
import {
  incidentAttachmentDownloadPath,
  saveIncidentAttachment,
} from '@/lib/storage/incident-attachments';
import { isExpiredTrash } from '@/lib/utils/trash-retention';
import type {
  CsirtIncident,
  IncidentActivity,
  IncidentAttachment,
  IncidentDeclarantType,
  IncidentFilterStatus,
  IncidentNote,
  IncidentSeverity,
  IncidentStats,
  IncidentStatus,
  IncidentTlp,
} from '@/lib/types/incident';

export const CSIRT_INCIDENTS_KEY = 'csirt_incidents';

// Seed initial pour démarrer avec des cas réalistes CSIRT
const SEED_INCIDENTS: CsirtIncident[] = [
  {
    id: 'inc-seed-001',
    reference: 'CSIRT-20260828-A4F1',
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: 'NOUVEAU',
    severity: 'CRITIQUE',
    tlp: 'AMBER',
    identify: 'yes',
    declarantType: 'operateur',
    declarantTypeName: 'Opérateur / FAI',
    fullName: 'Diallo Thierno',
    organization: 'Orange Guinée - SOC',
    email: 'thierno.diallo@orange-guinee.com',
    phone: '+224 622 00 11 22',
    types: ['ddos', 'reseau'],
    typeLabels: ['Déni de service (DDoS)', 'Attaques réseau'],
    description:
      'Attaque par déni de service distribuée (DDoS) syn-flood volumétrique dépassant 45 Gbps ciblant les passerelles DNS récursives et perturbant l’accès internet dans la zone de Kaloum.',
    measures:
      'Activation du blackholing BGP sur les préfixes /32 ciblés et scrubbing de trafic en amont.',
    target: '197.149.x.x / dns1.orange.gn',
    reported: 'yes',
    attachments: [
      {
        id: 'att-001',
        name: 'capture-trafic-syn-flood.pcap',
        size: 2450000,
        mimeType: 'application/vnd.tcpdump.pcap',
        url: '/api/admin/incidents/inc-seed-001/attachments/att-001',
        uploadedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      },
    ],
    assignedTo: null,
    notes: [
      {
        id: 'note-001',
        authorId: 'system',
        authorName: 'Système CSIRT',
        content: 'Signalement reçu via le formulaire public. Sévérité critique auto-attribuée (DDoS volumétrique).',
        createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        isInternal: true,
      },
    ],
    activityLog: [
      {
        id: 'act-001',
        actorName: 'Visiteur (Diallo Thierno)',
        action: 'Signalement créé',
        details: 'Dépôt du signalement depuis le portail public CSIRT-ARPT',
        createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      },
    ],
    archived: false,
    archivedAt: null,
  },
  {
    id: 'inc-seed-002',
    reference: 'CSIRT-20260827-C892',
    createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    status: 'INVESTIGATION',
    severity: 'ELEVE',
    tlp: 'AMBER',
    identify: 'yes',
    declarantType: 'administration',
    declarantTypeName: 'Administration / institution',
    fullName: 'Camara Mamadou',
    organization: 'Ministère des Postes & Télécoms',
    email: 'm.camara@telecoms.gov.gn',
    phone: '+224 628 33 44 55',
    types: ['phishing', 'compte'],
    typeLabels: ['Hameçonnage / ingénierie sociale', 'Compromission de compte'],
    description:
      'Campagne d’usurpation ciblée par spear-phishing imitant la Direction des Finances avec un faux lien vers un formulaire de paie. Au moins deux comptes de messagerie professionnelle semblent compromis.',
    measures:
      'Mots de passe réinitialisés pour les comptes suspects et blocage du domaine malveillant sur la passerelle email.',
    target: 'messagerie.telecoms.gov.gn / portail-paie-mpt.info (phishing)',
    reported: 'no',
    attachments: [
      {
        id: 'att-002',
        name: 'email_phishing_headers.eml',
        size: 58000,
        mimeType: 'message/rfc822',
        url: '/api/admin/incidents/inc-seed-002/attachments/att-002',
        uploadedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
      },
    ],
    assignedTo: {
      id: 'analyst-01',
      name: 'Abdoulaye Kaba (Analyste SOC)',
      email: 'a.kaba@arpt.gov.gn',
    },
    notes: [
      {
        id: 'note-002',
        authorId: 'analyst-01',
        authorName: 'Abdoulaye Kaba',
        content: 'Analyse des en-têtes EML : IP d’envoi hébergée aux Pays-Bas. IOC partagé avec les opérateurs nationaux.',
        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        isInternal: true,
      },
    ],
    activityLog: [
      {
        id: 'act-002-1',
        actorName: 'Visiteur (Camara Mamadou)',
        action: 'Signalement créé',
        details: 'Dépôt initial',
        createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
      },
      {
        id: 'act-002-2',
        actorName: 'Abdoulaye Kaba',
        action: 'Statut changé',
        details: 'Nouveau ➔ Investigation technique',
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      },
    ],
    archived: false,
    archivedAt: null,
  },
  {
    id: 'inc-seed-003',
    reference: 'CSIRT-20260826-F104',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    status: 'RESOLU',
    severity: 'MOYEN',
    tlp: 'GREEN',
    identify: 'no',
    declarantType: 'particulier',
    declarantTypeName: 'Particulier',
    fullName: 'Anonyme',
    organization: 'Citoyen',
    email: '',
    phone: '',
    types: ['fraude', 'malware'],
    typeLabels: ['Fraude / usurpation', 'Code malveillant'],
    description:
      'Signalement d’une fausse application Android aux couleurs d’un opérateur bancaire circulant via WhatsApp et dérobant les codes OTP par interception SMS.',
    measures: 'Application non installée sur l’appareil de test.',
    target: 'hxxps://apk-banque-guinee.xyz/app.apk',
    reported: 'yes',
    attachments: [],
    assignedTo: {
      id: 'analyst-02',
      name: 'Équipe CSIRT-ARPT',
      email: 'csirt@arpt.gov.gn',
    },
    resolutionSummary:
      'Takedown du nom de domaine malveillant effectué via le registrar et notification transmise à l’opérateur bancaire concerné.',
    notes: [
      {
        id: 'note-003',
        authorId: 'analyst-02',
        authorName: 'Équipe CSIRT-ARPT',
        content: 'Domaine suspendu avec succès. Clôture de l’incident.',
        createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        isInternal: true,
      },
    ],
    activityLog: [
      {
        id: 'act-003-1',
        actorName: 'Visiteur (Anonyme)',
        action: 'Signalement créé',
        createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 'act-003-2',
        actorName: 'Équipe CSIRT-ARPT',
        action: 'Incident résolu',
        details: 'Takedown confirmé',
        createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      },
    ],
    archived: false,
    archivedAt: null,
  },
];

let inMemoryFallback: CsirtIncident[] = [...SEED_INCIDENTS];

export function normalizeIncident(raw: any): CsirtIncident {
  const validSeverities: IncidentSeverity[] = ['FAIBLE', 'MOYEN', 'ELEVE', 'CRITIQUE'];
  const validStatuses: IncidentStatus[] = ['NOUVEAU', 'EN_COURS', 'INVESTIGATION', 'CONTENU', 'RESOLU', 'REJETE'];
  const validTlps: IncidentTlp[] = ['CLEAR', 'GREEN', 'AMBER', 'RED'];

  const rawSev = typeof raw?.severity === 'string' ? raw.severity.toUpperCase().trim() : '';
  const severity: IncidentSeverity = validSeverities.includes(rawSev as IncidentSeverity)
    ? (rawSev as IncidentSeverity)
    : 'MOYEN';

  const rawStatus = typeof raw?.status === 'string' ? raw.status.toUpperCase().trim() : '';
  const status: IncidentStatus = validStatuses.includes(rawStatus as IncidentStatus)
    ? (rawStatus as IncidentStatus)
    : 'NOUVEAU';

  const rawTlp = typeof raw?.tlp === 'string' ? raw.tlp.toUpperCase().trim() : '';
  const tlp: IncidentTlp = validTlps.includes(rawTlp as IncidentTlp)
    ? (rawTlp as IncidentTlp)
    : 'AMBER';

  return {
    id: String(raw?.id || `inc-${Date.now()}`),
    reference: String(raw?.reference || 'CSIRT-UNKNOWN'),
    createdAt: String(raw?.createdAt || new Date().toISOString()),
    updatedAt: String(raw?.updatedAt || new Date().toISOString()),
    status,
    severity,
    tlp,
    identify: raw?.identify === 'no' ? 'no' : 'yes',
    declarantType: (raw?.declarantType || 'particulier') as IncidentDeclarantType,
    declarantTypeName: String(raw?.declarantTypeName || 'Particulier'),
    fullName: String(raw?.fullName || ''),
    organization: String(raw?.organization || ''),
    email: String(raw?.email || ''),
    phone: String(raw?.phone || ''),
    types: Array.isArray(raw?.types) ? raw.types : [],
    typeLabels: Array.isArray(raw?.typeLabels) ? raw.typeLabels : [],
    description: String(raw?.description || ''),
    measures: String(raw?.measures || ''),
    target: String(raw?.target || ''),
    reported: raw?.reported === 'no' ? 'no' : 'yes',
    attachments: Array.isArray(raw?.attachments)
      ? raw.attachments.map((item: Partial<IncidentAttachment>, idx: number) => {
          const attId = String(item?.id || `att-${idx}`)
          const incidentId = String(raw?.id || `inc-${Date.now()}`)
          const rawUrl = typeof item?.url === 'string' ? item.url.trim() : ''
          const url =
            rawUrl && rawUrl !== '#'
              ? rawUrl
              : incidentAttachmentDownloadPath(incidentId, attId)
          return {
            id: attId,
            name: String(item?.name || 'fichier'),
            size: Number(item?.size || 0),
            mimeType: String(item?.mimeType || 'application/octet-stream'),
            url,
            uploadedAt: String(item?.uploadedAt || new Date().toISOString()),
          } satisfies IncidentAttachment
        })
      : [],
    assignedTo: raw?.assignedTo ? {
      id: String(raw.assignedTo.id || ''),
      name: String(raw.assignedTo.name || ''),
      email: String(raw.assignedTo.email || ''),
    } : null,
    notes: Array.isArray(raw?.notes) ? raw.notes : [],
    activityLog: Array.isArray(raw?.activityLog) ? raw.activityLog : [],
    resolutionSummary: raw?.resolutionSummary ? String(raw.resolutionSummary) : undefined,
    archived: Boolean(raw?.archived),
    archivedAt: raw?.archivedAt ? String(raw.archivedAt) : null,
  };
}

export async function getAllIncidents(): Promise<CsirtIncident[]> {
  try {
    const raw = await getPlatformSettingValue(CSIRT_INCIDENTS_KEY);
    if (!raw) {
      // Sauvegarder le seed initial
      await upsertPlatformSettingValue(CSIRT_INCIDENTS_KEY, JSON.stringify(SEED_INCIDENTS));
      return SEED_INCIDENTS.map(normalizeIncident);
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const normalized = parsed
        .map(normalizeIncident)
        .filter((inc) => !(inc.archived && isExpiredTrash(inc.archivedAt)));
      inMemoryFallback = normalized;
      return normalized;
    }
    return inMemoryFallback
      .map(normalizeIncident)
      .filter((inc) => !(inc.archived && isExpiredTrash(inc.archivedAt)));
  } catch (error) {
    console.warn('[incidents-store] reading store failed, using in-memory cache', error);
    return inMemoryFallback
      .map(normalizeIncident)
      .filter((inc) => !(inc.archived && isExpiredTrash(inc.archivedAt)));
  }
}

export async function saveAllIncidents(incidents: CsirtIncident[], actorId?: string): Promise<boolean> {
  inMemoryFallback = incidents;
  try {
    const payload = JSON.stringify(incidents);
    const ok = await upsertPlatformSettingValue(CSIRT_INCIDENTS_KEY, payload, actorId);
    return ok;
  } catch (error) {
    console.error('[incidents-store] saving store failed', error);
    return false;
  }
}

export async function getIncidentById(id: string): Promise<CsirtIncident | null> {
  const list = await getAllIncidents();
  return list.find((item) => item.id === id) ?? null;
}

export async function getIncidentByReference(reference: string): Promise<CsirtIncident | null> {
  const list = await getAllIncidents();
  return list.find((item) => item.reference.toUpperCase() === reference.toUpperCase()) ?? null;
}

function parseIsoDay(value: string | undefined, endOfDay: boolean): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export type ListIncidentsOptions = {
  q?: string;
  status?: IncidentFilterStatus;
  severity?: IncidentSeverity | 'ALL';
  declarantType?: string;
  /** Jour inclus, format yyyy-mm-dd. */
  from?: string;
  /** Jour inclus, format yyyy-mm-dd. */
  to?: string;
  limit?: number;
  offset?: number;
  /** Si défini, ne conserve que les incidents assignés à cet acteur. */
  assignedToActor?: { userId: string; email: string };
};

export async function listIncidents(options: ListIncidentsOptions = {}): Promise<{
  items: CsirtIncident[];
  total: number;
  stats: IncidentStats;
}> {
  let all = await getAllIncidents();

  if (options.assignedToActor) {
    all = all.filter((item) => isIncidentAssignedToActor(item, options.assignedToActor!));
  }

  let rangeStart = parseIsoDay(options.from, false);
  let rangeEnd = parseIsoDay(options.to, true);
  if (rangeStart && rangeEnd && rangeStart.getTime() > rangeEnd.getTime()) {
    rangeStart = parseIsoDay(options.to, false);
    rangeEnd = parseIsoDay(options.from, true);
  }

  // Statistiques (sur le périmètre visible)
  const stats: IncidentStats = {
    total: all.filter((i) => !i.archived).length,
    nouveaux: all.filter((i) => !i.archived && i.status === 'NOUVEAU').length,
    enCours: all.filter((i) => !i.archived && (i.status === 'EN_COURS' || i.status === 'CONTENU')).length,
    investigation: all.filter((i) => !i.archived && i.status === 'INVESTIGATION').length,
    critiques: all.filter((i) => !i.archived && i.severity === 'CRITIQUE').length,
    resolus: all.filter((i) => !i.archived && i.status === 'RESOLU').length,
    rejetes: all.filter((i) => !i.archived && i.status === 'REJETE').length,
    archived: all.filter((i) => i.archived).length,
  };

  let filtered = all.filter((item) => {
    // Filtre statut / corbeille
    if (options.status === 'TRASH') {
      if (!item.archived) return false;
    } else {
      if (item.archived) return false;
      if (options.status && options.status !== 'ALL' && item.status !== options.status) {
        return false;
      }
    }

    // Filtre gravité
    if (options.severity && options.severity !== 'ALL' && item.severity !== options.severity) {
      return false;
    }

    // Filtre déclarant
    if (options.declarantType && options.declarantType !== 'ALL' && item.declarantType !== options.declarantType) {
      return false;
    }

    if (rangeStart || rangeEnd) {
      const created = new Date(item.createdAt);
      if (Number.isNaN(created.getTime())) return false;
      if (rangeStart && created < rangeStart) return false;
      if (rangeEnd && created > rangeEnd) return false;
    }

    // Recherche plein texte
    if (options.q && options.q.trim()) {
      const q = options.q.trim().toLowerCase();
      const matchRef = item.reference.toLowerCase().includes(q);
      const matchName = item.fullName.toLowerCase().includes(q);
      const matchOrg = item.organization.toLowerCase().includes(q);
      const matchEmail = item.email.toLowerCase().includes(q);
      const matchTarget = item.target.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchTypes = item.typeLabels.some((t) => t.toLowerCase().includes(q));
      if (!matchRef && !matchName && !matchOrg && !matchEmail && !matchTarget && !matchDesc && !matchTypes) {
        return false;
      }
    }

    return true;
  });

  // Tri par date décroissante (les plus récents en premier)
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = filtered.length;
  const offset = options.offset || 0;
  const limit = options.limit || 50;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    items: paginated,
    total,
    stats,
  };
}

export type CreateIncidentInput = {
  identify: 'yes' | 'no';
  declarantType?: string;
  fullName?: string;
  organization?: string;
  email?: string;
  phone?: string;
  types: string[];
  typeCatalog?: SignalementNature[];
  description: string;
  measures?: string;
  target?: string;
  reported: 'yes' | 'no';
  /** Gravité choisie par le correspondant. Sinon, calcul automatique. */
  severity?: IncidentSeverity;
  /** Canal d’entrée : correspondant authentifié vs visiteur (anonyme conservé). */
  channel?: 'correspondent' | 'public';
  attachments?: Array<{
    name: string
    size?: number
    mimeType?: string
    url?: string
    buffer?: Buffer
  }>
};

export async function getCorrespondentSignalementCooldown(email: string): Promise<SignalementCooldown> {
  const all = await getAllIncidents();
  return cooldownForEmail(all, email);
}

export async function createIncidentFromVisitor(input: CreateIncidentInput): Promise<CsirtIncident> {
  const all = await getAllIncidents();
  if (input.channel === 'correspondent') {
    const cooldown = cooldownForEmail(all, input.email || '');
    if (cooldown.active) {
      const error = new Error('SIGNALEMENT_COOLDOWN') as Error & { cooldown: SignalementCooldown };
      error.cooldown = cooldown;
      throw error;
    }
  }
  const stamp = new Date();
  const dateStr = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(
    stamp.getDate()
  ).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const reference = `CSIRT-${dateStr}-${rand}`;
  const id = `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const chosenSeverity = input.severity;
  const validSeverities: IncidentSeverity[] = ['FAIBLE', 'MOYEN', 'ELEVE', 'CRITIQUE'];
  let severity: IncidentSeverity =
    chosenSeverity && validSeverities.includes(chosenSeverity) ? chosenSeverity : 'MOYEN';
  if (!chosenSeverity || !validSeverities.includes(chosenSeverity)) {
    if (input.types.some((t) => ['ddos', 'intrusion', 'fuite', 'malware'].includes(t))) {
      severity = 'ELEVE';
    }
    if (input.declarantType === 'operateur' || input.declarantType === 'administration') {
      if (input.types.some((t) => ['ddos', 'fuite', 'intrusion'].includes(t))) {
        severity = 'CRITIQUE';
      }
    }
  }

  const declarantType = (input.declarantType || (input.identify === 'no' ? 'autre' : 'particulier')) as IncidentDeclarantType;
  const declarantTypeName =
    CSIRT_DECLARANT_TYPES.find((d) => d.id === declarantType)?.label ||
    DEFAULT_DECLARANT_TYPES_SEED.find((d) => d.value === declarantType || d.name === declarantType)?.name ||
    (input.identify === 'no' ? 'Anonyme' : input.declarantType || 'Particulier');

  const natureCatalog = input.typeCatalog?.length ? input.typeCatalog : getDefaultSignalementNatures();
  const typeLabels = resolveSignalementNatureLabels(input.types, natureCatalog);

  const attachments: IncidentAttachment[] = []
  for (let idx = 0; idx < (input.attachments || []).length; idx += 1) {
    const a = input.attachments![idx]
    const attId = `att-${Date.now()}-${idx}`
    let url = a.url && a.url !== '#' ? a.url : incidentAttachmentDownloadPath(id, attId)
    let size = a.size || 0
    let mimeType = a.mimeType || 'application/octet-stream'
    if (a.buffer && a.buffer.length > 0) {
      try {
        const saved = await saveIncidentAttachment({
          incidentId: id,
          attachmentId: attId,
          fileName: a.name,
          mimeType,
          buffer: a.buffer,
        })
        url = saved.url
        size = saved.size
        mimeType = saved.mimeType
      } catch (err) {
        console.warn('[incidents] attachment save failed', err)
      }
    }
    attachments.push({
      id: attId,
      name: a.name,
      size,
      mimeType,
      url,
      uploadedAt: stamp.toISOString(),
    })
  }

  const newIncident: CsirtIncident = {
    id,
    reference,
    createdAt: stamp.toISOString(),
    updatedAt: stamp.toISOString(),
    status: 'NOUVEAU',
    severity,
    tlp: 'AMBER',
    identify: input.identify,
    declarantType,
    declarantTypeName,
    fullName: input.identify === 'yes' ? (input.fullName?.trim() || 'Non précisé') : 'Anonyme',
    organization: input.identify === 'yes' ? (input.organization?.trim() || 'Particulier') : 'Anonyme',
    email: input.identify === 'yes' ? (input.email?.trim() || '') : '',
    phone: input.identify === 'yes' ? (input.phone?.trim() || '') : '',
    types: input.types,
    typeLabels,
    description: input.description.trim(),
    measures: input.measures?.trim() || '',
    target: input.target?.trim() || '',
    reported: input.reported,
    attachments,
    assignedTo: null,
    notes: [
      {
        id: `note-${Date.now()}`,
        authorId: 'system',
        authorName: 'Système CSIRT',
        content: input.channel === 'correspondent'
          ? `Signalement reçu via compte correspondant authentifié (Référence ${reference}).`
          : `Signalement reçu depuis le portail public CSIRT-ARPT (Référence ${reference}).`,
        createdAt: stamp.toISOString(),
        isInternal: true,
      },
    ],
    activityLog: [
      {
        id: `act-${Date.now()}`,
        actorName: input.channel === 'correspondent'
          ? (input.fullName?.trim() || 'Correspondant')
          : input.identify === 'yes'
            ? (input.fullName?.trim() || 'Visiteur')
            : 'Visiteur (Anonyme)',
        action: 'Signalement créé',
        details: `Déclaration initiale avec ${input.types.length} type(s) d’incident et ${attachments.length} pièce(s) jointe(s).`,
        createdAt: stamp.toISOString(),
      },
    ],
    archived: false,
    archivedAt: null,
  };

  const nextList = [newIncident, ...all];
  await saveAllIncidents(nextList);
  return newIncident;
}

export type UpdateIncidentPatch = {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  tlp?: IncidentTlp;
  assignedTo?: { id: string; name: string; email: string } | null;
  resolutionSummary?: string;
};

export async function updateIncident(
  id: string,
  patch: UpdateIncidentPatch,
  actor: { name: string; id?: string }
): Promise<CsirtIncident | null> {
  const all = await getAllIncidents();
  const index = all.findIndex((i) => i.id === id);
  if (index === -1) return null;

  const current = all[index];
  const now = new Date().toISOString();
  const activities: IncidentActivity[] = [...current.activityLog];

  if (patch.status && patch.status !== current.status) {
    activities.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
      actorName: actor.name,
      action: 'Changement de statut',
      details: `${current.status} ➔ ${patch.status}`,
      createdAt: now,
    });
  }

  if (patch.severity && patch.severity !== current.severity) {
    activities.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
      actorName: actor.name,
      action: 'Changement de gravité',
      details: `${current.severity} ➔ ${patch.severity}`,
      createdAt: now,
    });
  }

  if (patch.tlp && patch.tlp !== current.tlp) {
    activities.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
      actorName: actor.name,
      action: 'Changement classification TLP',
      details: `TLP:${current.tlp} ➔ TLP:${patch.tlp}`,
      createdAt: now,
    });
  }

  if (patch.assignedTo !== undefined) {
    const prev = current.assignedTo?.name || 'Non assigné';
    const next = patch.assignedTo?.name || 'Non assigné';
    if (prev !== next) {
      activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
        actorName: actor.name,
        action: 'Réassignation',
        details: `${prev} ➔ ${next}`,
        createdAt: now,
      });
    }
  }

  if (patch.resolutionSummary && patch.resolutionSummary !== current.resolutionSummary) {
    activities.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
      actorName: actor.name,
      action: 'Synthèse de clôture mise à jour',
      details: patch.resolutionSummary.slice(0, 140),
      createdAt: now,
    });
  }

  const updated: CsirtIncident = {
    ...current,
    ...patch,
    updatedAt: now,
    activityLog: activities,
  };

  all[index] = updated;
  await saveAllIncidents(all, actor.id);
  return updated;
}

export async function addIncidentNote(
  id: string,
  content: string,
  actor: { id: string; name: string; email?: string },
  isInternal = true,
  activityAction?: string
): Promise<IncidentNote | null> {
  const all = await getAllIncidents();
  const index = all.findIndex((i) => i.id === id);
  if (index === -1) return null;

  const current = all[index];
  const now = new Date().toISOString();

  const note: IncidentNote = {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    authorId: actor.id,
    authorName: actor.name,
    authorEmail: actor.email,
    content: content.trim(),
    createdAt: now,
    isInternal,
  };

  const activity: IncidentActivity = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
    actorName: actor.name,
    action:
      activityAction ??
      (isInternal ? 'Note d’investigation ajoutée' : 'Message au déclarant consigné'),
    details: content.slice(0, 120),
    createdAt: now,
  };

  all[index] = {
    ...current,
    updatedAt: now,
    notes: [note, ...current.notes],
    activityLog: [activity, ...current.activityLog],
  };

  await saveAllIncidents(all, actor.id);
  return note;
}

export async function archiveIncident(id: string, actor: { id: string; name: string }): Promise<boolean> {
  const all = await getAllIncidents();
  const index = all.findIndex((i) => i.id === id);
  if (index === -1) return false;

  const now = new Date().toISOString();
  all[index] = {
    ...all[index],
    archived: true,
    archivedAt: now,
    updatedAt: now,
    activityLog: [
      {
        id: `act-${Date.now()}`,
        actorName: actor.name,
        action: 'Incident archivé',
        details: 'Déplacé vers la corbeille',
        createdAt: now,
      },
      ...all[index].activityLog,
    ],
  };

  await saveAllIncidents(all, actor.id);
  return true;
}

export async function restoreIncident(id: string, actor: { id: string; name: string }): Promise<boolean> {
  const all = await getAllIncidents();
  const index = all.findIndex((i) => i.id === id);
  if (index === -1) return false;

  const now = new Date().toISOString();
  all[index] = {
    ...all[index],
    archived: false,
    archivedAt: null,
    updatedAt: now,
    activityLog: [
      {
        id: `act-${Date.now()}`,
        actorName: actor.name,
        action: 'Incident restauré',
        details: 'Sorti de la corbeille',
        createdAt: now,
      },
      ...all[index].activityLog,
    ],
  };

  await saveAllIncidents(all, actor.id);
  return true;
}

export async function deleteIncidentPermanently(id: string, actorId?: string): Promise<boolean> {
  const all = await getAllIncidents();
  const nextList = all.filter((i) => i.id !== id);
  if (nextList.length === all.length) return false;
  await saveAllIncidents(nextList, actorId);
  return true;
}
