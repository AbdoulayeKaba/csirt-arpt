'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  FileSearch,
  Map,
  Scale,
  ShieldAlert,
} from 'lucide-react'
import { DEFAULT_SITEMAP_CONTENT } from '@/lib/site/sitemap-defaults'
import type { SiteSitemapContent, SiteSitemapSection } from '@/lib/site/types'
import { cn } from '@/lib/utils'
import '@/components/csirt/csirt-sitemap.css'

const SECTION_ICONS = {
  institution: Building2,
  reponse: ShieldAlert,
  cadre: Scale,
  publications: BookOpen,
  legal: FileSearch,
} as const

function Field({
  value,
  onChange,
  multiline,
  className,
  placeholder,
  disabled,
  as = 'span',
  id,
}: {
  value: string
  onChange?: (value: string) => void
  multiline?: boolean
  className?: string
  placeholder?: string
  disabled?: boolean
  as?: 'span' | 'p' | 'strong' | 'h1' | 'h2'
  id?: string
}) {
  if (!onChange) {
    if (as === 'h1') return <h1 id={id} className={className}>{value}</h1>
    if (as === 'h2') return <h2 id={id} className={className}>{value}</h2>
    if (as === 'strong') return <strong className={className}>{value}</strong>
    if (as === 'p' || multiline) return <p className={className}>{value}</p>
    return <span className={className}>{value}</span>
  }
  if (multiline || as === 'p') {
    return (
      <textarea
        id={id}
        className={className}
        value={value}
        disabled={disabled}
        rows={2}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }
  return (
    <input
      id={id}
      className={className}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function toneClass(tone: SiteSitemapSection['tone']) {
  return `is-${tone}`
}

function SectionBlock({
  section,
  sectionIndex,
  canEdit,
  disabled,
  onPatchSection,
  onPatchLink,
}: {
  section: SiteSitemapSection
  sectionIndex: number
  canEdit: boolean
  disabled?: boolean
  onPatchSection: (index: number, key: 'title' | 'lead', value: string) => void
  onPatchLink: (
    sectionIndex: number,
    linkIndex: number,
    key: 'href' | 'title' | 'description' | 'kicker',
    value: string
  ) => void
}) {
  const Icon = SECTION_ICONS[section.id as keyof typeof SECTION_ICONS] ?? Map
  return (
    <section
      id={section.id}
      className={`csirt-sitemap__section ${toneClass(section.tone)}`}
      aria-labelledby={`sitemap-${section.id}-title`}
    >
      <header className="csirt-sitemap__section-head">
        <span className="csirt-sitemap__section-icon" aria-hidden>
          <Icon />
        </span>
        <div>
          <Field
            id={`sitemap-${section.id}-title`}
            className="csirt-sitemap__edit-heading"
            as="h2"
            value={section.title}
            onChange={canEdit ? (value) => onPatchSection(sectionIndex, 'title', value) : undefined}
            disabled={disabled}
            placeholder="Titre de rubrique"
          />
          <Field
            className="csirt-sitemap__edit-body"
            as="p"
            multiline
            value={section.lead}
            onChange={canEdit ? (value) => onPatchSection(sectionIndex, 'lead', value) : undefined}
            disabled={disabled}
            placeholder="Description de rubrique"
          />
        </div>
      </header>

      <ul className="csirt-sitemap__grid">
        {section.links.map((item, linkIndex) => (
          <li key={`${section.id}-${item.href}-${linkIndex}`}>
            {canEdit ? (
              <div className="csirt-sitemap__card is-editable">
                <div className="csirt-sitemap__card-top">
                  <Field
                    className="csirt-sitemap__edit-kicker"
                    value={item.kicker}
                    onChange={(value) => onPatchLink(sectionIndex, linkIndex, 'kicker', value)}
                    disabled={disabled}
                    placeholder="Badge"
                  />
                  <ArrowUpRight className="csirt-sitemap__card-arrow" aria-hidden />
                </div>
                <Field
                  className="csirt-sitemap__edit-card-title"
                  as="strong"
                  value={item.title}
                  onChange={(value) => onPatchLink(sectionIndex, linkIndex, 'title', value)}
                  disabled={disabled}
                  placeholder="Titre de la page"
                />
                <Field
                  className="csirt-sitemap__edit-card-desc"
                  multiline
                  value={item.description}
                  onChange={(value) => onPatchLink(sectionIndex, linkIndex, 'description', value)}
                  disabled={disabled}
                  placeholder="Description"
                />
                <Field
                  className="csirt-sitemap__edit-card-href"
                  value={item.href}
                  onChange={(value) => onPatchLink(sectionIndex, linkIndex, 'href', value)}
                  disabled={disabled}
                  placeholder="URL (/chemin)"
                />
              </div>
            ) : (
              <Link href={item.href} className="csirt-sitemap__card">
                <div className="csirt-sitemap__card-top">
                  {item.kicker ? <span className="csirt-sitemap__kicker">{item.kicker}</span> : null}
                  <ArrowUpRight className="csirt-sitemap__card-arrow" aria-hidden />
                </div>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export type CsirtSitemapProps = {
  title?: string | null
  lead?: string | null
  content?: SiteSitemapContent | null
  editable?: boolean
  disabled?: boolean
  titleSlot?: ReactNode
  leadSlot?: ReactNode
  onContentChange?: (next: SiteSitemapContent) => void
}

export function CsirtSitemap({
  title,
  lead,
  content,
  editable = false,
  disabled = false,
  titleSlot,
  leadSlot,
  onContentChange,
}: CsirtSitemapProps = {}) {
  const data = content ?? DEFAULT_SITEMAP_CONTENT
  const canEdit = editable && Boolean(onContentChange) && !disabled
  const pageTitle = title?.trim() || 'Plan du site'
  const pageLead =
    lead?.trim() ||
    'Parcourez l’ensemble des pages publiques du CSIRT-ARPT : institution, signalement, cadre réglementaire, publications et informations légales.'

  const totalPages = data.sections.reduce((sum, section) => sum + section.links.length, 0)
  const resolvedStats = data.stats.map((stat, index) => {
    if (index === 0) {
      return { value: stat.value.trim() || String(data.sections.length), label: stat.label }
    }
    if (index === 1) {
      return { value: stat.value.trim() || String(totalPages), label: stat.label }
    }
    return stat
  })

  const patch = (partial: Partial<SiteSitemapContent>) => {
    onContentChange?.({ ...data, ...partial })
  }

  const patchStat = (index: number, key: 'value' | 'label', value: string) => {
    patch({
      stats: data.stats.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    })
  }

  const patchSection = (index: number, key: 'title' | 'lead', value: string) => {
    patch({
      sections: data.sections.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    })
  }

  const patchLink = (
    sectionIndex: number,
    linkIndex: number,
    key: 'href' | 'title' | 'description' | 'kicker',
    value: string
  ) => {
    patch({
      sections: data.sections.map((section, i) => {
        if (i !== sectionIndex) return section
        return {
          ...section,
          links: section.links.map((link, j) =>
            j === linkIndex ? { ...link, [key]: value } : link
          ),
        }
      }),
    })
  }

  return (
    <div
      className={cn(
        'csirt-sitemap',
        editable && 'csirt-sitemap--editable',
        editable && 'csirt-sitemap--preview'
      )}
    >
      <header className="csirt-sitemap__hero">
        <p className="csirt-sitemap__eyebrow">
          <Map className="h-3.5 w-3.5" aria-hidden />
          <Field
            className="csirt-sitemap__edit-eyebrow"
            value={data.eyebrow}
            onChange={canEdit ? (value) => patch({ eyebrow: value }) : undefined}
            disabled={disabled}
            placeholder="Sur-titre"
          />
        </p>
        {titleSlot ?? (
          <Field
            className="csirt-sitemap__edit-title"
            as="h1"
            value={pageTitle}
            disabled={disabled}
          />
        )}
        {leadSlot ?? (
          <Field
            className="csirt-sitemap__edit-lead"
            as="p"
            multiline
            value={pageLead}
            disabled={disabled}
          />
        )}
        <div className="csirt-sitemap__stats" aria-label="Synthèse du plan">
          {resolvedStats.map((stat, index) => (
            <article key={`sitemap-stat-${index}`}>
              <Field
                className="csirt-sitemap__edit-stat-value"
                as="strong"
                value={stat.value}
                onChange={
                  canEdit && index === 2
                    ? (value) => patchStat(index, 'value', value)
                    : canEdit
                      ? (value) => patchStat(index, 'value', value)
                      : undefined
                }
                disabled={disabled}
                placeholder={index < 2 ? 'Auto si vide' : 'Valeur'}
              />
              <Field
                className="csirt-sitemap__edit-stat-label"
                value={stat.label}
                onChange={canEdit ? (value) => patchStat(index, 'label', value) : undefined}
                disabled={disabled}
                placeholder="Libellé"
              />
            </article>
          ))}
        </div>
      </header>

      <div className="csirt-sitemap__layout">
        <nav className="csirt-sitemap__toc" aria-label="Sommaire du plan du site">
          <p className="csirt-sitemap__toc-title">Sommaire</p>
          <ol>
            {data.sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="csirt-sitemap__main">
          {data.sections.map((section, sectionIndex) => (
            <SectionBlock
              key={section.id}
              section={section}
              sectionIndex={sectionIndex}
              canEdit={canEdit}
              disabled={disabled}
              onPatchSection={patchSection}
              onPatchLink={patchLink}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
