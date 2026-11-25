import {
  LockKeyhole,
  Mail,
  ShieldCheck,
  Siren,
} from 'lucide-react'

const HIGHLIGHTS = [
  {
    icon: Mail,
    title: 'Contact officiel',
    desc: 'csirt@arpt.gov.gn',
  },
  {
    icon: Siren,
    title: 'Incidents',
    desc: 'Réception et qualification.',
  },
  {
    icon: LockKeyhole,
    title: 'HTTPS / TLS',
    desc: 'Transport chiffré.',
  },
  {
    icon: ShieldCheck,
    title: 'Gouvernance',
    desc: 'Pilotage CSIRT-ARPT.',
  },
] as const

/** Bloc décoratif login — missions CSIRT, sans données métier. */
export function AuthAgendaMock() {
  return (
    <div className="auth-login-hero-preview" aria-hidden>
      <div className="auth-login-highlights">
        <div className="auth-login-highlights-head">
          <span>Missions CSIRT</span>
          <span className="auth-login-highlights-secure">Sécurisé</span>
        </div>
        <ul className="auth-login-highlights-grid">
          {HIGHLIGHTS.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.title} className="auth-login-highlight">
                <span className="auth-login-highlight-icon">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="auth-login-highlight-title">{item.title}</p>
                  <p className="auth-login-highlight-desc">{item.desc}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
