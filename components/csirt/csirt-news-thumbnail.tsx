'use client'

import { useEffect, useState } from 'react'
import { Shield, ShieldAlert, FileText, Lock, Radar, ShieldCheck } from 'lucide-react'
import { isInvalidOrBlackCyberImage, resolveCyberNewsImage } from '@/lib/site/news-images'
import { cn } from '@/lib/utils'

type CsirtNewsThumbnailProps = {
  src?: string | null
  alt?: string
  title?: string
  category?: string
  isAlert?: boolean
  featured?: boolean
  className?: string
  priority?: boolean
}

function getFallbackCyberIcon(category?: string, isAlert?: boolean) {
  const cat = (category || '').toLowerCase()
  if (
    isAlert ||
    cat.includes('alert') ||
    cat.includes('avis') ||
    cat.includes('vuln') ||
    cat.includes('menace') ||
    cat.includes('cve')
  ) {
    return ShieldAlert
  }
  if (cat.includes('bulletin') || cat.includes('rapport')) {
    return FileText
  }
  if (cat.includes('durcissement') || cat.includes('norme') || cat.includes('loi')) {
    return Lock
  }
  if (cat.includes('veille') || cat.includes('radar')) {
    return Radar
  }
  if (cat.includes('patch') || cat.includes('mise à jour')) {
    return ShieldCheck
  }
  return Shield
}

export function CsirtNewsThumbnail({
  src,
  alt = '',
  title,
  category,
  isAlert = false,
  featured = false,
  className,
}: CsirtNewsThumbnailProps) {
  const [hasError, setHasError] = useState(false)

  // Reset error if src changes
  useEffect(() => {
    setHasError(false)
  }, [src])

  const rawSrc = typeof src === 'string' ? src.trim() : ''
  const isInvalid = isInvalidOrBlackCyberImage(rawSrc)

  // Calcule l'image réelle ou l'illustration thématique haute fidélité
  const effectiveImageUrl = isInvalid
    ? resolveCyberNewsImage(title, category, null)
    : rawSrc

  const Icon = getFallbackCyberIcon(category, isAlert)

  if (!hasError && effectiveImageUrl) {
    return (
      <div className={cn('csirt-news-thumb-wrapper', featured && 'is-featured', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={effectiveImageUrl}
          alt={alt || title || 'Actualité CSIRT-ARPT'}
          loading={featured ? 'eager' : 'lazy'}
          onError={() => setHasError(true)}
          className="csirt-news-thumb-img"
        />
        {/* Subtle cyber overlay gradient */}
        <div className="csirt-news-thumb-overlay" />
      </div>
    )
  }

  // Backup cyber badge visual in case of complete network offline
  return (
    <div
      className={cn(
        'csirt-news-thumb-wrapper csirt-news-thumb-fallback',
        isAlert ? 'csirt-news-thumb--alert' : 'csirt-news-thumb--standard',
        featured && 'is-featured',
        className
      )}
      aria-hidden="true"
    >
      <div className="csirt-news-thumb-bg" />
      <div className="csirt-news-thumb-grid" />
      <div className="csirt-news-thumb-glow" />

      <div className="csirt-news-thumb-center">
        <div className="csirt-news-thumb-icon-box">
          <Icon className="csirt-news-thumb-icon" strokeWidth={1.8} />
          {isAlert && <span className="csirt-news-thumb-pulse" />}
        </div>

        {featured ? (
          <div className="csirt-news-thumb-featured-badge">
            <span>CSIRT-ARPT</span>
            <em>{isAlert ? 'ALERTE CYBER' : 'BULLETIN DE SÉCURITÉ'}</em>
          </div>
        ) : (
          <div className="csirt-news-thumb-mini-label">
            <span>{isAlert ? 'AVIS DE SÉCURITÉ' : 'CSIRT CYBER'}</span>
          </div>
        )}
      </div>

      <div className="csirt-news-thumb-corner csirt-news-thumb-corner--tl" />
      <div className="csirt-news-thumb-corner csirt-news-thumb-corner--br" />
    </div>
  )
}
