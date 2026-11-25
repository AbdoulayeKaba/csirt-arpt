import { NextResponse } from 'next/server';
import {
  filterOrganisationsByDeclarantType,
  validateSignalementEmail,
  type SignalementOrganisation,
} from '@/lib/csirt/signalement-referentials';
import { createIncidentFromVisitor } from '@/lib/services/incidents-store';
import { listReferentialItems } from '@/lib/services/referentials-admin';
import { DEFAULT_ORGANISATIONS_SEED } from '@/lib/seed/referentials-default';
import {
  filterValidSignalementNatureIds,
  loadSignalementNatures,
} from '@/lib/csirt/signalement-natures';
import { sendSignalementAckEmail } from '@/lib/csirt/signalement-ack-email';
import { sendSignalementAdminEmail } from '@/lib/csirt/signalement-admin-email';
import { verifyAnonymousCaptcha } from '@/lib/csirt/signalement-captcha';
import {
  isSignalementAnonymousEnabled,
  requireSignalementCorrespondent,
} from '@/lib/csirt/signalement-access';
import { resolveOrganisationDeclarant } from '@/lib/csirt/correspondent-identity';
import {
  INCIDENT_ATTACHMENT_MAX_BYTES,
  INCIDENT_ATTACHMENT_MAX_FILES,
  isAllowedIncidentAttachment,
} from '@/lib/storage/incident-attachments';
import type { IncidentSeverity } from '@/lib/types/incident';
import { isEncryptedForCsirt, pgpShortKeyMatches } from '@/lib/csirt/csirt-pgp';
import { cooldownMessage, type SignalementCooldown } from '@/lib/csirt/signalement-cooldown';

const INCIDENT_SEVERITIES: IncidentSeverity[] = ['FAIBLE', 'MOYEN', 'ELEVE', 'CRITIQUE'];

type Payload = {
  identify?: string;
  declarantType?: string;
  fullName?: string;
  organization?: string;
  email?: string;
  phone?: string;
  types?: string[];
  severity?: string;
  description?: string;
  measures?: string;
  target?: string;
  reported?: string;
  pgpKey?: string;
  fileNames?: string[];
  attachments?: Array<{ name: string; size?: number; mimeType?: string; url?: string; buffer?: Buffer }>;
  captchaProvider?: 'google' | 'local';
  captchaToken?: string;
};

function asText(value: unknown, max = 4000) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function parseSeverity(value: unknown): IncidentSeverity | null {
  const raw = asText(value, 20).toUpperCase();
  return INCIDENT_SEVERITIES.includes(raw as IncidentSeverity) ? (raw as IncidentSeverity) : null;
}

function parseTypesField(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === 'string')
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string')
    } catch {
      return raw.split(',').map((item) => item.trim()).filter(Boolean)
    }
  }
  return []
}

async function parseSignalementRequest(req: Request): Promise<Payload> {
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const files = form
      .getAll('files')
      .filter((item): item is File => typeof File !== 'undefined' && item instanceof File)

    if (files.length > INCIDENT_ATTACHMENT_MAX_FILES) {
      throw new Error(`MAX_FILES:${INCIDENT_ATTACHMENT_MAX_FILES}`)
    }

    const attachments: NonNullable<Payload['attachments']> = []
    for (const file of files) {
      if (!isAllowedIncidentAttachment(file.name)) {
        throw new Error(`UNSUPPORTED_FILE:${file.name}`)
      }
      if (file.size <= 0 || file.size > INCIDENT_ATTACHMENT_MAX_BYTES) {
        throw new Error(`FILE_TOO_LARGE:${file.name}`)
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      attachments.push({
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        buffer,
      })
    }

    return {
      identify: asText(form.get('identify'), 8),
      declarantType: asText(form.get('declarantType'), 80),
      fullName: asText(form.get('fullName'), 120),
      organization: asText(form.get('organization'), 160),
      email: asText(form.get('email'), 180),
      phone: asText(form.get('phone'), 40),
      types: parseTypesField(form.get('types')),
      severity: asText(form.get('severity'), 20),
      description: asText(form.get('description'), 60000),
      measures: asText(form.get('measures'), 4000),
      target: asText(form.get('target'), 240),
      reported: asText(form.get('reported'), 8),
      pgpKey: asText(form.get('pgpKey'), 64),
      captchaProvider:
        form.get('captchaProvider') === 'google' || form.get('captchaProvider') === 'local'
          ? (form.get('captchaProvider') as 'google' | 'local')
          : undefined,
      captchaToken: asText(form.get('captchaToken'), 4000),
      attachments,
      fileNames: attachments.map((item) => item.name),
    }
  }

  return (await req.json()) as Payload
}

