import type { ReferentialCategoryId } from '@/lib/dg/referential-catalog';

export function validateReferentialPayload(
  _categoryId: ReferentialCategoryId,
  data: { name: string; value?: string; meta?: unknown }
): { ok: true; value?: string; meta?: unknown } | { ok: false; error: string } {
  const name = data.name.trim();
  if (!name) return { ok: false, error: 'NAME_REQUIRED' };
  return {
    ok: true,
    value: data.value?.trim() || undefined,
    meta: data.meta,
  };
}
