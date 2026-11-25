import { listReferentialItems } from '@/lib/services/referentials-admin'
import { DEFAULT_DECLARANT_TYPES_SEED, DEFAULT_ORGANISATIONS_SEED } from '@/lib/seed/referentials-default'

export type CorrespondentDeclarant = {
  id: string
  label: string
}

function sameName(left: string, right: string) {
  return left.trim().localeCompare(right.trim(), 'fr', { sensitivity: 'accent' }) === 0
}

/** Type de déclarant porté par l’organisation du référentiel, pas par la saisie du formulaire. */
export async function resolveOrganisationDeclarant(organizationName: string): Promise<CorrespondentDeclarant> {
  const name = organizationName.trim()
  if (!name) return { id: '', label: '' }

  const [declarantRows, orgRows] = await Promise.all([
    listReferentialItems('types_declarant', { archived: false }).catch(() => []),
    listReferentialItems('organisations', { archived: false }).catch(() => []),
  ])

  const types =
    declarantRows.length > 0
      ? declarantRows.map((item) => ({ id: item.value || item.id, label: item.name }))
      : DEFAULT_DECLARANT_TYPES_SEED.map((item) => ({ id: item.value || item.name, label: item.name }))

  const live = orgRows.find((item) => sameName(item.name, name))
  const seed = DEFAULT_ORGANISATIONS_SEED.find((item) => sameName(item.name, name))
  const meta = (live?.meta ?? null) as { declarantType?: string } | null
  const id = (meta?.declarantType || seed?.meta?.declarantType || '').trim()
  const label = types.find((item) => item.id === id)?.label || ''
  return { id, label }
}
