'use client'

import Link from 'next/link'
import { useRef, useState, type ReactNode } from 'react'
import {
  ArrowUpRight,
  Building2,
  Calendar,
  Eye,
  Globe2,
  Headphones,
  ImagePlus,
  Radio,
  Scale,
  Shield,
  ShieldCheck,
  Siren,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { CSIRT_BRAND } from '@/lib/csirt/brand'
import { toast } from '@/hooks/use-toast'
import { DEFAULT_DISCOVER_CONTENT } from '@/lib/site/discover-defaults'
import { SiteRichText } from '@/lib/site/rich-text'
import type {
  SiteDiscoverContent,
  SiteDiscoverGovIcon,
  SiteDiscoverMissionIcon,
} from '@/lib/site/types'
import { cn } from '@/lib/utils'
import '@/components/csirt/csirt-discover.css'

const MISSION_ICONS: Record<SiteDiscoverMissionIcon, LucideIcon> = {
  eye: Eye,
  siren: Siren,
  radio: Radio,
  headphones: Headphones,
}

const GOV_ICONS: Record<SiteDiscoverGovIcon, LucideIcon> = {
  scale: Scale,
  'shield-check': ShieldCheck,
  globe: Globe2,
  shield: Shield,
  building: Building2,
  headphones: Headphones,
}

const DEFAULT_HERO_IMAGE = '/csirt/discover-hero.jpg?v=3'
const DEFAULT_TITLE = 'Centre national de réponse aux incidents'
const DEFAULT_LEAD = `Service de l'${CSIRT_BRAND.parent} — présence officielle pour informer, coordonner et recevoir les signalements de cybersécurité.`

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
  as?: 'span' | 'p' | 'strong' | 'h2'
  id?: string
}) {
  if (!onChange) {
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
        rows={3}
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

async function uploadSiteImage(file: File): Promise<string | null> {
  const body = new FormData()
  body.set('file', file)
  const res = await fetch('/api/admin/site/media', { method: 'POST', body })
  const json = (await res.json().catch(() => ({}))) as { url?: string; message?: string }
  if (!res.ok || !json.url) {
    toast({
      variant: 'destructive',
      title: 'Import impossible',
      description: json.message || 'Formats acceptés : PNG, JPG, WebP, GIF, SVG.',
    })
    return null
  }
  return json.url
}

function MediaEditBar({
  src,
  onSrcChange,
  disabled,
  className,
}: {
  src: string
  onSrcChange: (src: string) => void
  disabled?: boolean
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const onFile = async (file: File | undefined) => {
    if (!file || disabled) return
    setUploading(true)
    try {
      const url = await uploadSiteImage(file)
      if (url) {
        onSrcChange(url)
        toast({ title: 'Image mise à jour' })
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={cn('csirt-discover__editable-media-bar', className)}>
      <label className="csirt-discover__editable-media-btn">
        <ImagePlus aria-hidden />
        <span>{uploading ? 'Import…' : 'Changer l’image'}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          hidden
          disabled={disabled || uploading}
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
      </label>
      <input
        className="csirt-discover__editable-media-url"
        value={src}
        disabled={disabled || uploading}
        placeholder="URL de l’image"
        onChange={(event) => onSrcChange(event.target.value)}
      />
    </div>
  )
}

function EditableMedia({
  src,
  alt = '',
  caption,
  onSrcChange,
  onCaptionChange,
  disabled,
  className,
  variant = 'split',
  children,
}: {
  src: string
  alt?: string
  caption?: string
  onSrcChange: (src: string) => void
  onCaptionChange?: (caption: string) => void
  disabled?: boolean
  className?: string
  variant?: 'split' | 'visual'
  children?: ReactNode
}) {
  return (
    <figure className={cn('csirt-discover__editable-media', `is-${variant}`, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} />
      <MediaEditBar src={src} onSrcChange={onSrcChange} disabled={disabled} />
      {onCaptionChange ? (
        <input
          className="csirt-discover__editable-media-caption"
          value={caption ?? ''}
          disabled={disabled}
          placeholder="Légende de l’image"
          onChange={(event) => onCaptionChange(event.target.value)}
        />
      ) : caption ? (
        <figcaption>{caption}</figcaption>
      ) : null}
      {children}
    </figure>
  )
}

export type CsirtDiscoverPageProps = {
  title?: string | null
  lead?: string | null
  heroImage?: string | null
  bodyHtml?: string | null
  content?: SiteDiscoverContent | null
  bodySlot?: ReactNode
  heroTitleSlot?: ReactNode
  heroLeadSlot?: ReactNode
  previewMode?: boolean
  editable?: boolean
  disabled?: boolean
  onContentChange?: (next: SiteDiscoverContent) => void
  onHeroImageChange?: (src: string) => void
}

export function CsirtDiscoverPage({
  title,
  lead,
  heroImage,
  bodyHtml,
  content,
  bodySlot,
  heroTitleSlot,
  heroLeadSlot,
  previewMode = false,
  editable = false,
  disabled = false,
  onContentChange,
  onHeroImageChange,
}: CsirtDiscoverPageProps = {}) {
  const data = content ?? DEFAULT_DISCOVER_CONTENT
  const heroSrc = heroImage?.trim() || DEFAULT_HERO_IMAGE
  const rawTitle = title?.trim() || ''
  const heroTitle =
    !rawTitle || rawTitle === 'Découvrir le CSIRT-ARPT' ? DEFAULT_TITLE : rawTitle
  const heroLead = lead?.trim() || DEFAULT_LEAD
  const hasEditorial = Boolean(bodySlot) || Boolean(bodyHtml?.trim())
  const canEdit = editable && Boolean(onContentChange) && !disabled

  const patch = (partial: Partial<SiteDiscoverContent>) => {
    onContentChange?.({ ...data, ...partial })
  }

  const patchStrip = (index: number, key: 'label' | 'value', value: string) => {
    patch({
      strip: data.strip.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    })
  }

  const patchStat = (index: number, key: 'value' | 'label' | 'desc', value: string) => {
    patch({
      stats: data.stats.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    })
  }

  const patchMission = (index: number, key: 'title' | 'body', value: string) => {
    patch({
      missions: data.missions.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    })
  }

  const patchTimeline = (index: number, key: 'year' | 'title' | 'body', value: string) => {
    patch({
      timeline: data.timeline.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    })
  }

  const patchGov = (index: number, key: 'title' | 'body', value: string) => {
    patch({
      govCards: data.govCards.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    })
  }

  return (
    <div
      className={cn(
        'csirt-discover',
        (previewMode || editable) && 'csirt-discover--preview',
        editable && 'csirt-discover--editable'
      )}
    >
      <header className="csirt-discover__hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="csirt-discover__hero-media"
          src={heroSrc}
          alt="Siège de l'ARPT — Autorité de Régulation des Postes et Télécommunications, Conakry"
        />
        <div className="csirt-discover__hero-shade" aria-hidden />
        {canEdit && onHeroImageChange ? (
          <MediaEditBar
            className="is-hero-bar"
            src={heroSrc}
            onSrcChange={onHeroImageChange}
            disabled={disabled}
          />
        ) : null}
        <div className="csirt-discover__hero-copy">
          <p className="csirt-discover__eyebrow">
            <Building2 aria-hidden />
            Institution · {CSIRT_BRAND.country}
          </p>
          <p className="csirt-discover__brand">{CSIRT_BRAND.name}</p>
          {heroTitleSlot ?? <h1>{heroTitle}</h1>}
          {heroLeadSlot ?? <p className="csirt-discover__lead">{heroLead}</p>}
          <div className="csirt-discover__hero-actions">
            {previewMode || editable ? (
              <>
                <span className="csirt-discover__btn is-primary is-editable">
                  <Field
                    className="csirt-discover__edit-inline is-on-btn"
                    value={data.heroPrimaryLabel}
                    onChange={canEdit ? (value) => patch({ heroPrimaryLabel: value }) : undefined}
                    disabled={disabled}
                    placeholder="Libellé bouton"
                  />
                  <ArrowUpRight aria-hidden />
                </span>
                <span className="csirt-discover__btn is-ghost is-editable">
                  <Field
                    className="csirt-discover__edit-inline is-on-btn"
                    value={data.heroSecondaryLabel}
                    onChange={canEdit ? (value) => patch({ heroSecondaryLabel: value }) : undefined}
                    disabled={disabled}
                    placeholder="Libellé bouton"
                  />
                </span>
              </>
            ) : (
              <>
                <Link href="/signalement" className="csirt-discover__btn is-primary">
                  {data.heroPrimaryLabel}
                  <ArrowUpRight aria-hidden />
                </Link>
                <a href="#missions" className="csirt-discover__btn is-ghost">
                  {data.heroSecondaryLabel}
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="csirt-discover__strip" aria-label="Repères">
        {data.strip.map((item, index) => (
          <article key={`strip-${index}`}>
            <Field
              className="csirt-discover__edit-label"
              as="strong"
              value={item.label}
              onChange={canEdit ? (value) => patchStrip(index, 'label', value) : undefined}
              disabled={disabled}
            />
            <Field
              className="csirt-discover__edit-value"
              value={item.value}
              onChange={canEdit ? (value) => patchStrip(index, 'value', value) : undefined}
              disabled={disabled}
            />
          </article>
        ))}
      </section>

      {hasEditorial ? (
        <section className="csirt-discover__editorial" aria-label="Contenu éditorial">
          {bodySlot ?? <SiteRichText value={bodyHtml!} />}
        </section>
      ) : null}

      <section className="csirt-discover__stats" aria-label="Chiffres-clés">
        {data.stats.map((stat, index) => (
          <article key={`stat-${index}`} className="csirt-discover__stat">
            <Field
              className="csirt-discover__stat-value csirt-discover__edit-stat-value"
              value={stat.value}
              onChange={canEdit ? (value) => patchStat(index, 'value', value) : undefined}
              disabled={disabled}
            />
            <Field
              className="csirt-discover__edit-stat-label"
              as="strong"
              value={stat.label}
              onChange={canEdit ? (value) => patchStat(index, 'label', value) : undefined}
              disabled={disabled}
            />
            <Field
              className="csirt-discover__edit-stat-desc"
              value={stat.desc}
              onChange={canEdit ? (value) => patchStat(index, 'desc', value) : undefined}
              disabled={disabled}
            />
          </article>
        ))}
      </section>

      <section className="csirt-discover__split" id="missions" aria-labelledby="discover-missions">
        <div className="csirt-discover__split-copy">
          <p className="csirt-discover__kicker">
            <ShieldCheck aria-hidden />
            <Field
              className="csirt-discover__edit-kicker"
              value={data.missionsKicker}
              onChange={canEdit ? (value) => patch({ missionsKicker: value }) : undefined}
              disabled={disabled}
            />
          </p>
          <Field
            id="discover-missions"
            className="csirt-discover__edit-heading"
            as="h2"
            value={data.missionsTitle}
            onChange={canEdit ? (value) => patch({ missionsTitle: value }) : undefined}
            disabled={disabled}
          />
          <Field
            className="csirt-discover__edit-body"
            as="p"
            multiline
            value={data.missionsLead}
            onChange={canEdit ? (value) => patch({ missionsLead: value }) : undefined}
            disabled={disabled}
          />
          <ul className="csirt-discover__mission-list">
            {data.missions.map((item, index) => {
              const Icon = MISSION_ICONS[item.icon] ?? Eye
              return (
                <li key={`mission-${index}`}>
                  <span className="csirt-discover__mission-icon" aria-hidden>
                    <Icon />
                  </span>
                  <div>
                    <Field
                      className="csirt-discover__edit-mission-title"
                      as="strong"
                      value={item.title}
                      onChange={canEdit ? (value) => patchMission(index, 'title', value) : undefined}
                      disabled={disabled}
                    />
                    <Field
                      className="csirt-discover__edit-mission-body"
                      as="p"
                      multiline
                      value={item.body}
                      onChange={canEdit ? (value) => patchMission(index, 'body', value) : undefined}
                      disabled={disabled}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
        {canEdit ? (
          <EditableMedia
            className="csirt-discover__split-media"
            variant="split"
            src={data.missionsImage}
            caption={data.missionsImageCaption}
            onSrcChange={(missionsImage) => patch({ missionsImage })}
            onCaptionChange={(missionsImageCaption) => patch({ missionsImageCaption })}
            disabled={disabled}
          />
        ) : (
          <figure className="csirt-discover__split-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.missionsImage} alt="" />
            <figcaption>{data.missionsImageCaption}</figcaption>
          </figure>
        )}
      </section>

      <section className="csirt-discover__visual" aria-labelledby="discover-network">
        {canEdit ? (
          <EditableMedia
            className="csirt-discover__visual-frame"
            variant="visual"
            src={data.visualImage}
            onSrcChange={(visualImage) => patch({ visualImage })}
            disabled={disabled}
          >
            <div className="csirt-discover__visual-copy">
              <p className="csirt-discover__kicker is-on-dark">
                <Radio aria-hidden />
                <Field
                  className="csirt-discover__edit-kicker is-on-dark"
                  value={data.visualKicker}
                  onChange={(value) => patch({ visualKicker: value })}
                  disabled={disabled}
                />
              </p>
              <Field
                id="discover-network"
                className="csirt-discover__edit-heading is-on-dark"
                as="h2"
                value={data.visualTitle}
                onChange={(value) => patch({ visualTitle: value })}
                disabled={disabled}
              />
              <Field
                className="csirt-discover__edit-body is-on-dark"
                as="p"
                multiline
                value={data.visualBody}
                onChange={(value) => patch({ visualBody: value })}
                disabled={disabled}
              />
            </div>
          </EditableMedia>
        ) : (
          <figure className="csirt-discover__visual-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.visualImage} alt="" />
            <div className="csirt-discover__visual-copy">
              <p className="csirt-discover__kicker is-on-dark">
                <Radio aria-hidden />
                {data.visualKicker}
              </p>
              <h2 id="discover-network">{data.visualTitle}</h2>
              <p>{data.visualBody}</p>
            </div>
          </figure>
        )}
      </section>

      <section className="csirt-discover__timeline" aria-labelledby="discover-timeline">
        <header className="csirt-discover__timeline-head">
          <p className="csirt-discover__kicker">
            <Calendar aria-hidden />
            <Field
              className="csirt-discover__edit-kicker"
              value={data.timelineKicker}
              onChange={canEdit ? (value) => patch({ timelineKicker: value }) : undefined}
              disabled={disabled}
            />
          </p>
          <Field
            id="discover-timeline"
            className="csirt-discover__edit-heading"
            as="h2"
            value={data.timelineTitle}
            onChange={canEdit ? (value) => patch({ timelineTitle: value }) : undefined}
            disabled={disabled}
          />
        </header>
        <ol className="csirt-discover__timeline-list">
          {data.timeline.map((step, index) => (
            <li key={`timeline-${index}`} className="csirt-discover__timeline-step">
              <span className="csirt-discover__timeline-dot" aria-hidden />
              <Field
                className="csirt-discover__timeline-year csirt-discover__edit-year"
                value={step.year}
                onChange={canEdit ? (value) => patchTimeline(index, 'year', value) : undefined}
                disabled={disabled}
              />
              <Field
                className="csirt-discover__edit-mission-title"
                as="strong"
                value={step.title}
                onChange={canEdit ? (value) => patchTimeline(index, 'title', value) : undefined}
                disabled={disabled}
              />
              <Field
                className="csirt-discover__edit-mission-body"
                as="p"
                multiline
                value={step.body}
                onChange={canEdit ? (value) => patchTimeline(index, 'body', value) : undefined}
                disabled={disabled}
              />
            </li>
          ))}
        </ol>
      </section>

      <section className="csirt-discover__gov" id="gouvernance" aria-labelledby="discover-gov">
        <header className="csirt-discover__gov-head">
          <p className="csirt-discover__kicker">
            <Users aria-hidden />
            <Field
              className="csirt-discover__edit-kicker"
              value={data.govKicker}
              onChange={canEdit ? (value) => patch({ govKicker: value }) : undefined}
              disabled={disabled}
            />
          </p>
          <Field
            id="discover-gov"
            className="csirt-discover__edit-heading"
            as="h2"
            value={data.govTitle}
            onChange={canEdit ? (value) => patch({ govTitle: value }) : undefined}
            disabled={disabled}
          />
          <Field
            className="csirt-discover__edit-body"
            as="p"
            multiline
            value={data.govLead}
            onChange={canEdit ? (value) => patch({ govLead: value }) : undefined}
            disabled={disabled}
          />
        </header>
        <div className="csirt-discover__gov-grid">
          {data.govCards.map((card, index) => {
            const Icon = GOV_ICONS[card.icon] ?? Shield
            return (
              <article key={`gov-${index}`}>
                <Icon aria-hidden />
                <Field
                  className="csirt-discover__edit-mission-title"
                  as="strong"
                  value={card.title}
                  onChange={canEdit ? (value) => patchGov(index, 'title', value) : undefined}
                  disabled={disabled}
                />
                <Field
                  className="csirt-discover__edit-mission-body"
                  as="p"
                  multiline
                  value={card.body}
                  onChange={canEdit ? (value) => patchGov(index, 'body', value) : undefined}
                  disabled={disabled}
                />
              </article>
            )
          })}
        </div>
      </section>

      <section className="csirt-discover__cta" aria-label="Actions">
        <div className="csirt-discover__cta-copy">
          <Field
            className="csirt-discover__edit-heading"
            as="h2"
            value={data.ctaTitle}
            onChange={canEdit ? (value) => patch({ ctaTitle: value }) : undefined}
            disabled={disabled}
            placeholder="Titre de l’appel à l’action"
          />
          <Field
            className="csirt-discover__edit-body"
            as="p"
            multiline
            value={data.ctaLead}
            onChange={canEdit ? (value) => patch({ ctaLead: value }) : undefined}
            disabled={disabled}
            placeholder="Texte d’accompagnement"
          />
          {canEdit ? (
            <div className="csirt-discover__edit-cta-urls">
              <input
                className="csirt-discover__edit-media-url"
                value={data.ctaPrimaryHref}
                disabled={disabled}
                placeholder="URL bouton principal (ex. /signalement)"
                onChange={(event) => patch({ ctaPrimaryHref: event.target.value })}
              />
              <input
                className="csirt-discover__edit-media-url"
                value={data.ctaSecondaryHref}
                disabled={disabled}
                placeholder="URL bouton secondaire (ex. /contacts)"
                onChange={(event) => patch({ ctaSecondaryHref: event.target.value })}
              />
            </div>
          ) : null}
        </div>
        <div className="csirt-discover__cta-actions">
          {previewMode || editable ? (
            <>
              <span className="csirt-discover__btn is-primary is-editable">
                <Field
                  className="csirt-discover__edit-inline is-on-btn"
                  value={data.ctaPrimaryLabel}
                  onChange={canEdit ? (value) => patch({ ctaPrimaryLabel: value }) : undefined}
                  disabled={disabled}
                  placeholder="Libellé bouton"
                />
                <ArrowUpRight aria-hidden />
              </span>
              <span className="csirt-discover__btn is-secondary is-editable">
                <Field
                  className="csirt-discover__edit-inline is-on-btn"
                  value={data.ctaSecondaryLabel}
                  onChange={canEdit ? (value) => patch({ ctaSecondaryLabel: value }) : undefined}
                  disabled={disabled}
                  placeholder="Libellé bouton"
                />
              </span>
            </>
          ) : (
            <>
              <Link href={data.ctaPrimaryHref || '/signalement'} className="csirt-discover__btn is-primary">
                {data.ctaPrimaryLabel}
                <ArrowUpRight aria-hidden />
              </Link>
              <Link href={data.ctaSecondaryHref || '/contacts'} className="csirt-discover__btn is-secondary">
                {data.ctaSecondaryLabel}
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
