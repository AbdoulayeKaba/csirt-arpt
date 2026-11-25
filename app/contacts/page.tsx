import { CsirtContactsPage } from '@/components/csirt/csirt-contacts'
import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page'
import { CSIRT_BRAND } from '@/lib/csirt/brand'
import { pickPlatformBranding } from '@/lib/dg/platform-branding'
import { getPlatformSettings } from '@/lib/services/platform-settings'

export const metadata = {
  title: 'Contacts — CSIRT-ARPT',
  description: `Contacter le CSIRT-ARPT : ${CSIRT_BRAND.email}`,
}

export default async function Page() {
  const settings = await getPlatformSettings()
  const branding = pickPlatformBranding(settings)

  return (
    <CsirtInnerPage variant="full" showNewsletterCta={false}>
      <CsirtContactsPage
            contact={{
              email: branding.contact.email,
              phone: branding.contact.phone,
              address: branding.contact.address,
              mapUrl: settings.institutionMapUrl,
              hours: branding.contact.hours,
              website: settings.institutionWebsite?.trim() || `https://${CSIRT_BRAND.siteHost}`,
              organizationName: branding.organizationName || CSIRT_BRAND.name,
            }}
          />
    </CsirtInnerPage>
  )
}
