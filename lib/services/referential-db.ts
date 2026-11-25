import type { ReferentialCategoryId } from '@/lib/dg/referential-catalog';
import type { ReferentialItemMeta } from '@/lib/dg/referential-types';
import type { ReferentialItem } from '@/lib/mock/referentials-store';
import {
  DEFAULT_DECLARANT_TYPES_SEED,
  DEFAULT_DEPARTMENTS_SEED,
  DEFAULT_NATURES_SIGNALEMENT_SEED,
  DEFAULT_ORGANISATIONS_SEED,
  DEFAULT_REFERENTIAL_SEED,
  DEFAULT_THEMES_SEED,
} from '@/lib/seed/referentials-default';
import { getTrashCutoffDate } from '@/lib/utils/trash-retention';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Purge automatique des éléments en corbeille vieux de plus de 3 mois (90 jours).
 */
async function autoPurgeExpiredReferentialsTrash(): Promise<void> {
  try {
    const cutoffDate = getTrashCutoffDate();
    await prisma.referentialItem.deleteMany({
      where: {
        archived: true,
        updatedAt: { lt: cutoffDate },
      },
    });
  } catch {
    // Silencieux si échec ponctuel
  }
}

function toItem(row: {
  id: string;
  categoryId: string;
  name: string;
  value: string | null;
  meta: unknown;
  archived: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}): ReferentialItem {
  const metaObj = (row.meta ?? undefined) as ReferentialItemMeta | undefined;
  const rawArchivedAt = (metaObj as Record<string, unknown> | undefined)?.archivedAt as string | undefined;
  const archivedAt =
    rawArchivedAt ||
    (row.archived
      ? row.updatedAt
        ? new Date(row.updatedAt).toISOString()
        : row.createdAt
        ? new Date(row.createdAt).toISOString()
        : new Date().toISOString()
      : null);

  return {
    id: row.id,
    categoryId: row.categoryId as ReferentialCategoryId,
    name: row.name,
    value: row.value ?? undefined,
    meta: metaObj,
    archived: row.archived,
    archivedAt,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
  };
}

export async function countReferentialsByCategory(
  categoryId: ReferentialCategoryId,
  archived: boolean
): Promise<number> {
  if (archived) {
    await autoPurgeExpiredReferentialsTrash();
  }
  return prisma.referentialItem.count({
    where: { categoryId, archived },
  });
}

export async function dbListReferentialItems(
  categoryId: ReferentialCategoryId,
  archived: boolean
): Promise<ReferentialItem[]> {
  if (archived) {
    await autoPurgeExpiredReferentialsTrash();
  }
  const totalCount = await prisma.referentialItem.count({
    where: { categoryId },
  });

  if (totalCount === 0 && !archived) {
    const seeds = DEFAULT_REFERENTIAL_SEED.filter((s) => s.categoryId === categoryId);
    for (const s of seeds) {
      await prisma.referentialItem
        .create({
          data: {
            categoryId: s.categoryId,
            name: s.name,
            value: s.value ?? null,
            meta: s.meta ? (s.meta as Prisma.InputJsonValue) : undefined,
            archived: false,
          },
        })
        .catch(() => {});
    }
  }

  // Deduplicate any accidental duplicate rows
  const rows = await prisma.referentialItem.findMany({
    where: { categoryId, archived },
    orderBy: { createdAt: 'asc' },
  });

  // Check for duplicates by name and clean them up if found
  const seenNames = new Set<string>();
  const uniqueRows: typeof rows = [];
  const duplicateIdsToDelete: string[] = [];

  for (const row of rows) {
    const key = `${row.categoryId}::${row.name.trim().toLowerCase()}`;
    if (seenNames.has(key)) {
      duplicateIdsToDelete.push(row.id);
    } else {
      seenNames.add(key);
      uniqueRows.push(row);
    }
  }

  if (duplicateIdsToDelete.length > 0) {
    await prisma.referentialItem.deleteMany({
      where: { id: { in: duplicateIdsToDelete } },
    }).catch(() => {});
  }

  // Auto-backfill declarantType + emailDomains in meta for organisations
  for (const row of uniqueRows) {
    if (row.categoryId === 'organisations') {
      const meta =
        (row.meta as {
          declarantType?: string
          description?: string
          emailDomains?: string[]
        } | null) || {}
      const seedMatch = DEFAULT_ORGANISATIONS_SEED.find(
        (s) =>
          s.name.trim().toLowerCase() === row.name.trim().toLowerCase() ||
          (s.value && s.value === row.value)
      )
      const updatedMeta = { ...meta }
      let changed = false

      if (!meta.declarantType && seedMatch?.meta?.declarantType) {
        updatedMeta.declarantType = seedMatch.meta.declarantType
        changed = true
      }
      if (!meta.description && seedMatch?.meta?.description) {
        updatedMeta.description = seedMatch.meta.description
        changed = true
      }
      if (!meta.emailDomains?.length && seedMatch?.meta?.emailDomains?.length) {
        updatedMeta.emailDomains = seedMatch.meta.emailDomains
        changed = true
      }

      if (changed) {
        await prisma.referentialItem
          .update({
            where: { id: row.id },
            data: { meta: updatedMeta as Prisma.InputJsonValue },
          })
          .catch(() => {})
        row.meta = updatedMeta as Prisma.JsonValue
      }
    }
  }

  return uniqueRows.sort((a, b) => a.name.localeCompare(b.name, 'fr')).map(toItem);
}

