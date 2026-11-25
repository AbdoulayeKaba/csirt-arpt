import { InstitutionLogoImage } from '@/components/layout/institution-logo-image'
import { CSIRT_BRAND, CSIRT_LOGO_SRC, resolveCsirtLogoSrc } from '@/lib/csirt/brand'
import type { LogoProcessMode } from '@/lib/images/strip-logo-background'
import { cn } from '@/lib/utils'

type Props = {
  institutionLogoUrl?: string
  certLogoUrl?: string
  showWordmark?: boolean
  /** `onDark` : logo sans fond blanc, lisible sur pied de page sombre. */
  variant?: 'default' | 'onDark'
}

export function ArptLogo({
  institutionLogoUrl,
  certLogoUrl,
  showWordmark = true,
  variant = 'default',
}: Props) {
  const src = resolveCsirtLogoSrc(institutionLogoUrl)
  const certSrc = certLogoUrl?.trim() ?? ''
  const isOfficialLockup = src === CSIRT_LOGO_SRC
  const showText = showWordmark && !isOfficialLockup && !certSrc
  const mode: LogoProcessMode = variant === 'onDark' ? 'on-dark' : 'strip-white'

  return (
    <span
      className={cn(
        'csirt-logo',
        'csirt-brand-logos',
        certSrc && 'csirt-brand-logos--pair',
        variant === 'onDark' && 'csirt-logo--on-dark'
      )}
    >
      {certSrc ? (
        <InstitutionLogoImage src={certSrc} alt="CERT" className="csirt-logo-mark" mode={mode} />
      ) : null}
      <InstitutionLogoImage src={src} alt="ARPT" className="csirt-logo-mark" mode={mode} />
      {showText ? (
        <span className="csirt-logo-text">
          <strong>ARPT</strong>
          <span>{CSIRT_BRAND.parent}</span>
        </span>
      ) : null}
    </span>
  )
}
