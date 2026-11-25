import { InstitutionLogoImage } from '@/components/layout/institution-logo-image';
import { resolveCsirtLogoSrc } from '@/lib/csirt/brand';
import { cn } from '@/lib/utils';

type Props = {
  institutionLogoUrl: string;
  organizationName: string;
  variant?: 'hero' | 'mobile';
};

export function AuthLoginLogo({
  institutionLogoUrl,
  organizationName,
  variant = 'mobile',
}: Props) {
  const isHero = variant === 'hero';
  const logoSrc = resolveCsirtLogoSrc(institutionLogoUrl);

  return (
    <div
      className={cn(
        'auth-login-logo auth-login-logo--has-image',
        isHero ? 'auth-login-logo--hero' : 'auth-login-logo--mobile'
      )}
    >
      <InstitutionLogoImage
        src={logoSrc}
        alt={organizationName}
        className="auth-login-logo-img"
      />
    </div>
  );
}
