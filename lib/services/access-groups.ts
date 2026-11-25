import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isMockDataEnabled } from '@/lib/mock/config';
import { isRoleOnlyPermission, sanitizeGroupPermissionIds } from '@/lib/auth/access-policy';

export type AccessGroupMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type AccessGroupRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  roleId: string | null;
  permissionIds: string[];
  members: AccessGroupMember[];
};

type GroupRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean | number;
  role_id: string | null;
  permissions: string;
};

const mockGroups: AccessGroupRecord[] = [];
const mockDenies = new Map<string, string[]>();

function isCorrespondentRole(roleId: string | null | undefined) {
  return (roleId ?? '').trim().toUpperCase() === 'CORRESPONDANT';
}

function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'groupe';
}

function parsePermissionIds(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw || '{}') as Record<string, boolean>;
    return Object.entries(parsed)
      .filter(([, enabled]) => enabled === true)
      .map(([id]) => id);
  } catch {
    return [];
  }
}

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (isMockDataEnabled()) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS access_groups (
          id VARCHAR(191) NOT NULL,
          name VARCHAR(120) NOT NULL,
          slug VARCHAR(120) NOT NULL,
          description TEXT NULL,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          archived BOOLEAN NOT NULL DEFAULT FALSE,
          permissions LONGTEXT NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (id),
          UNIQUE KEY access_groups_slug_key (slug)
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS access_group_members (
          group_id VARCHAR(191) NOT NULL,
          user_id VARCHAR(191) NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (group_id, user_id),
          KEY access_group_members_user_idx (user_id)
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS user_permission_denies (
          user_id VARCHAR(191) NOT NULL,
          permission_id VARCHAR(64) NOT NULL,
          PRIMARY KEY (user_id, permission_id)
        )
      `);
      const roleColumn = await prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*) AS total
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'access_groups'
          AND COLUMN_NAME = 'role_id'
      `;
      if (Number(roleColumn[0]?.total ?? 0) === 0) {
        await prisma.$executeRawUnsafe(`ALTER TABLE access_groups ADD COLUMN role_id VARCHAR(64) NULL`);
      }
      await seedFromDepartments();
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

async function seedFromDepartments(): Promise<void> {
  const existing = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) AS total FROM access_groups
  `;
  if (Number(existing[0]?.total ?? 0) > 0) return;

  const departments = await prisma.$queryRaw<Array<{ id: string; name: string; value: string | null }>>`
    SELECT id, name, value
    FROM dg_referential_items
    WHERE category_id = 'departements' AND archived = 0
  `;

  for (const department of departments) {
    const name = department.name.trim();
    if (!name) continue;
    const slug = slugify(department.value || name);
    try {
      await prisma.$executeRaw`
        INSERT INTO access_groups (id, name, slug, description, active, archived, permissions, created_at, updated_at)
        VALUES (
          ${department.id},
          ${name},
          ${slug},
          ${'Repris de l’ancien référentiel Départements. Aucune permission complémentaire.'},
          TRUE,
          FALSE,
          ${'{}'},
          NOW(3),
          NOW(3)
        )
      `;
      await prisma.$executeRaw`
        INSERT IGNORE INTO access_group_members (group_id, user_id, created_at)
        SELECT ${department.id}, id, NOW(3)
        FROM users
        WHERE department = ${name} AND role <> 'CORRESPONDANT'
      `;
    } catch (error) {
      console.error('[access-groups] reprise département ignorée', name, error);
    }
  }
}

async function uniqueSlug(name: string, ignoreId?: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let index = 2;
  while (true) {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM access_groups WHERE slug = ${slug} LIMIT 1
    `;
    if (!rows[0] || rows[0].id === ignoreId) return slug;
    slug = `${base}-${index}`;
    index += 1;
  }
}

async function membersByGroup(groupIds: string[]): Promise<Map<string, AccessGroupMember[]>> {
  const map = new Map<string, AccessGroupMember[]>();
  if (groupIds.length === 0) return map;
  const rows = await prisma.$queryRaw<
    Array<{ group_id: string; id: string; first_name: string; last_name: string; email: string }>
  >`
    SELECT m.group_id, u.id, u.first_name, u.last_name, u.email
    FROM access_group_members m
    INNER JOIN users u ON u.id = m.user_id
    WHERE m.group_id IN (${Prisma.join(groupIds)})
    ORDER BY u.last_name ASC, u.first_name ASC
  `;
  for (const row of rows) {
    const list = map.get(row.group_id) ?? [];
    list.push({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
    });
    map.set(row.group_id, list);
  }
  return map;
}

