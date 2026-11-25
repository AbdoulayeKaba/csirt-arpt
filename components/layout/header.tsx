'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/app-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExternalLink, Globe, LogOut, Moon, Sun, UserCog } from 'lucide-react';
import { InstitutionBrandMark } from '@/components/layout/institution-brand-mark';
import { DgHeaderNotifications } from '@/components/layout/dg-header-notifications';
import { DgHeaderSearch } from '@/components/layout/dg-header-search';

export function Header() {
  const router = useRouter();
  const { t, language, setLanguage, currentUser, isDarkMode, toggleDarkMode, branding } = useApp();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card shadow-sm">
      <div className="csirt-header-stripe" />
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <InstitutionBrandMark compact showText={false} logoClassName="dg-header-brand-logo" />
          <div className="hidden md:block">
            <h1 className="text-base font-bold leading-none text-primary">
              {branding.organizationName || 'CSIRT-ARPT'}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {branding.institutionAcronym || 'Console interne'}
            </p>
          </div>
        </Link>

        <div className="hidden md:flex flex-1 items-center justify-center max-w-md mx-4">
          <DgHeaderSearch />
        </div>

        <div className="flex items-center gap-2">
          <DgHeaderNotifications />

          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="dg-header-public-site-btn"
            title="Ouvrir le site public (nouvel onglet)"
          >
            <Globe className="h-3.5 w-3.5" aria-hidden />
            <span>Site public</span>
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Globe className="h-4 w-4" />
                <span className="sr-only">Langue</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage('fr')} className={language === 'fr' ? 'bg-accent' : ''}>
                Français
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-accent' : ''}>
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="sr-only">Toggle theme</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  {currentUser.firstName[0]}
                  {currentUser.lastName[0]}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>
                    {currentUser.firstName} {currentUser.lastName}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">{currentUser.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/account" className="cursor-pointer">
                  <UserCog className="mr-2 h-4 w-4" />
                  Mon profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" disabled={loggingOut} onClick={() => void handleLogout()}>
                <LogOut className="mr-2 h-4 w-4" />
                {loggingOut ? t('common.loading') : t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
