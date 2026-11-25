import type { ReactNode } from 'react'
import { ShieldCheck, Sparkles } from 'lucide-react'
import { AuthAgendaMock } from '@/components/auth/auth-agenda-mock'
import { AuthLoginLogo } from '@/components/auth/auth-login-logo'
import { AuthHeroTitle } from '@/components/auth/auth-hero-title'
import { AppSecureFooter } from '@/components/layout/app-secure-footer'
import type { PlatformBranding } from '@/lib/dg/platform-branding'
import { CSIRT_BRAND } from '@/lib/csirt/brand'

type Props = {
  branding: PlatformBranding
  title: string
  subtitle: string
  children: ReactNode
  footerSlot?: ReactNode
}

const STEPS = [
  {
    index: '01',
    title: 'Présentation',
    desc: 'Identité et missions du CSIRT-ARPT.',
  },
  {
    index: '02',
    title: 'Contact officiel',
    desc: `${CSIRT_BRAND.email} — canal unique.`,
  },
  {
    index: '03',
    title: 'Signalement',
    desc: 'Formulaire intégré prévu en v4.0.',
  },
] as const

export function AuthPageShell({
  branding,
  title,
  subtitle,
  children,
  footerSlot,
}: Props) {
  const orgLabel = CSIRT_BRAND.name

  return (
    <div className="admin-theme auth-login-page">
      <div className="auth-login-layout">
        <aside className="auth-login-hero" aria-label="Présentation">
          <div className="auth-login-hero-bg" aria-hidden />
          <div className="auth-login-hero-orb auth-login-hero-orb--a" aria-hidden />
          <div className="auth-login-hero-orb auth-login-hero-orb--b" aria-hidden />

          <div className="auth-login-hero-inner">
            <div className="auth-login-hero-brand">
              <div className="auth-login-logo-plate">
                <AuthLoginLogo
                  variant="hero"
                  institutionLogoUrl={branding.institutionLogoUrl}
                  organizationName={orgLabel}
                />
              </div>
              <div className="auth-login-hero-brand-text">
                <span className="auth-login-hero-brand-title">{orgLabel}</span>
                <span className="auth-login-hero-brand-sub">{CSIRT_BRAND.fullName}</span>
              </div>
            </div>

            <div className="auth-login-hero-copyblock">
              <p className="auth-login-hero-badge">
                <Sparkles className="h-2.5 w-2.5" aria-hidden />
                Espace équipe CSIRT
              </p>
              <AuthHeroTitle
                prefix="Le CSIRT-ARPT,"
                words={['opérationnel.', 'sécurisé.', 'coordonné.', 'joignable.']}
              />
              <p className="auth-login-hero-desc">
                Accès réservé aux analystes et à la gouvernance CSIRT-ARPT — contenu, recette et
                traitement des signalements.
              </p>
            </div>

            <ol className="auth-login-hero-steps" aria-label="Parcours CSIRT">
              {STEPS.map((step) => (
                <li key={step.index} className="auth-login-hero-step">
                  <span className="auth-login-hero-step-index" aria-hidden>
                    {step.index}
                  </span>
                  <div className="auth-login-hero-step-body">
                    <p className="auth-login-hero-step-title">{step.title}</p>
                    <p className="auth-login-hero-step-desc">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <AuthAgendaMock />

            <p className="auth-login-hero-copy">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Accès réservé · {CSIRT_BRAND.parent}
            </p>
          </div>
        </aside>

        <div className="auth-login-main">
          <div className="auth-login-wrap">
            <div className="auth-login-head">
              <AuthLoginLogo
                variant="mobile"
                institutionLogoUrl={branding.institutionLogoUrl}
                organizationName={orgLabel}
              />
              <h2 className="auth-login-title">{title}</h2>
              <p className="auth-login-subtitle">{subtitle}</p>
            </div>

            {children}

            {footerSlot ?? <AppSecureFooter variant="login" />}
          </div>
        </div>
      </div>
    </div>
  )
}
