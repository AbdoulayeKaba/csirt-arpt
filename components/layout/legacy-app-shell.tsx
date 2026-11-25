'use client';

import { Header } from './header';
import { Sidebar } from './sidebar';
import { Breadcrumbs } from './breadcrumbs';
import { AppSecureFooter } from './app-secure-footer';

export function LegacyAppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Sidebar />
      <main className="flex flex-1 flex-col pt-[calc(2.75rem+4px)] transition-[padding] lg:pl-64">
        <div className="app-shell-body container mx-auto p-5 lg:p-8">
          <div className="app-shell-content">
            <Breadcrumbs variant="default" />
            {children}
          </div>
          <AppSecureFooter />
        </div>
      </main>
    </div>
  );
}
