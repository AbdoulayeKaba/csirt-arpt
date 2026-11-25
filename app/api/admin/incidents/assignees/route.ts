import { NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/api-auth'
import { listUsers } from '@/lib/services/users-admin'
import { roleDisplayLabel, buildRoleLabelMap } from '@/lib/services/assignable-roles'

export type IncidentAssigneeOption = {
  id: string
  email: string
  fullName: string
  roleLabel: string
}

export async function GET() {
  const { error } = await requireApiSession()
  if (error) return error

  try {
    const [users, roleLabels] = await Promise.all([listUsers(), buildRoleLabelMap()])
    const items: IncidentAssigneeOption[] = users
      .filter(
        (user) =>
          user.active && !user.archived && String(user.role).toUpperCase() !== 'CORRESPONDANT'
      )
      .map((user) => {
        const fullName = `${user.firstName} ${user.lastName}`.trim()
        const roleLabel = roleDisplayLabel(user.role, roleLabels)
        return {
          id: user.id,
          email: user.email,
          fullName: roleLabel ? `${fullName} (${roleLabel})` : fullName,
          roleLabel,
        }
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'))

    return NextResponse.json({ items })
  } catch (e) {
    console.error('[GET /api/admin/incidents/assignees]', e)
    return NextResponse.json({ error: 'LOAD_FAILED' }, { status: 500 })
  }
}
