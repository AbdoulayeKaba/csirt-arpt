'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDgRole } from '@/lib/auth/use-dg-role';
import { Bookmark, LayoutDashboard, ScrollText, Settings, Shield, ShieldAlert, Users } from 'lucide-react';
import type { DgRole } from '@/lib/dg/rbac';

type NavItem = { label: string; href: string; icon: React.ReactNode; roles?: DgRole[] };

const NAV: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Signalements & Incidents', href: '/dg/incidents', icon: <ShieldAlert className="h-4 w-4" /> },
  { label: 'Utilisateurs', href: '/dg/admin/users', icon: <Users className="h-4 w-4" />, roles: ['ASSISTANT'] },
  { label: 'Rôles & permissions', href: '/dg/admin/roles', icon: <Shield className="h-4 w-4" />, roles: ['ASSISTANT'] },
  { label: 'Référentiels', href: '/dg/admin/referentiels', icon: <Bookmark className="h-4 w-4" />, roles: ['ASSISTANT'] },
  { label: 'Paramètres', href: '/dg/admin/settings', icon: <Settings className="h-4 w-4" />, roles: ['ASSISTANT'] },
  { label: "Journal d'audit", href: '/dg/audit', icon: <ScrollText className="h-4 w-4" />, roles: ['ASSISTANT'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const role = useDgRole();

  const items = NAV.filter((n) => !n.roles || n.roles.includes(role));

  return (
    <aside className="fixed left-0 top-[calc(3.5rem+4px)] z-30 hidden h-[calc(100vh-3.5rem-4px)] w-64 border-r border-sidebar-border bg-sidebar shadow-sm lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-sidebar-border p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_6px_var(--success)]" />
            <span className="text-xs font-medium text-success">CSIRT-ARPT</span>
          </div>
          <p className="text-xs text-muted-foreground">Autorité de régulation</p>
          <p className="text-sm font-semibold text-primary">Console interne</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
