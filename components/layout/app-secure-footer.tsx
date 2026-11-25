import { CSIRT_BRAND } from '@/lib/csirt/brand'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
  /** Marge adaptée au panneau de connexion vs pages applicatives. */
  variant?: 'login' | 'app'
}

export function AppSecureFooter({ className, variant = 'app' }: Props) {
  const year = new Date().getFullYear()

  return (
    <footer
      className={cn(
        'app-secure-footer',
        variant === 'login' && 'app-secure-footer--login',
        variant === 'app' && 'app-secure-footer--app',
        className
      )}
      aria-label="Informations légales"
    >
      <span>
        © {year} {CSIRT_BRAND.name}
      </span>
      <span className="app-secure-footer-secure">
        <span className="app-secure-footer-dot" aria-hidden />
        Connexion chiffrée HTTPS
      </span>
    </footer>
  )
}
