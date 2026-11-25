'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/app-context';
import { userInitials } from '@/lib/dg/role-labels';
import { DgNavMenu } from '@/components/layout/dg-nav-menu';
import { useDgShell } from '@/components/layout/dg-shell-context';

export function DgSidebar() {
  const { currentUser, roleLabel } = useApp();
  const { desktopSidebarOpen } = useDgShell();
  const initials = userInitials(currentUser.firstName, currentUser.lastName);

  return (
    <aside
      className={cn(
        'dg-sidebar admin-theme hidden lg:flex',
        !desktopSidebarOpen && 'dg-sidebar--collapsed'
      )}
      aria-hidden={!desktopSidebarOpen}
    >
      <div className="dg-sidebar-inner">
        <div className="dg-sidebar-brand">
          <div className="dg-sidebar-brand-status">
            <span className="dg-status-dot" aria-hidden />
            <span>Système actif</span>
          </div>
        </div>

        <DgNavMenu />

        <Link
          href="/account"
          className="dg-sidebar-role-card"
          title="Mon profil"
          aria-label={`Mon profil — ${roleLabel}`}
        >
          <div className="dg-sidebar-role-avatar">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="dg-sidebar-role-label">Rôle actuel</p>
            <p className="dg-sidebar-role-value">{roleLabel}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