export async function dbGetReferentialItem(id: string): Promise<ReferentialItem | null> {
  let row = await prisma.referentialItem.findUnique({ where: { id } }).catch(() => null);
  if (!row) {
    row = await prisma.referentialItem
      .findFirst({
        where: {
          OR: [{ value: id }, { name: id }],
        },
      })
      .catch(() => null);
  }

  // Handle synthetic seed IDs like org-seed-1, dec-seed-2, org-1, etc.
  if (!row) {
    let seedMatch: (typeof DEFAULT_REFERENTIAL_SEED)[0] | undefined;
    if (id.startsWith('org-seed-')) {
      const idx = parseInt(id.replace('org-seed-', ''), 10) - 1;
      seedMatch = DEFAULT_ORGANISATIONS_SEED[idx];
    } else if (id.startsWith('dec-seed-')) {
      const idx = parseInt(id.replace('dec-seed-', ''), 10) - 1;
      seedMatch = DEFAULT_DECLARANT_TYPES_SEED[idx];
    } else if (id.startsWith('thm-seed-')) {
      const idx = parseInt(id.replace('thm-seed-', ''), 10) - 1;
      seedMatch = DEFAULT_THEMES_SEED[idx];
    } else if (id.startsWith('dep-seed-')) {
      const idx = parseInt(id.replace('dep-seed-', ''), 10) - 1;
      seedMatch = DEFAULT_DEPARTMENTS_SEED[idx];
    } else if (id.startsWith('nat-seed-')) {
      const idx = parseInt(id.replace('nat-seed-', ''), 10) - 1;
      seedMatch = DEFAULT_NATURES_SIGNALEMENT_SEED[idx];
    } else if (id.startsWith('org-')) {
      const idx = parseInt(id.replace('org-', ''), 10) - 1;
      seedMatch = DEFAULT_ORGANISATIONS_SEED[idx];
    } else if (id.startsWith('dec-')) {
      const idx = parseInt(id.replace('dec-', ''), 10) - 1;
      seedMatch = DEFAULT_DECLARANT_TYPES_SEED[idx];
    } else if (id.startsWith('nat-')) {
      const idx = parseInt(id.replace('nat-', ''), 10) - 1;
      seedMatch = DEFAULT_NATURES_SIGNALEMENT_SEED[idx];
    }

    if (seedMatch) {
      row = await prisma.referentialItem
        .findFirst({
          where: {
            categoryId: seedMatch.categoryId,
            OR: [{ name: seedMatch.name }, { value: seedMatch.value }],
          },
        })
        .catch(() => null);

      if (!row) {
        row = await prisma.referentialItem
          .create({
            data: {
              categoryId: seedMatch.categoryId,
              name: seedMatch.name,
              value: seedMatch.value ?? null,
              meta: seedMatch.meta ? (seedMatch.meta as Prisma.InputJsonValue) : undefined,
              archived: false,
            },
          })
          .catch(() => null);
      }
    }
  }

  return row ? toItem(row) : null;
}

