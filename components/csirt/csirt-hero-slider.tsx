'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  CSIRT_HERO_SLIDES,
  publishableHeroSlides,
  type CsirtHeroSlide,
} from '@/lib/csirt/home-content'
import { resolveHeroCtaIcon } from '@/lib/csirt/hero-cta'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import { cn } from '@/lib/utils'

type SlideDirection = 'next' | 'prev'

function slideDirection(from: number, to: number, length: number): SlideDirection {
  if (from === to || length <= 1) return 'next'
  const forward = (to - from + length) % length
  const backward = (from - to + length) % length
  return forward <= backward ? 'next' : 'prev'
}

function slidesFingerprint(slides: readonly CsirtHeroSlide[]) {
  return slides.map((slide) => slide.id).join('|')
}

export function CsirtHeroSlider({
  slides = CSIRT_HERO_SLIDES,
  autoplayMs = 7000,
  searchSlot,
}: {
  slides?: readonly CsirtHeroSlide[]
  autoplayMs?: number
  searchSlot?: React.ReactNode
}) {
  const { t } = useCsirtLocale()
  const items = useMemo(() => {
    const published = publishableHeroSlides(slides)
    if (published.length > 0) return published
    // Contenu CMS présent mais rien de publiable → pas de fallback silencieux
    if ((slides?.length ?? 0) > 0) return []
    return publishableHeroSlides(CSIRT_HERO_SLIDES)
  }, [slides])

  const fingerprint = slidesFingerprint(items)
  const interval = Math.min(15000, Math.max(2000, autoplayMs || 7000))
  const [index, setIndex] = useState(0)
  const [prevIndex, setPrevIndex] = useState(0)
  const [direction, setDirection] = useState<SlideDirection>('next')
  const [paused, setPaused] = useState(false)
  const indexRef = useRef(index)

  useEffect(() => {
    indexRef.current = index
  }, [index])

  useEffect(() => {
    setIndex(0)
    setPrevIndex(0)
    setDirection('next')
  }, [fingerprint])

  const goTo = useCallback(
    (next: number) => {
      if (items.length <= 1) return
      const normalized = ((next % items.length) + items.length) % items.length
      if (normalized === indexRef.current) return
      setDirection(slideDirection(indexRef.current, normalized, items.length))
      setPrevIndex(indexRef.current)
      setIndex(normalized)
    },
    [items.length]
  )

  useEffect(() => {
    if (items.length <= 1 || paused) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const timer = window.setInterval(() => goTo(indexRef.current + 1), interval)
    return () => window.clearInterval(timer)
  }, [goTo, interval, items.length, paused])

  const safeIndex = items.length ? Math.min(index, items.length - 1) : 0
  const slide = items[safeIndex] ?? items[0]
  if (!slide) return null

  const Icon = resolveHeroCtaIcon(slide.ctaIcon, slide.variant)
  const hasCta = Boolean(slide.cta?.trim() && slide.href?.trim())
  const hasCopy = Boolean(slide.kicker?.trim() || slide.title?.trim())

  return (
    <section
      className={cn('csirt-hero', searchSlot && 'has-search-slot')}
      aria-roledescription="carousel"
      aria-label={t('heroCarouselAria')}
      data-direction={direction}
      data-paused={paused ? 'true' : 'false'}
      style={{ '--hero-autoplay': `${interval}ms` } as CSSProperties}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false)
        }
      }}
    >
      <div className="csirt-hero-stage" aria-hidden>
        {items.map((item, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.id}
            src={item.src}
            alt=""
            className={cn(
              'csirt-hero-image',
              i === safeIndex && 'is-active',
              i === prevIndex && i !== safeIndex && 'is-exiting'
            )}
            aria-hidden={i !== safeIndex}
          />
        ))}
      </div>

      <div className="csirt-hero-shade" aria-hidden />

      {items.length > 1 ? (
        <>
          <button
            type="button"
            className="csirt-hero-arrow csirt-hero-arrow--prev"
            onClick={() => goTo(safeIndex - 1)}
            aria-label={t('heroPrevSlide')}
          >
            <ChevronLeft className="h-8 w-8" aria-hidden />
          </button>
          <button
            type="button"
            className="csirt-hero-arrow csirt-hero-arrow--next"
            onClick={() => goTo(safeIndex + 1)}
            aria-label={t('heroNextSlide')}
          >
            <ChevronRight className="h-8 w-8" aria-hidden />
          </button>
        </>
      ) : null}

      {hasCopy || (hasCta && !searchSlot) ? (
        <div
          key={`overlay-${slide.id}`}
          className={cn(
            'csirt-hero-overlays',
            searchSlot && 'csirt-hero-overlays--with-search',
            'csirt-hero-overlay--in'
          )}
        >
          {hasCopy ? (
            <div className="csirt-hero-copy">
              {slide.kicker?.trim() ? <p className="csirt-hero-kicker">{slide.kicker}</p> : null}
              {slide.title?.trim() ? <h2 className="csirt-hero-title">{slide.title}</h2> : null}
            </div>
          ) : null}
          {hasCta && !searchSlot ? (
            <a
              href={slide.href}
              className={cn('csirt-hero-cta', `csirt-hero-cta--${slide.variant}`)}
            >
              {Icon ? (
                <span className="csirt-hero-cta-icon" aria-hidden>
                  <Icon className="h-6 w-6" strokeWidth={1.85} />
                </span>
              ) : null}
              {slide.cta}
              <ArrowRight className="csirt-hero-cta-end" strokeWidth={1.85} aria-hidden />
            </a>
          ) : null}
        </div>
      ) : null}

      {searchSlot ? <div className="csirt-hero-search-slot">{searchSlot}</div> : null}

      {items.length > 1 ? (
        <div className="csirt-hero-dots" role="tablist" aria-label={t('heroSlidesTablist')}>
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              aria-label={`${t('heroSlideN')} ${i + 1}`}
              className={cn('csirt-hero-dot', i === safeIndex && 'is-active')}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      ) : null}

      <span className="sr-only" aria-live="polite">
        Diapositive {safeIndex + 1} sur {items.length}
        {slide.title ? ` : ${slide.title}` : ''}
      </span>
    </section>
  )
}
