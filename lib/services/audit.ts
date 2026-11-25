import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isMockDataEnabled } from '@/lib/mock/config';
import { mockWriteAudit } from '@/lib/mock/audit';

function mergeAuditMeta(
  resourceId: string | undefined,
  meta?: Prisma.InputJsonValue
): Prisma.InputJsonValue | undefined {
  const base =
    meta && typeof meta === 'object' && meta !== null && !Array.isArray(meta)
      ? { ...(meta as Record<string, unknown>) }
      : {};

  if (resourceId && typeof base.resourceId !== 'string') {
    base.resourceId = resourceId;
  }

  return Object.keys(base).length > 0 ? (base as Prisma.InputJsonValue) : undefined;
}

/** Écrit une entrée d’audit. `resourceId` est stocké dans `meta.resourceId`. */
export async function writeAudit(
  userId: string,
  action: string,
  resourceId?: string,
  meta?: Prisma.InputJsonValue
) {
  const finalMeta = mergeAuditMeta(resourceId, meta);
  const metaRecord =
    finalMeta && typeof finalMeta === 'object' && !Array.isArray(finalMeta)
      ? (finalMeta as Record<string, unknown>)
      : {};

  if (isMockDataEnabled()) {
    const comments: string[] = [];
    if (typeof metaRecord.reason === 'string') comments.push(metaRecord.reason);
    if (typeof metaRecord.comment === 'string') comments.push(metaRecord.comment);
    mockWriteAudit(userId, action, resourceId, comments.length ? comments : undefined);
    return;
  }

  await prisma.auditLog.create({
    data: {
      userId,
      action,
      meta: finalMeta,
    },
  });
}

/** Ne bloque jamais l’action métier si l’audit échoue. */
export async function writeAuditSafe(
  userId: string,
  action: string,
  resourceId?: string,
  meta?: Prisma.InputJsonValue
) {
  try {
    await writeAudit(userId, action, resourceId, meta);
  } catch (err) {
    console.error('[audit] write failed', action, err);
  }
}
