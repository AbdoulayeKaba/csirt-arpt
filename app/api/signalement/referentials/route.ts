import { NextResponse } from 'next/server';
import { listReferentialItems } from '@/lib/services/referentials-admin';
import {
  DEFAULT_DECLARANT_TYPES_SEED,
  DEFAULT_NATURES_SIGNALEMENT_SEED,
  DEFAULT_ORGANISATIONS_SEED,
} from '@/lib/seed/referentials-default';

function mapEmailDomains(meta: unknown): string[] {
  const raw = (meta as { emailDomains?: unknown } | null)?.emailDomains;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET() {
  try {
    const [declarantRows, orgRows, natureRows] = await Promise.all([
      listReferentialItems('types_declarant', { archived: false }).catch(() => []),
      listReferentialItems('organisations', { archived: false }).catch(() => []),
      listReferentialItems('natures_signalement', { archived: false }).catch(() => []),
    ]);

    const declarantTypes =
      declarantRows.length > 0
        ? declarantRows.map((item) => ({
            id: item.value || item.id,
            label: item.name,
          }))
        : DEFAULT_DECLARANT_TYPES_SEED.map((item) => ({
            id: item.value || item.name,
            label: item.name,
          }));

    const organisations =
      orgRows.length > 0
        ? orgRows.map((item) => {
            const meta = item.meta as { declarantType?: string; emailDomains?: string[] } | undefined;
            const seedMatch = DEFAULT_ORGANISATIONS_SEED.find(
              (seed) =>
                seed.value === item.value ||
                seed.name.trim().toLowerCase() === item.name.trim().toLowerCase()
            );
            const emailDomains =
              mapEmailDomains(meta).length > 0
                ? mapEmailDomains(meta)
                : mapEmailDomains(seedMatch?.meta);
            return {
              id: item.value || item.id,
              label: item.name,
              declarantType: meta?.declarantType || seedMatch?.meta?.declarantType || '',
              emailDomains,
            };
          })
        : DEFAULT_ORGANISATIONS_SEED.map((item) => ({
            id: item.value || item.name,
            label: item.name,
            declarantType: item.meta?.declarantType || '',
            emailDomains: item.meta?.emailDomains || [],
          }));

    const incidentTypes =
      natureRows.length > 0
        ? natureRows.map((item) => ({
            id: item.value || item.id,
            label: item.name,
          }))
        : DEFAULT_NATURES_SIGNALEMENT_SEED.map((item) => ({
            id: item.value || item.name,
            label: item.name,
          }));

    return NextResponse.json({
      declarantTypes,
      organisations,
      incidentTypes,
    });
  } catch {
    return NextResponse.json({
      declarantTypes: DEFAULT_DECLARANT_TYPES_SEED.map((item) => ({
        id: item.value || item.name,
        label: item.name,
      })),
      organisations: DEFAULT_ORGANISATIONS_SEED.map((item) => ({
        id: item.value || item.name,
        label: item.name,
        declarantType: item.meta?.declarantType || '',
        emailDomains: item.meta?.emailDomains || [],
      })),
      incidentTypes: DEFAULT_NATURES_SIGNALEMENT_SEED.map((item) => ({
        id: item.value || item.name,
        label: item.name,
      })),
    });
  }
}
