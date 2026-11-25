'use client';

import { InstitutionLogoImage } from '@/components/layout/institution-logo-image';
import { resolveCsirtLogoSrc } from '@/lib/csirt/brand';
import { useAppOptional } from '@/lib/app-context';
import { DEFAULT_PLATFORM_BRANDING } from '@/lib/dg/platform-branding';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  showText?: boolean;
  subtitle?: string;
  compact?: boolean;
  logoClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
};

export function InstitutionBrandMark({
  className,
  showText = true,
  subtitle,
  compact = false,
  logoClassName,
  titleClassName,
  subtitleClassName,
}: Props) {
  const branding = useAppOptional()?.branding ?? DEFAULT_PLATFORM_BRANDING;
  const { organizationName, institutionLogoUrl, institutionAcronym } = branding;
  const logoSrc = resolveCsirtLogoSrc(institutionLogoUrl);
  const displaySubtitle = subtitle ?? (institutionAcronym || 'Console interne');

  return (
    <div className={cn('flex shrink-0 items-center', compact ? 'gap-1.5' : 'gap-2.5', className)}>
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden border-0 bg-transparent shadow-none',
          compact ? 'h-9 w-auto max-w-[7.5rem]' : 'h-10 w-auto max-w-[8.5rem]',
          logoClassName
        )}
      >
        <InstitutionLogoImage
          src={logoSrc}
          alt={organizationName}
          className="h-full w-auto max-w-full object-contain object-left"
        />
      </div>
      {showText ? (
        <div className="min-w-0">
          <p
            className={cn(
              'truncate font-bold text-emerald-700',
              compact ? 'text-[11px] leading-tight' : 'text-sm leading-none',
              titleClassName
            )}
          >
            {organizationName}
          </p>
          {displaySubtitle ? (
            <p
              className={cn(
                'truncate text-muted-foreground',
                compact ? 'mt-0 text-[8px] leading-tight' : 'mt-0.5 text-[10px]',
                subtitleClassName
              )}
            >
              {displaySubtitle}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
