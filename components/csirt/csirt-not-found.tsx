import Link from 'next/link'
import { ArrowRight, Home, Newspaper, ShieldAlert } from 'lucide-react'
import { ArptLogo } from '@/components/csirt/arpt-logo'
import { CSIRT_BRAND } from '@/lib/csirt/brand'
import '@/components/csirt/csirt-not-found.css'

type Props = {
  institutionLogoUrl?: string
}

export function CsirtNotFound({ institutionLogoUrl }: Props) {
  return (
    <section className="csirt-404" aria-labelledby="csirt-404-title">
      <div className="csirt-404__grid" aria-hidden />
      <div className="csirt-404__radar" aria-hidden />
      <p className="csirt-404__code" aria-hidden>
        404
      </p>

      <div className="csirt-404__panel">
        <Link href="/" className="csirt-404__brand" aria-label="Accueil CSIRT-ARPT">
          <span className="csirt-404__brand-mark">
            <ArptLogo
              institutionLogoUrl={institutionLogoUrl}
              showWordmark={false}
              variant="onDark"
            />
          </span>
          <p className="csirt-404__brand-name">
            {CSIRT_BRAND.name}
            <span>{CSIRT_BRAND.fullName}</span>
          </p>
        </Link>

        <p className="csirt-404__status">
          <i aria-hidden />
          Signal perdu
        </p>

        <h1 id="csirt-404-title" className="csirt-404__title">
          Cette page est hors radar.
        </h1>
        <p className="csirt-404__lead">
          L’adresse demandée n’existe pas, a été déplacée, ou n’est plus publiée sur le
          portail CSIRT-ARPT.
        </p>

        <div className="csirt-404__actions">
          <Link href="/" className="csirt-404__btn csirt-404__btn--primary">
            <Home className="h-4 w-4" aria-hidden />
            Retour à l’accueil
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/actualites" className="csirt-404__btn csirt-404__btn--ghost">
            <Newspaper className="h-4 w-4" aria-hidden />
            Actualités
          </Link>
          <Link href="/signalement" className="csirt-404__btn csirt-404__btn--alert">
            <ShieldAlert className="h-4 w-4" aria-hidden />
            Signaler un incident
          </Link>
        </div>
      </div>
    </section>
  )
}
