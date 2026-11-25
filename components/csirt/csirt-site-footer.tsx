'use client'

import Link from 'next/link'
import {
  Clock3,
  Facebook,
  Linkedin,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react'
import { ArptLogo } from '@/components/csirt/arpt-logo'
import { CsirtFooterNewsletterCta } from '@/components/csirt/csirt-footer-newsletter-cta'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import { CSIRT_BRAND } from '@/lib/csirt/brand'
import type { PlatformPublicContact } from '@/lib/dg/platform-branding'
import { CSIRT_SOCIAL, type CsirtSocialPlatform } from '@/lib/csirt/home-content'
import type { SiteFooter } from '@/lib/site/types'
import { isArchivedFlag } from '@/lib/site/news-sources'

const INSTITUTION = [
  { href: '/csirt-arpt', label: 'Découvrir le CSIRT-ARPT' },
  { href: '/csirt-arpt#missions', label: 'Nos Missions' },
  { href: '/csirt-arpt#gouvernance', label: 'Équipe dirigeante' },
  { href: '/historique', label: 'Historique' },
] as const

const CYBER = [
  { href: '/signalement', label: 'Déclarations d’incidents' },
  { href: '/publications', label: 'Alertes en cours' },
  { href: '/bonnes-pratiques', label: 'Bonnes pratiques' },
  { href: '/experts-auditeurs', label: 'Experts auditeurs certifiés' },
  { href: '/espace-confiance', label: 'Espace de confiance' },
  { href: '/panorama-menaces', label: 'Panorama des menaces' },
] as const

const RESOURCES = [
  { href: '/publications', label: 'Publications' },
  { href: '/rapports', label: 'Rapports' },
  { href: '/mediatheque', label: 'Vidéos pédagogiques' },
  { href: '/guides', label: 'Guides pratiques' },
] as const

const LEGAL = [
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/confidentialite', label: 'Politique de confidentialité' },
  { href: '/accessibilite', label: 'Accessibilité' },
  { href: '/plan-du-site', label: 'Plan complet du site' },
] as const

const DEFAULT_COLUMNS = [
  { id: 'institution', title: 'Institution', links: INSTITUTION },
  { id: 'cyber', title: 'Cybersécurité', links: CYBER },
  { id: 'resources', title: 'Ressources', links: RESOURCES },
] as const

function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="csirt-footer-svg" aria-hidden>
      <path
        fill="currentColor"
        d="M14.7 10.3 21.2 3h-1.6l-5.6 6.4L9.6 3H4.8l7 10.1L4.8 21h1.6l6.1-7 4.8 7h4.8l-7.4-10.7ZM12.7 13.2l-.7-1-5.7-8h2.5l4.6 6.5.7 1 6 8.4h-2.5l-4.9-6.9Z"
      />
    </svg>
  )
}

function TiktokMark() {
  return (
    <svg viewBox="0 0 24 24" className="csirt-footer-svg" aria-hidden>
      <path
        fill="currentColor"
        d="M14.2 3h2.6c.3 2.2 1.6 3.9 3.7 4.3v2.6c-1.3 0-2.5-.4-3.6-1.1v6.3c0 3.6-2.8 6.4-6.5 6.4S4 18.7 4 15.1c0-3.5 2.8-6.3 6.4-6.4v2.7c-2 .1-3.6 1.8-3.6 3.7 0 2 1.7 3.7 3.7 3.7s3.7-1.6 3.7-3.7V3Z"
      />
    </svg>
  )
}

function WhatsappMark() {
  return (
    <svg viewBox="0 0 24 24" className="csirt-footer-svg" aria-hidden>
      <path
        fill="currentColor"
        d="M12.1 3.2c-4.8 0-8.7 3.9-8.7 8.7 0 1.5.4 3 1.1 4.3L3 21l4.9-1.3c1.2.7 2.6 1 4.1 1 4.8 0 8.7-3.9 8.7-8.7s-3.8-8.8-8.6-8.8Zm0 15.9c-1.4 0-2.7-.4-3.8-1.1l-.3-.2-2.9.8.8-2.8-.2-.3c-.7-1.2-1.1-2.5-1.1-3.9 0-4 3.3-7.2 7.4-7.2 4 0 7.3 3.2 7.3 7.2 0 4-3.3 7.5-7.2 7.5Zm4-5.4c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1l-.7.9c-.1.1-.3.2-.5.1-1-.4-1.9-1.1-2.5-2-.2-.3 0-.4.1-.6l.4-.5c.1-.1.1-.3.2-.4 0-.1 0-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.2.3 1.6 2.5 3.9 3.4 1.5.6 1.8.5 2.2.5.3 0 1.1-.5 1.3-.9.2-.4.2-.8.1-.9 0-.1-.2-.1-.4-.2Z"
      />
    </svg>
  )
}

function isDialablePhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 6
}

export function CsirtSiteFooter({
  institutionLogoUrl,
  certLogoUrl,
  contact,
  footer,
  social = CSIRT_SOCIAL,
  showNewsletterCta = true,
}: {
  institutionLogoUrl?: string
  certLogoUrl?: string
  contact?: PlatformPublicContact
  footer?: SiteFooter
  social?: readonly CsirtSocialPlatform[]
  showNewsletterCta?: boolean
}) {
  const { t } = useCsirtLocale()
  const email = contact?.email?.trim() || CSIRT_BRAND.email
  const phone = contact?.phone?.trim() || t('footerSwitchboard')
  const address = contact?.address?.trim() || t('brandAddress')
  const hours = contact?.hours?.trim() || t('brandHours')
  const mailto = email.includes('@') ? `mailto:${email}` : CSIRT_BRAND.mailto
  const facebook = social.find((item) => item.id === 'facebook')
  const linkedin = social.find((item) => item.id === 'linkedin')
  const tiktok = social.find((item) => item.id === 'tiktok')
  const columns = (footer?.columns?.length ? footer.columns : DEFAULT_COLUMNS).map((column) => ({
    ...column,
    links: column.links.filter((item) => !isArchivedFlag(item)),
  }))
  const legal = (footer?.legal?.length ? footer.legal : LEGAL).filter(
    (item) => !isArchivedFlag(item)
  )
  const twitterHref = footer?.twitterHref || 'https://x.com/search?q=ARPT%20Guinee'

  return (
    <footer className="csirt-footer">
      <div className="csirt-footer-inner">
        {showNewsletterCta ? (
          <CsirtFooterNewsletterCta
            title={footer?.ctaTitle || t('footerNewsletterTitle')}
            lead={footer?.ctaLead || t('footerNewsletterLead')}
            label={footer?.ctaLabel || t('footerNewsletterCta')}
          />
        ) : null}

        <div className="csirt-footer-grid">
          <div className="csirt-footer-brand">
            <ArptLogo
              institutionLogoUrl={institutionLogoUrl}
              certLogoUrl={certLogoUrl}
              variant="onDark"
              showWordmark={false}
            />
            <p>
              {footer?.brandText || t('footerBrandFallback')}
            </p>
            <ul className="csirt-footer-contact">
              <li>
                <Mail className="h-4 w-4" aria-hidden />
                <a href={mailto}>{email}</a>
              </li>
              <li>
                <Phone className="h-4 w-4" aria-hidden />
                {isDialablePhone(phone) ? (
                  <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>
                ) : (
                  <Link href="/contacts">{phone}</Link>
                )}
              </li>
              <li>
                <MapPin className="h-4 w-4" aria-hidden />
                <span>{address}</span>
              </li>
              <li>
                <Clock3 className="h-4 w-4" aria-hidden />
                <span>{hours}</span>
              </li>
            </ul>
            <div className="csirt-footer-social">
              <a href={facebook?.href} target="_blank" rel="noreferrer" aria-label="Facebook">
                <Facebook className="h-4 w-4" />
              </a>
              <a href={twitterHref} target="_blank" rel="noreferrer" aria-label="X">
                <XMark />
              </a>
              <a href={linkedin?.href} target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href={tiktok?.href} target="_blank" rel="noreferrer" aria-label="TikTok">
                <TiktokMark />
              </a>
              <a href={mailto} aria-label="WhatsApp / messagerie">
                <WhatsappMark />
              </a>
            </div>
          </div>

          {columns.map((column) => (
            <nav key={column.id} aria-label={column.title}>
              <h2>{column.title}</h2>
              <ul>
                {column.links.map((item) => (
                  <li key={`${column.id}-${item.href}-${item.label}`}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="csirt-footer-legal">
        <p>© {new Date().getFullYear()} {CSIRT_BRAND.name} — {CSIRT_BRAND.parent}</p>
        <ul>
          {legal.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
