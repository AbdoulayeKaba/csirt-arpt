import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  description: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
  /** `flat` : titre sous le fil d’Ariane, sans bandeau dégradé. */
  variant?: 'hero' | 'flat';
};

export function AdminPageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
  variant = 'hero',
}: Props) {
  return (
    <div className={cn('admin-hero', variant === 'flat' && 'admin-hero--flat', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="admin-hero-eyebrow">{eyebrow}</p> : null}
        <h1 className="admin-hero-title">{title}</h1>
        <p className="admin-hero-description">{description}</p>
      </div>
      {actions ? <div className="admin-hero-actions">{actions}</div> : null}
    </div>
  );
}
