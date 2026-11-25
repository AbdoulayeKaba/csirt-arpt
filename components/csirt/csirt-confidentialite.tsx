'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Database,
  EyeOff,
  FileLock2,
  Lock,
  Mail,
  Phone,
  Scale,
  Share2,
  ShieldCheck,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react'
import { CsirtInlineField } from '@/components/csirt/csirt-inline-field'
import { DEFAULT_PRIVACY_CONTENT } from '@/lib/site/legal-defaults'
import type { SitePrivacyContent } from '@/lib/site/types'
import { cn } from '@/lib/utils'
import '@/components/csirt/csirt-confidentialite.css'
import '@/components/csirt/csirt-legal-edit.css'

const ICONS: Record<string, LucideIcon> = {
  lock: Lock,
  database: Database,
  share: Share2,
  user: UserRoundCheck,
  'shield-check': ShieldCheck,
  'eye-off': EyeOff,
  scale: Scale,
}

const BADGE_ICONS = [ShieldCheck, EyeOff, Scale] as const

export type CsirtConfidentialitePageProps = {
  title?: string | null
  lead?: string | null
  content?: SitePrivacyContent | null
  editable?: boolean
  disabled?: boolean
  titleSlot?: ReactNode
  leadSlot?: ReactNode
  onContentChange?: (next: SitePrivacyContent) => void
}

