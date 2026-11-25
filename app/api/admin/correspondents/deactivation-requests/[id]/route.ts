import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDgSession } from '@/lib/auth/session-server';
import { decideCorrespondentDeactivation } from '@/lib/services/correspondent-deactivation';

const bodySchema = z.object({
  decision: z.enum(['approve', 'reject']),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await getDgSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Décision invalide.' }, { status: 422 });
  }

  const { id } = await ctx.params;
  try {
    const result = await decideCorrespondentDeactivation(id, session.userId, parsed.data);
    if (!result.ok) {
      const status = result.error === 'Demande introuvable.' ? 404 : 403;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ ok: true, deactivation: result.request });
  } catch (e) {
    console.error('[POST /api/admin/correspondents/deactivation-requests/:id]', e);
    return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 });
  }
}
