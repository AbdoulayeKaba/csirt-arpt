import { timingSafeEqual } from 'node:crypto'

function sameSecret(provided: string, expected: string): boolean {
  const left = Buffer.from(provided)
  const right = Buffer.from(expected)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

/** Vérifie le secret partagé pour les tâches planifiées (cron). En-têtes uniquement. */
export function verifyCronSecret(req: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim()
  if (!expected) return false

  const auth = req.headers.get('authorization')?.trim()
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return sameSecret(auth.slice(7).trim(), expected)
  }

  const header = req.headers.get('x-cron-secret')?.trim()
  if (header) return sameSecret(header, expected)

  return false
}
