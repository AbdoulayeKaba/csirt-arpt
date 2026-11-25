import { Lock, Mail, Radio, Shield } from 'lucide-react'
import { CSIRT_BRAND } from '@/lib/csirt/brand'

const CHANNELS = [
  {
    label: 'Messagerie officielle',
    value: CSIRT_BRAND.email,
    meta: 'Point de contact unique',
    tone: 'approved' as const,
    icon: Mail,
  },
  {
    label: 'Présence en ligne',
    value: CSIRT_BRAND.siteHost,
    meta: 'HTTPS / TLS',
    tone: 'free' as const,
    icon: Lock,
  },
  {
    label: 'Veille opérationnelle',
    value: '24 / 7',
    meta: 'Réception des signalements',
    tone: 'approved' as const,
    icon: Radio,
  },
] as const

export function LandingCsirtPanel() {
  return (
    <aside className="landing-page-preview" aria-label="Coordonnées du CSIRT-ARPT">
      <div className="landing-page-preview-chrome" aria-hidden>
        <span />
        <span />
        <span />
      </div>

      <div className="landing-page-preview-header">
        <span className="landing-page-preview-header-title">
          <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Canal officiel
        </span>
        <span className="landing-page-preview-header-select" aria-hidden>
          Sécurisé
        </span>
      </div>

      <div className="landing-page-preview-body">
        <div className="landing-page-preview-main">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon
            return (
              <div
                key={channel.label}
                className={`landing-page-preview-slot landing-page-preview-slot--${channel.tone}`}
              >
                <span
                  className={`landing-page-preview-slot-icon landing-page-preview-slot-icon--${channel.tone}`}
                  aria-hidden
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="landing-page-preview-slot-copy">
                  <strong>{channel.value}</strong>
                  <small>
                    {channel.label} · {channel.meta}
                  </small>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <a href={CSIRT_BRAND.mailto} className="landing-page-preview-footer">
        Écrire à {CSIRT_BRAND.email}
      </a>
    </aside>
  )
}