export function CsirtConfidentialitePage({
  title,
  lead,
  content,
  editable = false,
  disabled = false,
  titleSlot,
  leadSlot,
  onContentChange,
}: CsirtConfidentialitePageProps = {}) {
  const data = content ?? DEFAULT_PRIVACY_CONTENT
  const canEdit = editable && Boolean(onContentChange) && !disabled
  const pageTitle = title?.trim() || 'Politique de confidentialité'
  const pageLead =
    lead?.trim() ||
    'Le CSIRT-ARPT traite les informations transmises via ce portail avec le niveau de confidentialité attendu d’une autorité nationale de cybersécurité.'

  const patch = (partial: Partial<SitePrivacyContent>) => {
    onContentChange?.({ ...data, ...partial })
  }

  return (
    <div className={cn('csirt-privacy', editable && 'csirt-privacy--editable')}>
      <header className="csirt-privacy__hero">
        <p className="csirt-privacy__eyebrow">
          <FileLock2 className="h-3.5 w-3.5" aria-hidden />
          <CsirtInlineField
            className="csirt-legal-edit__inline"
            value={data.eyebrow}
            onChange={canEdit ? (value) => patch({ eyebrow: value }) : undefined}
            disabled={disabled}
            placeholder="Sur-titre"
          />
        </p>
        {titleSlot ?? <h1>{pageTitle}</h1>}
        {leadSlot ?? <p className="csirt-privacy__lead">{pageLead}</p>}
        <div className="csirt-privacy__badges" aria-label="Garanties">
          {data.badges.map((badge, index) => {
            const Icon = BADGE_ICONS[index] ?? ShieldCheck
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

      <section className="csirt-privacy__principles" aria-labelledby="privacy-principles-title">
        <header className="csirt-privacy__section-head">
          <CsirtInlineField
            id="privacy-principles-title"
            className="csirt-legal-edit__heading"
            as="h2"
            value={data.principlesTitle}
            onChange={canEdit ? (value) => patch({ principlesTitle: value }) : undefined}
            disabled={disabled}
          />
          <CsirtInlineField
            className="csirt-legal-edit__body"
            as="p"
            multiline
            value={data.principlesLead}
            onChange={canEdit ? (value) => patch({ principlesLead: value }) : undefined}
            disabled={disabled}
          />
        </header>
        <ul className="csirt-privacy__principle-grid">
          {data.principles.map((item, index) => {
            const Icon = ICONS[item.icon] ?? Lock
            return (
              <li key={`principle-${index}`}>
                <article className="csirt-privacy__principle">
                  <span className="csirt-privacy__principle-icon" aria-hidden>
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
                              principles: data.principles.map((row, i) =>
                                i === index ? { ...row, title: value } : row
                              ),
                            })
                        : undefined
                    }
                    disabled={disabled}
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
                              principles: data.principles.map((row, i) =>
                                i === index ? { ...row, body: value } : row
                              ),
                            })
                        : undefined
                    }
                    disabled={disabled}
                  />
                </article>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="csirt-privacy__sections" aria-labelledby="privacy-sections-title">
        <header className="csirt-privacy__section-head">
          <CsirtInlineField
            id="privacy-sections-title"
            className="csirt-legal-edit__heading"
            as="h2"
            value={data.sectionsTitle}
            onChange={canEdit ? (value) => patch({ sectionsTitle: value }) : undefined}
            disabled={disabled}
          />
          <CsirtInlineField
            className="csirt-legal-edit__body"
            as="p"
            multiline
            value={data.sectionsLead}
            onChange={canEdit ? (value) => patch({ sectionsLead: value }) : undefined}
            disabled={disabled}
          />
        </header>
        <ol className="csirt-privacy__section-list">
          {data.sections.map((item, index) => (
            <li key={`section-${index}`}>
              <span className="csirt-privacy__section-index" aria-hidden>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <CsirtInlineField
                  className="csirt-legal-edit__card-title"
                  as="strong"
                  value={item.title}
                  onChange={
                    canEdit
                      ? (value) =>
                          patch({
                            sections: data.sections.map((row, i) =>
                              i === index ? { ...row, title: value } : row
                            ),
                          })
                      : undefined
                  }
                  disabled={disabled}
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
                            sections: data.sections.map((row, i) =>
                              i === index ? { ...row, body: value } : row
                            ),
                          })
                      : undefined
                  }
                  disabled={disabled}
                />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="csirt-privacy__assist" aria-labelledby="privacy-assist-title">
        <div className="csirt-privacy__assist-copy">
          <p className="csirt-privacy__assist-kicker">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            <CsirtInlineField
              className="csirt-legal-edit__inline is-on-dark"
              value={data.assistKicker}
              onChange={canEdit ? (value) => patch({ assistKicker: value }) : undefined}
              disabled={disabled}
            />
          </p>
          <CsirtInlineField
            id="privacy-assist-title"
            className="csirt-legal-edit__heading is-on-dark"
            as="h2"
            value={data.assistTitle}
            onChange={canEdit ? (value) => patch({ assistTitle: value }) : undefined}
            disabled={disabled}
          />
          <CsirtInlineField
            className="csirt-legal-edit__body is-on-dark"
            as="p"
            multiline
            rows={3}
            value={data.assistBody}
            onChange={canEdit ? (value) => patch({ assistBody: value }) : undefined}
            disabled={disabled}
          />
        </div>
        <div className="csirt-privacy__assist-actions">
          {canEdit ? (
            <>
              <span className="csirt-privacy__btn is-primary is-editable">
                <Mail aria-hidden />
                <CsirtInlineField
                  className="csirt-legal-edit__btn"
                  value={data.primaryCta.label}
                  onChange={(value) => patch({ primaryCta: { ...data.primaryCta, label: value } })}
                  disabled={disabled}
                  placeholder="Libellé"
                />
              </span>
              <CsirtInlineField
                className="csirt-legal-edit__href is-on-dark"
                value={data.primaryCta.href}
                onChange={(value) => patch({ primaryCta: { ...data.primaryCta, href: value } })}
                disabled={disabled}
                placeholder="URL / mailto"
              />
              <span className="csirt-privacy__btn is-secondary is-editable">
                <Phone aria-hidden />
                <CsirtInlineField
                  className="csirt-legal-edit__btn"
                  value={data.secondaryCta.label}
                  onChange={(value) =>
                    patch({ secondaryCta: { ...data.secondaryCta, label: value } })
                  }
                  disabled={disabled}
                  placeholder="Libellé"
                />
              </span>
              <CsirtInlineField
                className="csirt-legal-edit__href is-on-dark"
                value={data.secondaryCta.href}
                onChange={(value) =>
                  patch({ secondaryCta: { ...data.secondaryCta, href: value } })
                }
                disabled={disabled}
                placeholder="URL"
              />
            </>
          ) : (
            <>
              <a className="csirt-privacy__btn is-primary" href={data.primaryCta.href}>
                <Mail aria-hidden />
                {data.primaryCta.label}
              </a>
              <Link className="csirt-privacy__btn is-secondary" href={data.secondaryCta.href}>
                <Phone aria-hidden />
                {data.secondaryCta.label}
              </Link>
            </>
          )}
        </div>
      </section>

      <CsirtInlineField
        className="csirt-privacy__note csirt-legal-edit__note"
        as="p"
        multiline
        value={data.note}
        onChange={canEdit ? (value) => patch({ note: value }) : undefined}
        disabled={disabled}
      />
    </div>
  )
}
