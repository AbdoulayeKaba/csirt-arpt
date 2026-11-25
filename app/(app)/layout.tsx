import React from 'react';
import { redirect } from 'next/navigation';
import { AuthProvider } from '@/components/providers/auth-provider';
import { AppProvider } from '@/lib/app-context';
import { AppShell } from '@/components/layout/app-shell';
import { getServerSessionContext } from '@/lib/auth/session-server';
import { isAuthDisabled } from '@/lib/auth/open-access';
import { DEFAULT_PLATFORM_BRANDING } from '@/lib/dg/platform-branding';
import { getLayoutPlatformBranding } from '@/lib/services/platform-settings-cache';
import '@/app/styles/console-modules.css';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ctx, branding] = await Promise.all([
    getServerSessionContext(),
    getLayoutPlatformBranding().catch(() => DEFAULT_PLATFORM_BRANDING),
  ]);
  if (!ctx) {
    if (isAuthDisabled()) {
      redirect('/dashboard');
    }
    redirect('/login');
  }

  if (ctx.roleId === 'CORRESPONDANT') {
    redirect('/signalement');
  }

  return (
    <AuthProvider>
    <AppProvider
      branding={branding}
      initialSession={{
        user: ctx.user,
        employeeId: ctx.employeeId,
        appRole: ctx.appRole,
        roleId: ctx.roleId,
        roleLabel: ctx.roleLabel,
        permissions: ctx.permissions,
        dgRole: ctx.dgRole,
      }}
    >
      <AppShell>{children}</AppShell>
    </AppProvider>
    </AuthProvider>
  );
}
