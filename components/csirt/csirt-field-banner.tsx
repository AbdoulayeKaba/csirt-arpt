import type { SiteFieldBanner } from '@/lib/site/types'

const DEFAULT_BANNER: SiteFieldBanner = {
  src: '/csirt/field-banner.png',
  alt: 'Contrôle de terrain des réseaux de télécommunications par un agent ARPT',
}

export function CsirtFieldBanner({ banner = DEFAULT_BANNER }: { banner?: SiteFieldBanner }) {
  return (
    <section className="csirt-field" aria-label={banner.alt}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.src} alt={banner.alt} />
      <span className="csirt-field-stripe" aria-hidden />
    </section>
  )
}
