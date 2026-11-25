import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/site/cron-auth'

/** La collecte planifiée est arrêtée : les alertes se saisissent manuellement. */
export async function POST(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    skipped: true,
    disabled: true,
    dueCount: 0,
    added: 0,
    message: 'La collecte automatique est arrêtée. Les alertes sont saisies manuellement.',
  })
}
