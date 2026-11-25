'use client';

import { useEffect, useState } from 'react';
import {
  getCachedLogoSrc,
  loadLogoWithoutWhiteBackground,
  type LogoProcessMode,
} from '@/lib/images/strip-logo-background';
import { CSIRT_LOGO_MARK_SRC } from '@/lib/csirt/brand';
import { cn } from '@/lib/utils';

type Props = {
  src: string;
  alt?: string;
  className?: string;
  /** Image de repli si `src` est indisponible, avant le pictogramme générique. */
  fallbackSrc?: string;
  /** `on-dark` : fond blanc transparent + texte noir → blanc (pied de page). */
  mode?: LogoProcessMode;
};

export function InstitutionLogoImage({
  src,
  alt = '',
  className,
  fallbackSrc,
  mode = 'strip-white',
}: Props) {
  const trimmed = src?.trim() ?? '';
  // Toujours la même src initiale SSR/client — le cache ne doit pas diverger au 1er paint.
  const [displaySrc, setDisplaySrc] = useState(trimmed);

  useEffect(() => {
    if (!trimmed) return;
    const cached = getCachedLogoSrc(trimmed, mode);
    if (cached) {
      setDisplaySrc(cached);
      return;
    }
    let cancelled = false;
    void loadLogoWithoutWhiteBackground(trimmed, mode).then((result) => {
      if (!cancelled) setDisplaySrc(result);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, trimmed]);

  if (!trimmed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displaySrc}
      alt={alt}
      className={cn('institution-logo-img', className)}
      onError={() => {
        const next = fallbackSrc?.trim();
        if (next && displaySrc !== next && displaySrc !== CSIRT_LOGO_MARK_SRC) {
          void loadLogoWithoutWhiteBackground(next, mode).then(setDisplaySrc);
          return;
        }
        if (displaySrc !== CSIRT_LOGO_MARK_SRC) {
          setDisplaySrc(CSIRT_LOGO_MARK_SRC);
        }
      }}
    />
  );
}
