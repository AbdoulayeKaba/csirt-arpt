'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Toaster } from '@/components/ui/toaster';
import { isDgAppPath } from '@/lib/layout/dg-nav';

const DgAppShell = dynamic(
  () => import('./dg-app-shell').then((m) => m.DgAppShell),
  {
    ssr: true,
    loading: () => <div className="min-h-screen bg-background" aria-busy="true" />,
  }
);

const LegacyAppShell = dynamic(
  () => import('./legacy-app-shell').then((m) => m.LegacyAppShell),
  {
    ssr: true,
    loading: () => <div className="min-h-screen bg-background" aria-busy="true" />,
  }
);

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const dgApp = isDgAppPath(pathname);

  return (
    <>
      {dgApp ? <DgAppShell>{children}</DgAppShell> : <LegacyAppShell>{children}</LegacyAppShell>}
      <Toaster />
    </>
  );
}
