'use client'

import { ArrowRight, ImagePlus } from 'lucide-react'
import type { CsirtHeroSlide } from '@/lib/csirt/home-content'
import { resolveHeroCtaIcon } from '@/lib/csirt/hero-cta'
import { cn } from '@/lib/utils'

export function SiteHomeHeroPreview({
  slide,
  searchEnabled = false,
}: {
  slide: CsirtHeroSlide
  /** Miroir du site public : la recherche masque les CTA du diaporama. */
  searchEnabled?: boolean
}) {
  const Icon = resolveHeroCtaIcon(slide.ctaIcon, slide.variant)
  const showCta = Boolean(slide.cta?.trim() && slide.href?.trim()) && !searchEnabled
  const hasCopy = Boolean(slide.kicker?.trim() || slide.title?.trim())
  const isTrash = slide.archived === true
  const isLive =
    !isTrash && slide.enabled !== false && Boolean(slide.src?.trim())
  const statusLabel = isTrash ? 'Corbeille' : isLive ? 'Publiable' : 'Hors publication'

  if (!slide.src.trim()) {
    return (
      <div className="site-home-live-preview site-home-live-preview--hero">
        <div className="site-home-studio__preview-empty">
          <ImagePlus className="h-8 w-8" aria-hidden />
          <strong>Ajoutez une image</strong>
          <p>Format paysage recommandé · 1920×1080</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'site-home-live-preview site-home-live-preview--hero',
        !isLive && 'is-offline',
        isTrash && 'is-trash'
      )}
      aria-hidden
    >
      <span
        className={cn(
          'site-home-studio__preview-badge',
          isTrash ? 'is-trash' : isLive ? 'is-live' : 'is-draft'
        )}
      >
        {statusLabel}
      </span>
      <section className={cn('csirt-hero', searchEnabled && 'has-search-slot')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={slide.src} alt="" className="csirt-hero-image is-active" />
        <div className="csirt-hero-shade" />
        {hasCopy || showCta ? (
          <div
            className={cn(
              'csirt-hero-overlays',
              searchEnabled && 'csirt-hero-overlays--with-search'
            )}
          >
            {hasCopy ? (
              <div className="csirt-hero-copy">
                {slide.kicker?.trim() ? (
                  <p className="csirt-hero-kicker">{slide.kicker}</p>
                ) : null}
                {slide.title?.trim() ? <h2 className="csirt-hero-title">{slide.title}</h2> : null}
              </div>
            ) : null}
            {showCta ? (
              <span className={cn('csirt-hero-cta', `csirt-hero-cta--${slide.variant}`)}>
                {Icon ? (
                  <span className="csirt-hero-cta-icon">
                    <Icon className="h-6 w-6" strokeWidth={1.85} aria-hidden />
                  </span>
                ) : null}
                {slide.cta}
                <ArrowRight className="csirt-hero-cta-end" strokeWidth={1.85} aria-hidden />
              </span>
            ) : null}
          </div>
        ) : null}
        {searchEnabled ? (
          <div className="csirt-hero-search-slot site-home-studio__preview-search">
            <span>Barre de recherche (CTA masqués sur le site)</span>
          </div>
        ) : null}
      </section>
    </div>
  )
}
