import { CSIRT_INCIDENT_TYPES } from '@/lib/csirt/signalement';
import { DEFAULT_NATURES_SIGNALEMENT_SEED } from '@/lib/seed/referentials-default';
import { listReferentialItems } from '@/lib/services/referentials-admin';

export type SignalementNature = {
  id: string;
  label: string;
};

function mapRowsToNatures(
  rows: Array<{ id: string; value?: string; name: string }>
): SignalementNature[] {
  return rows.map((item) => ({
    id: item.value || item.id,
    label: item.name,
  }));
}

export function getDefaultSignalementNatures(): SignalementNature[] {
  if (DEFAULT_NATURES_SIGNALEMENT_SEED.length > 0) {
    return DEFAULT_NATURES_SIGNALEMENT_SEED.map((item) => ({
      id: item.value || item.name,
      label: item.name,
    }));
  }
  return CSIRT_INCIDENT_TYPES.map((item) => ({ id: item.id, label: item.label }));
}

export async function loadSignalementNatures(): Promise<SignalementNature[]> {
  try {
    const rows = await listReferentialItems('natures_signalement', { archived: false });
    if (rows.length > 0) return mapRowsToNatures(rows);
  } catch {
    // fallback below
  }
  return getDefaultSignalementNatures();
}

export function resolveSignalementNatureLabels(
  typeIds: string[],
  natures: SignalementNature[]
): string[] {
  const labelById = new Map(natures.map((item) => [item.id, item.label]));
  return typeIds.map((id) => labelById.get(id) || id);
}

export function filterValidSignalementNatureIds(
  typeIds: string[],
  natures: SignalementNature[]
): string[] {
  const known = new Set(natures.map((item) => item.id));
  return typeIds.filter((id) => known.has(id));
}