async function loadSignalementOrganisations(): Promise<SignalementOrganisation[]> {
  try {
    const orgRows = await listReferentialItems('organisations', { archived: false });
    if (orgRows.length > 0) {
      return orgRows.map((item) => {
        const meta = item.meta as { declarantType?: string; emailDomains?: string[] } | undefined;
        const seedMatch = DEFAULT_ORGANISATIONS_SEED.find(
          (seed) =>
            seed.value === item.value ||
            seed.name.trim().toLowerCase() === item.name.trim().toLowerCase()
        );
        return {
          id: item.value || item.id,
          label: item.name,
          declarantType: meta?.declarantType || seedMatch?.meta?.declarantType || '',
          emailDomains: meta?.emailDomains?.length
            ? meta.emailDomains
            : seedMatch?.meta?.emailDomains || [],
        };
      });
    }
  } catch {
    // fallback below
  }

  return DEFAULT_ORGANISATIONS_SEED.map((item) => ({
    id: item.value || item.name,
    label: item.name,
    declarantType: item.meta?.declarantType || '',
    emailDomains: item.meta?.emailDomains || [],
  }));
}

export async function POST(req: Request) {
  try {
    const anonymousEnabled = isSignalementAnonymousEnabled();
    const correspondentAccess = await requireSignalementCorrespondent();
    if (!anonymousEnabled && !correspondentAccess.ok) {
      return correspondentAccess.response;
    }
    const correspondent =
      correspondentAccess.ok ? correspondentAccess.correspondent : null;

    let body: Payload;
    try {
      body = await parseSignalementRequest(req);
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.startsWith('MAX_FILES:')) {
        return NextResponse.json(
          { error: `Maximum ${INCIDENT_ATTACHMENT_MAX_FILES} fichiers autorisés.` },
          { status: 400 }
        )
      }
      if (message.startsWith('UNSUPPORTED_FILE:')) {
        return NextResponse.json(
          { error: `Type de fichier non autorisé : ${message.slice('UNSUPPORTED_FILE:'.length)}` },
          { status: 400 }
        )
      }
      if (message.startsWith('FILE_TOO_LARGE:')) {
        return NextResponse.json(
          { error: `Fichier trop volumineux (max 8 Mo) : ${message.slice('FILE_TOO_LARGE:'.length)}` },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
    }

  if (!anonymousEnabled && !correspondent) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // Identité : jamais celle envoyée par le navigateur pour un correspondant.
  const identify = correspondent
    ? 'yes'
    : body.identify === 'yes' || body.identify === 'no'
      ? body.identify
      : '';

  if (!anonymousEnabled && identify !== 'yes') {
    return NextResponse.json(
      { error: 'Le signalement anonyme est désactivé.' },
      { status: 403 }
    );
  }

  if (!correspondent && identify === 'no' && !anonymousEnabled) {
    return NextResponse.json(
      { error: 'Le signalement anonyme est désactivé.' },
      { status: 403 }
    );
  }

  const rawTypes = Array.isArray(body.types) ? body.types.filter((item) => typeof item === 'string') : [];
  const description = asText(body.description, 8000);
  const reported = body.reported === 'yes' || body.reported === 'no' ? body.reported : 'no';

  const signalementNatures = await loadSignalementNatures();
  const types = filterValidSignalementNatureIds(rawTypes, signalementNatures);

  if (!identify || types.length === 0 || description.length < 20) {
    return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 });
  }

  const severity = parseSeverity(body.severity);
  if (correspondent && !severity) {
    return NextResponse.json({ error: 'Indiquez la gravité de l’incident.' }, { status: 400 });
  }

  if (identify === 'no') {
    const captcha = await verifyAnonymousCaptcha({
      provider: body.captchaProvider === 'google' || body.captchaProvider === 'local'
        ? body.captchaProvider
        : undefined,
      token: asText(body.captchaToken, 4000),
      remoteIp:
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        undefined,
    });
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: 400 });
    }
  }

  const email = correspondent
    ? correspondent.email
    : asText(body.email, 180);
  const organization = correspondent
    ? correspondent.organizationName
    : asText(body.organization, 160);
  const fullName = correspondent
    ? `${correspondent.firstName} ${correspondent.lastName}`.trim()
    : asText(body.fullName, 120);
  const phone = correspondent
    ? asText(body.phone, 40) || correspondent.phone
    : asText(body.phone, 40);
  const declarant = correspondent ? await resolveOrganisationDeclarant(organization) : null;
  const declarantType = declarant ? declarant.id : asText(body.declarantType, 80);

  if (!correspondent && identify === 'yes' && !declarantType) {
    return NextResponse.json({ error: 'Type de déclarant manquant.' }, { status: 400 });
  }

  const organisations =
    !correspondent && identify === 'yes' ? await loadSignalementOrganisations() : [];
  const linkedOrganisations = filterOrganisationsByDeclarantType(organisations, declarantType);

  if (!correspondent && identify === 'yes' && linkedOrganisations.length > 0 && !organization) {
    return NextResponse.json({ error: 'Sélectionnez votre organisation.' }, { status: 400 });
  }

  if (!correspondent && identify === 'yes' && !email) {
    return NextResponse.json({ error: 'E-mail de contact requis.' }, { status: 400 });
  }

  const emailError =
    !correspondent && identify === 'yes'
      ? validateSignalementEmail({
          email,
          organization,
          organisations,
          declarantType,
        })
      : null;

  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  if (!correspondent && identify === 'yes' && organization) {
    const orgMatch = linkedOrganisations.find(
      (org) => org.label.trim().toLowerCase() === organization.trim().toLowerCase()
    );
    if (!orgMatch) {
      return NextResponse.json(
        { error: 'L’organisation sélectionnée ne correspond pas au type de déclarant.' },
        { status: 400 }
      );
    }
  }

  if (correspondent) {
    if (!pgpShortKeyMatches(asText(body.pgpKey, 64))) {
      return NextResponse.json(
        { error: 'Copiez la clé publique affichée à côté de « Besoin d’aide ? ».' },
        { status: 400 }
      );
    }
    if (!(await isEncryptedForCsirt(description))) {
      return NextResponse.json(
        { error: 'Le signalement doit être chiffré avec la clé publique du CSIRT-ARPT.' },
        { status: 400 }
      );
    }
  }

  const attachments = Array.isArray(body.attachments)
    ? body.attachments
    : (body.fileNames || []).map((name) => ({ name, size: 0, mimeType: 'application/octet-stream' }));

  // Création & persistance du signalement dans le store d'incidents CSIRT
  let incident;
  try {
    incident = await createIncidentFromVisitor({
      identify: identify as 'yes' | 'no',
      declarantType,
      fullName,
      organization,
      email,
      phone,
      types,
      typeCatalog: signalementNatures,
      description,
      measures: asText(body.measures, 4000),
      target: asText(body.target, 240),
      reported: reported as 'yes' | 'no',
      severity: severity ?? undefined,
      channel: correspondent ? 'correspondent' : 'public',
      attachments,
    });
  } catch (error) {
    const cooldown = (error as { cooldown?: SignalementCooldown }).cooldown;
    if (error instanceof Error && error.message === 'SIGNALEMENT_COOLDOWN' && cooldown?.active) {
      const retryAfterSeconds = Math.max(1, Math.ceil(cooldown.remainingMs / 1000));
      return NextResponse.json(
        {
          error: cooldownMessage(cooldown.remainingMs),
          retryAt: cooldown.retryAt,
          retryAfterSeconds,
        },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
      );
    }
    throw error;
  }

  const reference = incident.reference;
  const fileNames = incident.attachments.map((a) => a.name);

  sendSignalementAdminEmail({
    reference,
    severity: incident.severity,
    identify: identify as 'yes' | 'no',
    declarantTypeName: incident.declarantTypeName,
    organization: incident.organization || '',
    email,
    typeLabels: incident.typeLabels,
    target: incident.target || '',
    fileNames,
    description,
    measures: incident.measures || '',
    createdAt: incident.createdAt,
  }).catch((err) => console.warn('[signalement] notification email failed', err));

  // Accusé de réception / e-mail de bienvenue au déclarant
  if (email) {
    sendSignalementAckEmail({
      email,
      reference,
      fullName: asText(body.fullName, 120),
      createdAt: incident.createdAt,
    }).catch((err) => console.warn('[signalement] user ack email failed', err));
  }

  return NextResponse.json({
    ok: true,
    reference,
    incidentId: incident.id,
    severity: incident.severity,
    status: incident.status,
  });
  } catch (error) {
    console.error('[signalement] POST failed', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue lors de l’enregistrement du signalement.' },
      { status: 500 }
    );
  }
}
