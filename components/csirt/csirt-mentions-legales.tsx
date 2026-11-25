'use client'

import type { ReactNode } from 'react'
import {
  Building2,
  Globe2,
  Mail,
  MapPin,
  Scale,
  Server,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { CsirtInlineField } from '@/components/csirt/csirt-inline-field'
import { DEFAULT_MENTIONS_CONTENT } from '@/lib/site/legal-defaults'
import type { SiteMentionsContent } from '@/lib/site/types'
import { cn } from '@/lib/utils'
import '@/components/csirt/csirt-mentions-legales.css'
import '@/components/csirt/csirt-legal-edit.css'

const ICONS: Record<string, LucideIcon> = {
  building: Building2,
  scale: Scale,
  server: Server,
  globe: Globe2,
  'shield-check': ShieldCheck,
  mail: Mail,
  'map-pin': MapPin,
}

const CONTACT_ICONS = [Mail, Globe2, MapPin] as const

export type CsirtMentionsLegalesPageProps = {
  title?: string | null
  lead?: string | null
  content?: SiteMentionsContent | null
  editable?: boolean
  disabled?: boolean
  titleSlot?: ReactNode
  leadSlot?: ReactNode
  onContentChange?: (next: SiteMentionsContent) => void
}

export function CsirtMentionsLegalesPage({
  title,
  lead,
  content,
  editable = false,
  disabled = false,
  titleSlot,
  leadSlot,
  onContentChange,
}: CsirtMentionsLegalesPageProps = {}) {
  const data = content ?? DEFAULT_MENTIONS_CONTENT
  const canEdit = editable && Boolean(onContentChange) && !disabled
  const pageTitle = title?.trim() || 'Mentions légales'
  const pageLead =
    lead?.trim() ||
    'Éditeur, responsabilités et modalités d’usage du portail public CSIRT-ARPT (service de l’ARPT — République de Guinée).'

  const patch = (partial: Partial<SiteMentionsContent>) => {
    onContentChange?.({ ...data, ...partial })
  }

  return (
    <div className={cn('csirt-legal', editable && 'csirt-legal--editable')}>
      <header className="csirt-legal__hero">
        <p className="csirt-legal__eyebrow">
          <Scale className="h-3.5 w-3.5" aria-hidden />
          <CsirtInlineField
            className="csirt-legal-edit__inline"
            value={data.eyebrow}
            onChange={canEdit ? (value) => patch({ eyebrow: value }) : undefined}
            disabled={disabled}
            placeholder="Sur-titre"
          />
        </p>
        {titleSlot ?? <h1>{pageTitle}</h1>}
        {leadSlot ?? <p className="csirt-legal__lead">{pageLead}</p>}
        <div className="csirt-legal__badges" aria-label="Identification">
          {data.badges.map((badge, index) => {
            const Icon = index === 0 ? ShieldCheck : Building2
            return (
              <span key={`badge-${index}`}>
                <Icon aria-hidden />
                <CsirtInlineField
                  className="csirt-legal-edit__inline"
                  value={badge}
                  onChange={
                    canEdit
                      ? (value) =>
                          patch({
                            badges: data.badges.map((item, i) => (i === index ? value : item)),
                          })
                      : undefined
                  }
                  disabled={disabled}
                  placeholder="Badge"
                />
              </span>
            )
          })}
        </div>
      </header>

      <section className="csirt-legal__blocks" aria-labelledby="legal-blocks-title">
        <header className="csirt-legal__section-head">
          <CsirtInlineField
            id="legal-blocks-title"
            className="csirt-legal-edit__heading"
            as="h2"
            value={data.blocksTitle}
            onChange={canEdit ? (value) => patch({ blocksTitle: value }) : undefined}
            disabled={disabled}
            placeholder="Titre de section"
          />
          <CsirtInlineField
            className="csirt-legal-edit__body"
            as="p"
            multiline
            value={data.blocksLead}
            onChange={canEdit ? (value) => patch({ blocksLead: value }) : undefined}
            disabled={disabled}
            placeholder="Chapô de section"
          />
        </header>
        <ul className="csirt-legal__grid">
          {data.blocks.map((item, index) => {
            const Icon = ICONS[item.icon] ?? Building2
            return (
              <li key={`block-${index}`}>
                <article className="csirt-legal__card">
                  <span className="csirt-legal__card-icon" aria-hidden>
                    <Icon />
                  </span>
                  <CsirtInlineField
                    className="csirt-legal-edit__card-title"
                    as="strong"
                    value={item.title}
                    onChange={
                      canEdit
                        ? (value) =>
                            patch({
                              blocks: data.blocks.map((row, i) =>
                                i === index ? { ...row, title: value } : row
                              ),
                            })
                        : undefined
                    }
                    disabled={disabled}
                    placeholder="Titre"
                  />
                  <CsirtInlineField
                    className="csirt-legal-edit__card-body"
                    as="p"
                    multiline
                    rows={3}
                    value={item.body}
                    onChange={
                      canEdit
                        ? (value) =>
                            patch({
                              blocks: data.blocks.map((row, i) =>
                                i === index ? { ...row, body: value } : row
                              ),
                            })
                        : undefined
                    }
                    disabled={disabled}
                    placeholder="Texte"
                  />
                </article>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="csirt-legal__contact" aria-labelledby="legal-contact-title">
        <header className="csirt-legal__section-head">
          <CsirtInlineField
            id="legal-contact-title"
            className="csirt-legal-edit__heading"
            as="h2"
            value={data.contactTitle}
            onChange={canEdit ? (value) => patch({ contactTitle: value }) : undefined}
            disabled={disabled}
            placeholder="Titre contacts"
          />
          <CsirtInlineField
            className="csirt-legal-edit__body"
            as="p"
            multiline
            value={data.contactLead}
            onChange={canEdit ? (value) => patch({ contactLead: value }) : undefined}
            disabled={disabled}
            placeholder="Chapô contacts"
          />
        </header>
        <div className="csirt-legal__contact-grid">
          {data.contacts.map((item, index) => {
            const Icon = CONTACT_ICONS[index] ?? Mail
            return (
              <article key={`contact-${index}`}>
                <Icon aria-hidden />
                <div>
                  <CsirtInlineField
                    className="csirt-legal-edit__card-title"
                    as="strong"
                    value={item.label}
                    onChange={
                      canEdit
                        ? (value) =>
                            patch({
                              contacts: data.contacts.map((row, i) =>
                                i === index ? { ...row, label: value } : row
                              ),
                            })
                        : undefined
                    }
                    disabled={disabled}
                    placeholder="Libellé"
                  />
                  {canEdit ? (
                    <>
                      <CsirtInlineField
                        className="csirt-legal-edit__card-body"
                        value={item.value}
                        onChange={(value) =>
                          patch({
                            contacts: data.contacts.map((row, i) =>
                              i === index ? { ...row, value } : row
                            ),
                          })
                        }
                        disabled={disabled}
                        placeholder="Valeur affichée"
                      />
                      <CsirtInlineField
                        className="csirt-legal-edit__href"
                        value={item.href}
                        onChange={(value) =>
                          patch({
                            contacts: data.contacts.map((row, i) =>
                              i === index ? { ...row, href: value } : row
                            ),
                          })
                        }
                        disabled={disabled}
                        placeholder="Lien (mailto: ou URL)"
                      />
                    </>
                  ) : item.href ? (
                    <a href={item.href}>{item.value}</a>
                  ) : (
                    <span>{item.value}</span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
