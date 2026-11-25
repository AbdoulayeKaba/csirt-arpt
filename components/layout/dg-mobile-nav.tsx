'use client';

import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useApp } from '@/lib/app-context';
import { userInitials } from '@/lib/dg/role-labels';
import { DgNavMenu } from '@/components/layout/dg-nav-menu';
import { useDgShell } from '@/components/layout/dg-shell-context';

export function DgMobileNav() {
  const { mobileNavOpen, setMobileNavOpen } = useDgShell();
  const { branding, currentUser, roleLabel } = useApp();
  const initials = userInitials(currentUser.firstName, currentUser.lastName);

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetContent side="left" className="dg-mobile-nav-sheet w-[min(18rem,88vw)] border-0 p-0">
        <div className="dg-sidebar admin-theme flex h-full flex-col">
          <SheetHeader className="dg-sidebar-brand shrink-0 border-b p-0 text-left">
            <SheetTitle className="sr-only">{branding.organizationName}</SheetTitle>
            <div className="dg-sidebar-brand-status px-3 py-2.5">
              <span className="dg-status-dot" aria-hidden />
              <span>Système actif</span>
            </div>
          </SheetHeader>

          <DgNavMenu className="flex-1" onNavigate={() => setMobileNavOpen(false)} />

          <Link
            href="/account"
            className="dg-sidebar-role-card shrink-0"
            title="Mon profil"
            aria-label={`Mon profil — ${roleLabel}`}
            onClick={() => setMobileNavOpen(false)}
          >
            <div className="dg-sidebar-role-avatar">{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="dg-sidebar-role-label">Rôle actuel</p>
              <p className="dg-sidebar-role-value" title={roleLabel}>
                {roleLabel}
              </p>
            </div>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
