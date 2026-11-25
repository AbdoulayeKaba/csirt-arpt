import { NextResponse } from 'next/server'
import {
  getNewsletterPopupConfig,
  toPublicNewsletterPopupConfig,
} from '@/lib/admin/newsletter-popup'

export async function GET() {
  const config = await getNewsletterPopupConfig()
  return NextResponse.json(toPublicNewsletterPopupConfig(config), {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