function toRecord(row: GroupRow, members: AccessGroupMember[]): AccessGroupRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? '',
    active: Boolean(row.active),
    roleId: row.role_id,
    permissionIds: parsePermissionIds(row.permissions),
    members,
  };
}

export async function listAccessGroups(): Promise<AccessGroupRecord[]> {
  if (isMockDataEnabled()) return mockGroups.map((group) => ({ ...group, members: [...group.members] }));
  await ensureSchema();
  const rows = await prisma.$queryRaw<GroupRow[]>`
    SELECT id, name, slug, description, active, role_id, permissions
    FROM access_groups
    WHERE archived = FALSE
    ORDER BY name ASC
  `;
  const members = await membersByGroup(rows.map((row) => row.id));
  return rows.map((row) => toRecord(row, members.get(row.id) ?? []));
}

export async function listUserGroups(userIds?: string[]): Promise<Map<string, { id: string; name: string; active: boolean }[]>> {
  const map = new Map<string, { id: string; name: string; active: boolean }[]>();
  if (isMockDataEnabled()) {
    for (const group of mockGroups) {
      for (const member of group.members) {
        if (userIds && !userIds.includes(member.id)) continue;
        const list = map.get(member.id) ?? [];
        list.push({ id: group.id, name: group.name, active: group.active });
        map.set(member.id, list);
      }
    }
    return map;
  }
  await ensureSchema();
  const rows = userIds && userIds.length > 0
    ? await prisma.$queryRaw<Array<{ user_id: string; id: string; name: string; active: boolean | number }>>`
        SELECT m.user_id, g.id, g.name, g.active
        FROM access_group_members m
        INNER JOIN access_groups g ON g.id = m.group_id
        WHERE g.archived = FALSE AND m.user_id IN (${Prisma.join(userIds)})
        ORDER BY g.name ASC
      `
    : await prisma.$queryRaw<Array<{ user_id: string; id: string; name: string; active: boolean | number }>>`
        SELECT m.user_id, g.id, g.name, g.active
        FROM access_group_members m
        INNER JOIN access_groups g ON g.id = m.group_id
        WHERE g.archived = FALSE
        ORDER BY g.name ASC
      `;
  for (const row of rows) {
    const list = map.get(row.user_id) ?? [];
    list.push({ id: row.id, name: row.name, active: Boolean(row.active) });
    map.set(row.user_id, list);
  }
  return map;
}

export async function listDeniedPermissionIds(userId: string): Promise<string[]> {
  if (isMockDataEnabled()) return [...(mockDenies.get(userId) ?? [])];
  await ensureSchema();
  const rows = await prisma.$queryRaw<Array<{ permission_id: string }>>`
    SELECT permission_id FROM user_permission_denies WHERE user_id = ${userId}
  `;
  return rows.map((row) => row.permission_id);
}

export async function listDeniesByUser(userIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (userIds.length === 0) return map;
  if (isMockDataEnabled()) {
    for (const userId of userIds) map.set(userId, [...(mockDenies.get(userId) ?? [])]);
    return map;
  }
  await ensureSchema();
  const rows = await prisma.$queryRaw<Array<{ user_id: string; permission_id: string }>>`
    SELECT user_id, permission_id
    FROM user_permission_denies
    WHERE user_id IN (${Prisma.join(userIds)})
  `;
  for (const row of rows) {
    const list = map.get(row.user_id) ?? [];
    list.push(row.permission_id);
    map.set(row.user_id, list);
  }
  return map;
}

