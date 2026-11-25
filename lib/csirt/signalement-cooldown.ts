/** Délai minimum entre deux déclarations d’un même correspondant. */
export const CORRESPONDENT_SIGNALEMENT_COOLDOWN_MS = 5 * 60 * 1000

export type SignalementCooldown = {
  active: boolean
  retryAt: string | null
  remainingMs: number
}

type CooldownIncident = {
  email: string
  createdAt: string
}

export function cooldownForEmail(
  incidents: CooldownIncident[],
  email: string,
  now = Date.now(),
): SignalementCooldown {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return { active: false, retryAt: null, remainingMs: 0 }

  let latestMs = 0
  for (const item of incidents) {
    if (item.email.trim().toLowerCase() !== normalized) continue
    const at = Date.parse(item.createdAt)
    if (Number.isFinite(at) && at > latestMs) latestMs = at
  }
  if (!latestMs) return { active: false, retryAt: null, remainingMs: 0 }

  const retryAtMs = latestMs + CORRESPONDENT_SIGNALEMENT_COOLDOWN_MS
  const remainingMs = retryAtMs - now
  if (remainingMs <= 0) return { active: false, retryAt: null, remainingMs: 0 }
  return {
    active: true,
    retryAt: new Date(retryAtMs).toISOString(),
    remainingMs,
  }
}

export function formatCooldownWait(remainingMs: number) {
  const total = Math.max(1, Math.ceil(remainingMs / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  if (minutes <= 0) return `${seconds} s`
  if (seconds === 0) return `${minutes} min`
  return `${minutes} min ${String(seconds).padStart(2, '0')} s`
}

export function cooldownMessage(remainingMs: number) {
  return `Une déclaration vient d’être envoyée. Vous pourrez soumettre un autre incident dans ${formatCooldownWait(remainingMs)}.`
}