export async function dbCreateReferentialItem(data: {
  categoryId: ReferentialCategoryId;
  name: string;
  value?: string;
  meta?: ReferentialItemMeta;
}): Promise<ReferentialItem> {
  const existing = await prisma.referentialItem
    .findFirst({
      where: {
        categoryId: data.categoryId,
        OR: [
          { name: data.name },
          ...(data.value ? [{ value: data.value }] : []),
        ],
      },
    })
    .catch(() => null);

  if (existing) {
    const updated = await dbUpdateReferentialItem(existing.id, {
      name: data.name,
      value: data.value,
      meta: data.meta,
    });
    if (updated) return updated;
  }

  const row = await prisma.referentialItem.create({
    data: {
      categoryId: data.categoryId,
      name: data.name,
      value: data.value ?? null,
      meta: data.meta ? (data.meta as Prisma.InputJsonValue) : undefined,
    },
  });
  return toItem(row);
}

export async function dbUpdateReferentialItem(
  id: string,
  patch: Partial<Pick<ReferentialItem, 'name' | 'value' | 'meta' | 'archived'>>
): Promise<ReferentialItem | null> {
  try {
    const existing = await dbGetReferentialItem(id);
    if (!existing) return null;

    const currentMeta = (existing.meta || {}) as Record<string, unknown>;
    const updatedMeta = {
      ...currentMeta,
      ...(patch.meta || {}),
    };

    if (patch.archived === true && !updatedMeta.archivedAt) {
      updatedMeta.archivedAt = new Date().toISOString();
    } else if (patch.archived === false) {
      delete updatedMeta.archivedAt;
    }

    const row = await prisma.referentialItem.update({
      where: { id: existing.id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.value !== undefined ? { value: patch.value ?? null } : {}),
        ...(patch.archived !== undefined ? { archived: patch.archived } : {}),
        meta: Object.keys(updatedMeta).length > 0 ? (updatedMeta as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
    return toItem(row);
  } catch (err) {
    console.error('dbUpdateReferentialItem error:', err);
    return null;
  }
}

export async function dbPurgeReferentialItem(id: string): Promise<boolean> {
  try {
    const existing = await dbGetReferentialItem(id);
    if (!existing) return false;
    await prisma.referentialItem.delete({ where: { id: existing.id } });
    return true;
  } catch {
    return false;
  }
}

export async function dbEmptyReferentialsTrash(): Promise<number> {
  const result = await prisma.referentialItem.deleteMany({ where: { archived: true } });
  return result.count;
}

/** Une seule lecture pour tous les onglets du référentiel. */
export async function dbListReferentialCatalog(): Promise<ReferentialItem[]> {
  await autoPurgeExpiredReferentialsTrash()
  let rows = await prisma.referentialItem.findMany({
    orderBy: { createdAt: 'asc' },
  })
  const present = new Set(rows.map((row) => row.categoryId))
  const missing = DEFAULT_REFERENTIAL_SEED.filter((seed) => !present.has(seed.categoryId))
  if (missing.length > 0) {
    await prisma.referentialItem
      .createMany({
        data: missing.map((seed) => ({
          categoryId: seed.categoryId,
          name: seed.name,
          value: seed.value ?? null,
          meta: seed.meta ? (seed.meta as Prisma.InputJsonValue) : undefined,
          archived: false,
        })),
      })
      .catch(() => {})
    rows = await prisma.referentialItem.findMany({
      orderBy: { createdAt: 'asc' },
    })
  }
  return rows.map(toItem)
}

export async function dbListAllTrashItems(): Promise<ReferentialItem[]> {
  await autoPurgeExpiredReferentialsTrash();
  const rows = await prisma.referentialItem.findMany({
    where: { archived: true },
    orderBy: { name: 'asc' },
  });
  return rows.map(toItem);
}