export async function listGrantIdsForUser(userId: string): Promise<string[]> {
  if (isMockDataEnabled()) {
    const { mockFindUserById } = await import('@/lib/mock/users-store');
    const role = mockFindUserById(userId)?.role ?? null;
    const ids = new Set<string>();
    for (const group of mockGroups) {
      if (!group.active) continue;
      const member = group.members.some((item) => item.id === userId);
      if (!member && group.roleId !== role) continue;
      for (const id of group.permissionIds) ids.add(id);
    }
    return [...ids];
  }
  await ensureSchema();
  const rows = await prisma.$queryRaw<Array<{ permissions: string }>>`
    SELECT g.permissions
    FROM access_groups g
    INNER JOIN users u ON u.id = ${userId}
    LEFT JOIN access_group_members m ON m.group_id = g.id AND m.user_id = u.id
    WHERE g.active = TRUE
      AND g.archived = FALSE
      AND (m.user_id IS NOT NULL OR g.role_id = u.role)
  `;
  const ids = new Set<string>();
  for (const row of rows) {
    for (const id of parsePermissionIds(row.permissions)) ids.add(id);
  }
  return [...ids];
}

async function replaceGroupMembers(groupId: string, userIds: string[]): Promise<void> {
  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  await prisma.$executeRaw`DELETE FROM access_group_members WHERE group_id = ${groupId}`;
  for (const userId of unique) {
    await prisma.$executeRaw`
      INSERT INTO access_group_members (group_id, user_id, created_at)
      VALUES (${groupId}, ${userId}, NOW(3))
    `;
  }
}

function sameGroupName(left: string, right: string) {
  return left.trim().localeCompare(right.trim(), 'fr', { sensitivity: 'base' }) === 0;
}

