import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiPermission } from '@/lib/auth/permission-guard'
import {
  getPlatformSettingsForAdmin,
  updatePlatformSettingsForAdmin,
} from '@/lib/services/platform-settings-admin'

const patchSchema = z.object({
  institutionOfficialEmail: z.union([z.literal(''), z.string().email()]).optional(),
  institutionPhone: z.string().max(64).optional(),
  institutionAddress: z.string().max(500).optional(),
  institutionMapUrl: z.string().max(2000).optional(),
  institutionHours: z.string().max(120).optional(),
  institutionWebsite: z.union([z.literal(''), z.string().url()]).optional(),
})

export async function GET() {
  const auth = await requireApiPermission('menu.site.contact')
  if (auth.error) return auth.error

  const settings = await getPlatformSettingsForAdmin()
  return NextResponse.json({
    institutionOfficialEmail: settings.institutionOfficialEmail,
    institutionPhone: settings.institutionPhone,
    institutionAddress: settings.institutionAddress,
    institutionMapUrl: settings.institutionMapUrl,
    institutionHours: settings.institutionHours,
    institutionWebsite: settings.institutionWebsite,
  })
}

export async function PATCH(req: Request) {
  const auth = await requireApiPermission('menu.site.contact')
  if (auth.error) return auth.error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 })
  }

  const settings = await updatePlatformSettingsForAdmin(parsed.data, auth.session.userId)
  try {
    revalidatePath('/contacts')
    revalidateTag('dg-platform-branding', 'max')
  } catch {
    // La config est déjà persistée.
  }
  return NextResponse.json({
    institutionOfficialEmail: settings.institutionOfficialEmail,
    institutionPhone: settings.institutionPhone,
    institutionAddress: settings.institutionAddress,
    institutionMapUrl: settings.institutionMapUrl,
    institutionHours: settings.institutionHours,
    institutionWebsite: settings.institutionWebsite,
  })
}
