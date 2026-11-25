'use client';

import { DgHeader } from '@/components/layout/dg-header';
import { DgSidebar } from '@/components/layout/dg-sidebar';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { AppSecureFooter } from '@/components/layout/app-secure-footer';
import { DgShellProvider, useDgShell } from '@/components/layout/dg-shell-context';
import { DgNavigationProvider } from '@/components/layout/dg-navigation-context';
import { cn } from '@/lib/utils';

function DgAppShellBody({ children }: { children: React.ReactNode }) {
  const { desktopSidebarOpen } = useDgShell();

  return (
    <div
      className={cn(
        'app-pro-shell flex min-h-screen flex-col',
        !desktopSidebarOpen && 'dg-shell-sidebar-closed'
      )}
    >
      <DgHeader />
      <DgSidebar />
      <main
        className={cn(
          'flex flex-1 flex-col pt-[calc(2.75rem+4px)] transition-[padding-left] duration-200 ease-out',
          desktopSidebarOpen ? 'lg:pl-[var(--dg-sidebar-width)]' : 'lg:pl-0'
        )}
      >
        <div className="app-shell-body admin-theme mx-auto max-w-[1600px] px-3 py-3 lg:px-5 lg:py-4">
          <div className="app-shell-content">
            <Breadcrumbs variant="pro" />
            {children}
          </div>
          <AppSecureFooter />
        </div>
      </main>
    </div>
  );
}

export function DgAppShell({ children }: { children: React.ReactNode }) {
  return (
    <DgShellProvider>
      <DgNavigationProvider>
        <DgAppShellBody>{children}</DgAppShellBody>
      </DgNavigationProvider>
    </DgShellProvider>
  );
}
