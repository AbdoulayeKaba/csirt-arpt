/**
 * Restaure toutes les permissions du rôle Administrateur (ASSISTANT).
 * Usage : npx tsx scripts/restore-assistant-permissions.ts
 */
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/dg/permission-catalog'
import {
  getPlatformSettingValue,
  upsertPlatformSettingValue,
} from '@/lib/services/platform-settings-store'

const SETTINGS_KEY = 'dg_role_permissions'

async function main() {
  const raw = await getPlatformSettingValue(SETTINGS_KEY)
  let data: {
    permissions?: Record<string, Record<string, boolean>>
    archived?: string[]
    descriptions?: Record<string, string>
    labels?: Record<string, string>
    customRoles?: unknown[]
  } = {}

  if (raw) {
    try {
      data = JSON.parse(raw) as typeof data
    } catch {
      console.warn('JSON permissions invalide — reconstruction depuis les défauts.')
      data = {}
    }
  }

  const permissions = {
    ...(data.permissions ?? {}),
    ASSISTANT: {
      ...DEFAULT_ROLE_PERMISSIONS.ASSISTANT,
    },
  }

  // Garantir aussi les rôles système manquants
  for (const roleId of Object.keys(DEFAULT_ROLE_PERMISSIONS) as Array<
    keyof typeof DEFAULT_ROLE_PERMISSIONS
  >) {
    if (!permissions[roleId]) {
      permissions[roleId] = { ...DEFAULT_ROLE_PERMISSIONS[roleId] }
    }
  }

  const next = {
    permissions,
    archived: Array.isArray(data.archived) ? data.archived.filter((r) => r !== 'ASSISTANT') : [],
    descriptions: data.descriptions ?? {},
    labels: data.labels ?? {},
    customRoles: data.customRoles ?? [],
  }

  const ok = await upsertPlatformSettingValue(SETTINGS_KEY, JSON.stringify(next))
  if (!ok) {
    console.error('Échec de sauvegarde des permissions.')
    process.exit(1)
  }

  const adminMenus = Object.entries(next.permissions.ASSISTANT)
    .filter(([id, on]) => id.startsWith('menu.admin.') && on)
    .map(([id]) => id)

  console.log('Rôle ASSISTANT (Administrateur) restauré avec le catalogue complet.')
  console.log(`Menus administration actifs : ${adminMenus.length}`)
  for (const id of adminMenus) console.log(`  - ${id}`)
  console.log('Reconnectez-vous ou rechargez la page pour voir le menu Administration.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
