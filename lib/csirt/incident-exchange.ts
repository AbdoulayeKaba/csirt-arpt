import type { CsirtIncident, IncidentNote } from '@/lib/types/incident';

/** Préfixe consigné quand l’équipe répond au déclarant. */
export const DECLARANT_REPLY_PREFIX = /^\[Message envoyé au déclarant \([^)]*\)] : /;

export type ExchangeSide = 'correspondent' | 'staff';

export type ExchangeMessage = {
  id: string;
  from: ExchangeSide;
  authorName: string;
  content: string;
  createdAt: string;
};

export function isCorrespondentNote(note: IncidentNote, declarantEmail: string) {
  const author = (note.authorEmail ?? '').trim().toLowerCase();
  const declarant = declarantEmail.trim().toLowerCase();
  return Boolean(author && declarant && author === declarant);
}

/** Fil visible par le correspondant, l’administrateur et le spécialiste assigné. */
export function listExchangeMessages(
  incident: Pick<CsirtIncident, 'email' | 'notes'>
): ExchangeMessage[] {
  return incident.notes
    .filter((note) => !note.isInternal)
    .map((note) => {
      const fromCorrespondent = isCorrespondentNote(note, incident.email);
      return {
        id: note.id,
        from: fromCorrespondent ? ('correspondent' as const) : ('staff' as const),
        authorName: note.authorName,
        content: fromCorrespondent ? note.content : note.content.replace(DECLARANT_REPLY_PREFIX, ''),
        createdAt: note.createdAt,
      };
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
