import type { ReferentialCategoryId } from '@/lib/dg/referential-catalog';
import { REFERENTIAL_CATEGORIES } from '@/lib/dg/referential-catalog';
import { isMockDataEnabled } from '@/lib/mock/config';
import {
  mockCreateReferential,
  mockEmptyReferentialsTrash,
  mockGetReferential,
  mockListReferentials,
  mockPurgeReferential,
  mockUpdateReferential,
  type ReferentialItem,
} from '@/lib/mock/referentials-store';
import {
  countReferentialsByCategory,
  dbCreateReferentialItem,
  dbEmptyReferentialsTrash,
  dbGetReferentialItem,
  dbListAllTrashItems,
  dbListReferentialCatalog,
  dbListReferentialItems,
  dbPurgeReferentialItem,
  dbUpdateReferentialItem,
} from '@/lib/services/referential-db';
import { validateReferentialPayload } from '@/lib/services/referential-validation';

export async function getReferentialsOverview() {
  const counts: Record<string, { active: number; trash: number }> = {};

  for (const cat of REFERENTIAL_CATEGORIES) {
    if (isMockDataEnabled()) {
      counts[cat.id] = {
        active: mockListReferentials(cat.id, false).length,
        trash: mockListReferentials(cat.id, true).length,
      };
    } else {
      counts[cat.id] = {
        active: await countReferentialsByCategory(cat.id, false),
        trash: await countReferentialsByCategory(cat.id, true),
      };
    }
  }

  return { counts };
}

function itemMatchesSearch(item: ReferentialItem, q: string): boolean {
  const haystack = [
    item.name,
    item.value,
    item.meta && 'motif' in item.meta ? item.meta.motif : '',
    item.meta && 'date' in item.meta ? item.meta.date : '',
    item.meta && 'type' in item.meta ? String(item.meta.type) : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function sortReferentialItems(
  _categoryId: ReferentialCategoryId,
  items: ReferentialItem[]
): ReferentialItem[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export async function listReferentialCatalog(): Promise<ReferentialItem[]> {
  if (isMockDataEnabled()) {
    const all: ReferentialItem[] = []
    for (const cat of REFERENTIAL_CATEGORIES) {
      all.push(...mockListReferentials(cat.id, false), ...mockListReferentials(cat.id, true))
    }
    return all
  }
  return dbListReferentialCatalog()
}

export async function listAllTrashItems(search?: string): Promise<ReferentialItem[]> {
  let items = isMockDataEnabled()
    ? (() => {
        const cats = REFERENTIAL_CATEGORIES.filter((c) => c.kind === 'list').map((c) => c.id);
        const all: ReferentialItem[] = [];
        for (const cat of cats) all.push(...mockListReferentials(cat, true));
        return all;
      })()
    : await dbListAllTrashItems();

  const q = search?.trim().toLowerCase();
  if (q) items = items.filter((i) => itemMatchesSearch(i, q));
  return items.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export async function listReferentialItems(
  categoryId: ReferentialCategoryId,
  opts: { archived?: boolean; search?: string }
): Promise<ReferentialItem[]> {
  const archived = opts.archived ?? false;
  let items = isMockDataEnabled()
    ? mockListReferentials(categoryId, archived)
    : await dbListReferentialItems(categoryId, archived);

  const q = opts.search?.trim().toLowerCase();
  if (q) items = items.filter((i) => itemMatchesSearch(i, q));
  return sortReferentialItems(categoryId, items);
}

export async function getReferentialItemById(id: string): Promise<ReferentialItem | null> {
  if (isMockDataEnabled()) return mockGetReferential(id) ?? null;
  return dbGetReferentialItem(id);
}

export async function createReferentialItem(data: {
  categoryId: ReferentialCategoryId;
  name: string;
  value?: string;
  meta?: unknown;
}) {
  const validated = validateReferentialPayload(data.categoryId, data);
  if (!validated.ok) return { ok: false as const, error: validated.error };

  const payload = {
    categoryId: data.categoryId,
    name: data.name.trim(),
    value: validated.value,
    meta: validated.meta,
  };

  if (isMockDataEnabled()) {
    const item = mockCreateReferential(payload);
    return { ok: true as const, item };
  }

  const item = await dbCreateReferentialItem(payload);
  return { ok: true as const, item };
}

export async function updateReferentialItem(
  id: string,
  patch: Partial<Pick<ReferentialItem, 'name' | 'value' | 'meta' | 'archived'>>
) {
  if (isMockDataEnabled()) {
    const existing = mockGetReferential(id);
    if (!existing) return { ok: false as const, error: 'NOT_FOUND' };

    if (patch.name !== undefined || patch.meta !== undefined || patch.value !== undefined) {
      const validated = validateReferentialPayload(existing.categoryId, {
        name: patch.name ?? existing.name,
        value: patch.value ?? existing.value,
        meta: patch.meta ?? existing.meta,
      });
      if (!validated.ok) return { ok: false as const, error: validated.error };
      const item = mockUpdateReferential(id, {
        ...patch,
        name: patch.name ?? existing.name,
        value: validated.value,
        meta: validated.meta,
      });
      if (!item) return { ok: false as const, error: 'NOT_FOUND' };
      return { ok: true as const, item };
    }

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

    const item = mockUpdateReferential(id, {
      ...patch,
      meta: updatedMeta,
    });
    if (!item) return { ok: false as const, error: 'NOT_FOUND' };
    return { ok: true as const, item };
  }

  const existing = await dbGetReferentialItem(id);
  if (!existing) return { ok: false as const, error: 'NOT_FOUND' };

  if (patch.name !== undefined || patch.meta !== undefined || patch.value !== undefined) {
    const validated = validateReferentialPayload(existing.categoryId, {
      name: patch.name ?? existing.name,
      value: patch.value ?? existing.value,
      meta: patch.meta ?? existing.meta,
    });
    if (!validated.ok) return { ok: false as const, error: validated.error };
    const item = await dbUpdateReferentialItem(existing.id, {
      ...patch,
      name: patch.name ?? existing.name,
      value: validated.value,
      meta: validated.meta,
    });
    if (!item) return { ok: false as const, error: 'NOT_FOUND' };
    return { ok: true as const, item };
  }

  const item = await dbUpdateReferentialItem(existing.id, patch);
  if (!item) return { ok: false as const, error: 'NOT_FOUND' };
  return { ok: true as const, item };
}

export async function purgeReferentialItem(id: string) {
  if (isMockDataEnabled()) {
    const ok = mockPurgeReferential(id);
    return ok ? { ok: true as const } : { ok: false as const, error: 'NOT_FOUND' };
  }
  const existing = await dbGetReferentialItem(id);
  if (!existing) return { ok: false as const, error: 'NOT_FOUND' };
  const ok = await dbPurgeReferentialItem(existing.id);
  return ok ? { ok: true as const } : { ok: false as const, error: 'NOT_FOUND' };
}

export async function emptyReferentialsTrash() {
  if (isMockDataEnabled()) return { purged: mockEmptyReferentialsTrash() };
  const purged = await dbEmptyReferentialsTrash();
  return { purged };
}


