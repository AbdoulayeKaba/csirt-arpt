'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  Copy,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react'
import { CSIRT_BRAND } from '@/lib/csirt/brand'
import { resolveContactMap } from '@/lib/csirt/contact-map'
import { CsirtContactForm } from '@/components/csirt/csirt-contact-form'
import '@/components/csirt/csirt-contacts.css'

export type CsirtContactsData = {
  email: string
  phone: string
  address: string
  mapUrl?: string
  hours: string
  website: string
  organizationName: string
}

type Props = {
  contact: CsirtContactsData
}

export function CsirtContactsPage({ contact }: Props) {
  const brandName = contact.organizationName || CSIRT_BRAND.name
  const address = contact.address || CSIRT_BRAND.address
  const email = contact.email || CSIRT_BRAND.email
  const phone = contact.phone || ''
  const map = resolveContactMap(contact.mapUrl ?? '', address)

  return (
    <div className="csirt-contacts">
      <header className="csirt-contacts__hero">
        <div className="csirt-contacts__hero-grid">
        <div className="csirt-contacts__hero-inner">
          <nav className="csirt-contacts__crumb" aria-label="Fil d’Ariane">
            <Link href="/">Accueil</Link>
            <span aria-hidden>/</span>
            <strong>Contacts</strong>
          </nav>
          <h1>
            Contacts du <span>{brandName}</span>
          </h1>
        </div>

        <Link href="/signalement" className="csirt-contacts__incident">
          <span>
            <strong>Pour un incident de cybersécurité</strong>
            <small>Utilisez le formulaire dédié pour une prise en charge rapide.</small>
          </span>
          <ArrowRight aria-hidden />
        </Link>
        </div>
      </header>

      <div className="csirt-contacts__panel">
        <CsirtContactForm brandName={brandName} />

        <aside className="csirt-contacts__side" aria-label="Autres moyens de contact">
          <section>
            <header>
              <span className="is-green" aria-hidden>
                <Phone />
              </span>
              <div>
                <h2>Autres moyens de contact</h2>
                <p>Choisissez le canal adapté à votre besoin.</p>
              </div>
            </header>
            <ul>
              <ContactRow
                tone="green"
                icon={Mail}
                label="Adresse e-mail"
                value={email}
                href={`mailto:${email}`}
              />
              {phone ? (
                <ContactRow
                  tone="red"
                  icon={Phone}
                  label="Téléphone"
                  value={phone}
                  href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                  hint="Assistance et orientation"
                />
              ) : null}
            </ul>
          </section>

          <section className="csirt-contacts__place">
            <header>
              <span className="is-green" aria-hidden>
                <MapPin />
              </span>
              <div>
                <h2>Localisation</h2>
                <p>Siège de l’ARPT — {address}</p>
              </div>
            </header>
            <div className="csirt-contacts__map">
              <iframe
                title={`Localisation ARPT — ${address}`}
                src={map.embedSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a href={map.openHref} target="_blank" rel="noreferrer">
                Ouvrir dans Google Maps
                <ArrowRight aria-hidden />
              </a>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function ContactRow({
  tone,
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  tone: 'green' | 'red' | 'violet'
  icon: typeof Mail
  label: string
  value: string
  hint?: string
  href?: string
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <li className={`is-${tone}`}>
      <span aria-hidden>
        <Icon />
      </span>
      <div>
        <small>{label}</small>
        {href ? <a href={href}>{value}</a> : <strong>{value}</strong>}
        {hint ? <p>{hint}</p> : null}
      </div>
      <button type="button" onClick={() => void copy()} aria-label={copied ? 'Copié' : `Copier ${label}`}>
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? 'Copié' : 'Copier'}
      </button>
    </li>
  )
}