/** Lie un groupe au rôle. Un nom vide retire le lien. Un nom inconnu crée le groupe. */
export async function bindGroupToRole(roleId: string, groupName: string, description?: string): Promise<void> {
  const name = groupName.trim();
  if (name.length === 1) return;
  if (isMockDataEnabled()) {
    for (const group of mockGroups) {
      if (group.roleId === roleId) group.roleId = null;
    }
    if (!name) return;
    const existing = mockGroups.find((group) => sameGroupName(group.name, name));
    if (existing) {
      existing.roleId = roleId;
      return;
    }
    await createAccessGroup({ name, description, roleId });
    return;
  }
  await ensureSchema();
  await prisma.$executeRaw`
    UPDATE access_groups SET role_id = NULL, updated_at = NOW(3) WHERE role_id = ${roleId}
  `;
  if (!name) return;
  const rows = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT id, name FROM access_groups WHERE archived = FALSE
  `;
  const existing = rows.find((row) => sameGroupName(row.name, name));
  if (existing) {
    await prisma.$executeRaw`
      UPDATE access_groups SET role_id = ${roleId}, updated_at = NOW(3) WHERE id = ${existing.id}
    `;
    return;
  }
  await createAccessGroup({ name, description, roleId });
}

export async function createAccessGroup(input: {
  name: string;
  description?: string;
  permissionIds?: string[];
  userIds?: string[];
  roleId?: string | null;
}): Promise<{ ok: true; group: AccessGroupRecord; rejected: string[] } | { ok: false; error: string }> {
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: 'NAME_REQUIRED' };
  if (isCorrespondentRole(input.roleId)) return { ok: false, error: 'ROLE_NOT_ALLOWED' };
  const { granted, rejected } = sanitizeGroupPermissionIds(input.permissionIds ?? []);
  if (isMockDataEnabled()) {
    const group: AccessGroupRecord = {
      id: randomUUID(),
      name,
      slug: slugify(name),
      description: input.description?.trim() ?? '',
      active: true,
      roleId: input.roleId ?? null,
      permissionIds: granted,
      members: [],
    };
    mockGroups.push(group);
    return { ok: true, group, rejected };
  }
  await ensureSchema();
  const id = randomUUID();
  const slug = await uniqueSlug(name);
  await prisma.$executeRaw`
    INSERT INTO access_groups (id, name, slug, description, active, archived, role_id, permissions, created_at, updated_at)
    VALUES (${id}, ${name}, ${slug}, ${input.description?.trim() || null}, TRUE, FALSE, ${input.roleId ?? null}, ${JSON.stringify(Object.fromEntries(granted.map((permissionId) => [permissionId, true])))}, NOW(3), NOW(3))
  `;
  await replaceGroupMembers(id, input.userIds ?? []);
  const [group] = (await listAccessGroups()).filter((item) => item.id === id);
  return { ok: true, group, rejected };
}

export async function updateAccessGroup(
  id: string,
  patch: {
    name?: string;
    description?: string;
    active?: boolean;
    permissionIds?: string[];
    userIds?: string[];
    roleId?: string | null;
  }
): Promise<{ ok: true; group: AccessGroupRecord; rejected: string[] } | { ok: false; error: string }> {
  if (isCorrespondentRole(patch.roleId)) return { ok: false, error: 'ROLE_NOT_ALLOWED' };
  if (isMockDataEnabled()) {
    const group = mockGroups.find((item) => item.id === id);
    if (!group) return { ok: false, error: 'NOT_FOUND' };
    if (patch.name !== undefined) group.name = patch.name.trim();
    if (patch.description !== undefined) group.description = patch.description.trim();
    if (patch.active !== undefined) group.active = patch.active;
    if (patch.roleId !== undefined) group.roleId = patch.roleId;
    const { granted, rejected } = sanitizeGroupPermissionIds(patch.permissionIds ?? group.permissionIds);
    if (patch.permissionIds) group.permissionIds = granted;
    return { ok: true, group, rejected: patch.permissionIds ? rejected : [] };
  }
  await ensureSchema();
  const current = await prisma.$queryRaw<GroupRow[]>`
    SELECT id, name, slug, description, active, role_id, permissions FROM access_groups WHERE id = ${id} AND archived = FALSE LIMIT 1
  `;
  if (!current[0]) return { ok: false, error: 'NOT_FOUND' };
  const name = patch.name?.trim() || current[0].name;
  const description = patch.description !== undefined ? patch.description.trim() : current[0].description;
  const active = patch.active !== undefined ? patch.active : Boolean(current[0].active);
  const roleId = patch.roleId !== undefined ? patch.roleId || null : current[0].role_id;
  const { granted, rejected } = sanitizeGroupPermissionIds(
    patch.permissionIds ?? parsePermissionIds(current[0].permissions)
  );
  const slug = patch.name ? await uniqueSlug(name, id) : current[0].slug;
  await prisma.$executeRaw`
    UPDATE access_groups
    SET name = ${name},
        slug = ${slug},
        description = ${description || null},
        active = ${active},
        role_id = ${roleId},
        permissions = ${JSON.stringify(Object.fromEntries(granted.map((permissionId) => [permissionId, true])))},
        updated_at = NOW(3)
    WHERE id = ${id}
  `;
  if (patch.userIds) await replaceGroupMembers(id, patch.userIds);
  const [group] = (await listAccessGroups()).filter((item) => item.id === id);
  return { ok: true, group, rejected: patch.permissionIds ? rejected : [] };
}

export async function setUserGroups(userId: string, groupIds: string[]): Promise<void> {
  const unique = [...new Set(groupIds.map((id) => id.trim()).filter(Boolean))];
  if (isMockDataEnabled()) {
    for (const group of mockGroups) {
      group.members = group.members.filter((member) => member.id !== userId);
    }
    return;
  }
  await ensureSchema();
  await prisma.$executeRaw`DELETE FROM access_group_members WHERE user_id = ${userId}`;
  if (unique.length === 0) return;
  const allowed = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM access_groups
    WHERE archived = FALSE AND active = TRUE AND id IN (${Prisma.join(unique)})
  `;
  for (const row of allowed) {
    await prisma.$executeRaw`
      INSERT INTO access_group_members (group_id, user_id, created_at)
      VALUES (${row.id}, ${userId}, NOW(3))
    `;
  }
}

export async function setUserPermissionDenies(userId: string, permissionIds: string[], role: string): Promise<void> {
  const unique = [...new Set(permissionIds.map((id) => id.trim()).filter(Boolean))].filter(
    (id) => !(role === 'ASSISTANT' && isRoleOnlyPermission(id))
  );
  if (isMockDataEnabled()) {
    mockDenies.set(userId, unique);
    return;
  }
  await ensureSchema();
  await prisma.$executeRaw`DELETE FROM user_permission_denies WHERE user_id = ${userId}`;
  for (const permissionId of unique) {
    await prisma.$executeRaw`
      INSERT INTO user_permission_denies (user_id, permission_id)
      VALUES (${userId}, ${permissionId})
    `;
  }
}
