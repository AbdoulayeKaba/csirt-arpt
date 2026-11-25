'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Accessibility,
  CheckCircle2,
  Contrast,
  Ear,
  Eye,
  Keyboard,
  Mail,
  MonitorSmartphone,
  Phone,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { CsirtInlineField } from '@/components/csirt/csirt-inline-field'
import { DEFAULT_A11Y_CONTENT } from '@/lib/site/legal-defaults'
import type { SiteA11yContent } from '@/lib/site/types'
import { cn } from '@/lib/utils'
import '@/components/csirt/csirt-accessibilite.css'
import '@/components/csirt/csirt-legal-edit.css'

const ICONS: Record<string, LucideIcon> = {
  eye: Eye,
  keyboard: Keyboard,
  monitor: MonitorSmartphone,
  ear: Ear,
  'shield-check': ShieldCheck,
  check: CheckCircle2,
}

const BADGE_ICONS = [ShieldCheck, CheckCircle2] as const

export type CsirtAccessibilitePageProps = {
  title?: string | null
  lead?: string | null
  content?: SiteA11yContent | null
  editable?: boolean
  disabled?: boolean
  titleSlot?: ReactNode
  leadSlot?: ReactNode
  onContentChange?: (next: SiteA11yContent) => void
}

export function CsirtAccessibilitePage({
  title,
  lead,
  content,
  editable = false,
  disabled = false,
  titleSlot,
  leadSlot,
  onContentChange,
}: CsirtAccessibilitePageProps = {}) {
  const data = content ?? DEFAULT_A11Y_CONTENT
  const canEdit = editable && Boolean(onContentChange) && !disabled
  const pageTitle = title?.trim() || 'Accessibilité'
  const pageLead =
    lead?.trim() ||
    'Le CSIRT-ARPT s’engage à rendre son portail public utilisable par le plus grand nombre, y compris les personnes en situation de handicap.'

  const patch = (partial: Partial<SiteA11yContent>) => {
    onContentChange?.({ ...data, ...partial })
  }

  return (
    <div className={cn('csirt-a11y', editable && 'csirt-a11y--editable')}>
      <header className="csirt-a11y__hero">
        <p className="csirt-a11y__eyebrow">
          <Accessibility className="h-3.5 w-3.5" aria-hidden />
          <CsirtInlineField
            className="csirt-legal-edit__inline"
            value={data.eyebrow}
            onChange={canEdit ? (value) => patch({ eyebrow: value }) : undefined}
            disabled={disabled}
            placeholder="Sur-titre"
          />
        </p>
        {titleSlot ?? <h1>{pageTitle}</h1>}
        {leadSlot ?? <p className="csirt-a11y__lead">{pageLead}</p>}
        <div className="csirt-a11y__badges" aria-label="Statut">
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

      <section className="csirt-a11y__pillars" aria-labelledby="a11y-pillars-title">
        <header className="csirt-a11y__section-head">
          <CsirtInlineField
            id="a11y-pillars-title"
            className="csirt-legal-edit__heading"
            as="h2"
            value={data.pillarsTitle}
            onChange={canEdit ? (value) => patch({ pillarsTitle: value }) : undefined}
            disabled={disabled}
          />
          <CsirtInlineField
            className="csirt-legal-edit__body"
            as="p"
            multiline
            value={data.pillarsLead}
            onChange={canEdit ? (value) => patch({ pillarsLead: value }) : undefined}
            disabled={disabled}
          />
        </header>
        <ul className="csirt-a11y__pillar-grid">
          {data.pillars.map((item, index) => {
            const Icon = ICONS[item.icon] ?? Eye
            return (
              <li key={`pillar-${index}`}>
                <article className="csirt-a11y__pillar">
                  <span className="csirt-a11y__pillar-icon" aria-hidden>
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
                              pillars: data.pillars.map((row, i) =>
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
                              pillars: data.pillars.map((row, i) =>
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

      <section className="csirt-a11y__measures" aria-labelledby="a11y-measures-title">
        <header className="csirt-a11y__section-head">
          <CsirtInlineField
            id="a11y-measures-title"
            className="csirt-legal-edit__heading"
            as="h2"
            value={data.measuresTitle}
            onChange={canEdit ? (value) => patch({ measuresTitle: value }) : undefined}
            disabled={disabled}
          />
          <CsirtInlineField
            className="csirt-legal-edit__body"
            as="p"
            multiline
            value={data.measuresLead}
            onChange={canEdit ? (value) => patch({ measuresLead: value }) : undefined}
            disabled={disabled}
          />
        </header>
        <ol className="csirt-a11y__measure-list">
          {data.measures.map((item, index) => (
            <li key={`measure-${index}`}>
              <span className="csirt-a11y__measure-index" aria-hidden>
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
                            measures: data.measures.map((row, i) =>
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
                            measures: data.measures.map((row, i) =>
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

      <section className="csirt-a11y__assist" aria-labelledby="a11y-assist-title">
        <div className="csirt-a11y__assist-copy">
          <p className="csirt-a11y__assist-kicker">
            <Contrast className="h-3.5 w-3.5" aria-hidden />
            <CsirtInlineField
              className="csirt-legal-edit__inline is-on-dark"
              value={data.assistKicker}
              onChange={canEdit ? (value) => patch({ assistKicker: value }) : undefined}
              disabled={disabled}
            />
          </p>
          <CsirtInlineField
            id="a11y-assist-title"
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
        <div className="csirt-a11y__assist-actions">
          {canEdit ? (
            <>
              <span className="csirt-a11y__btn is-primary is-editable">
                <Mail aria-hidden />
                <CsirtInlineField
                  className="csirt-legal-edit__btn"
                  value={data.primaryCta.label}
                  onChange={(value) => patch({ primaryCta: { ...data.primaryCta, label: value } })}
                  disabled={disabled}
                />
              </span>
              <CsirtInlineField
                className="csirt-legal-edit__href is-on-dark"
                value={data.primaryCta.href}
                onChange={(value) => patch({ primaryCta: { ...data.primaryCta, href: value } })}
                disabled={disabled}
                placeholder="URL / mailto"
              />
              <span className="csirt-a11y__btn is-secondary is-editable">
                <Phone aria-hidden />
                <CsirtInlineField
                  className="csirt-legal-edit__btn"
                  value={data.secondaryCta.label}
                  onChange={(value) =>
                    patch({ secondaryCta: { ...data.secondaryCta, label: value } })
                  }
                  disabled={disabled}
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
              <a className="csirt-a11y__btn is-primary" href={data.primaryCta.href}>
                <Mail aria-hidden />
                {data.primaryCta.label}
              </a>
              <Link className="csirt-a11y__btn is-secondary" href={data.secondaryCta.href}>
                <Phone aria-hidden />
                {data.secondaryCta.label}
              </Link>
            </>
          )}
        </div>
      </section>

      <CsirtInlineField
        className="csirt-a11y__note csirt-legal-edit__note"
        as="p"
        multiline
        value={data.note}
        onChange={canEdit ? (value) => patch({ note: value }) : undefined}
        disabled={disabled}
      />
    </div>
  )
}
