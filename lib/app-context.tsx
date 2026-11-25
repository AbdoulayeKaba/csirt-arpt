'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type Context,
  type ReactNode,
} from 'react';
import type { Language, UserRole, User } from './types';
import type { AppRoleKey } from './auth/rbac';
import type { DgRole } from '@/lib/dg/rbac';
import type { RoleId } from '@/lib/dg/role-ids';
import {
  DEFAULT_PLATFORM_BRANDING,
  type PlatformBranding,
} from '@/lib/dg/platform-branding';
import { t as translate } from './i18n';

export type AppRole = AppRoleKey;

/** Utilisateur session sérialisable (Server → Client). */
export type SessionUser = Omit<User, 'createdAt' | 'lastLogin'> & {
  createdAt: string;
  lastLogin?: string;
};

export interface InitialSession {
  user: SessionUser;
  employeeId: string;
  appRole: AppRole;
  roleId: RoleId;
  roleLabel: string;
  permissions: Record<string, boolean>;
  dgRole?: DgRole;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  currentUser: SessionUser;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  employeeId: string;
  appRole: AppRole;
  /** Session serveur (JWT + employé) — le sélecteur de rôle démo est désactivé. */
  sessionBacked: boolean;
  roleId: RoleId;
  roleLabel: string;
  permissions: Record<string, boolean>;
  /** Met à jour localement la carte de permissions (sidebar). */
  setPermissions: (permissions: Record<string, boolean>) => void;
  /** Recharge les permissions effectives du rôle connecté depuis le serveur. */
  refreshPermissions: () => Promise<void>;
  dgRole: DgRole;
  branding: PlatformBranding;
  setBranding: (branding: PlatformBranding) => void;
}

type AppContextGlobal = typeof globalThis & {
  __csirtAppContext?: Context<AppContextType | undefined>;
};

const appContextGlobal = globalThis as AppContextGlobal;
const AppContext =
  appContextGlobal.__csirtAppContext ?? createContext<AppContextType | undefined>(undefined);
appContextGlobal.__csirtAppContext = AppContext;

export function AppProvider({
  children,
  initialSession,
  branding = DEFAULT_PLATFORM_BRANDING,
}: {
  children: ReactNode;
  initialSession: InitialSession;
  branding?: PlatformBranding;
}) {
  const [language, setLanguage] = useState<Language>('fr');
  const [currentRole, setCurrentRole] = useState<UserRole>(initialSession.user.role);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    () => initialSession.permissions
  );
  const [roleId, setRoleId] = useState<RoleId>(initialSession.roleId);
  const [roleLabel, setRoleLabel] = useState(initialSession.roleLabel);
  const [dgRole, setDgRole] = useState<DgRole>(initialSession.dgRole ?? 'ASSISTANT');
  const [brandingState, setBrandingState] = useState<PlatformBranding>(branding);

  useEffect(() => {
    setBrandingState(branding);
  }, [branding]);

  useEffect(() => {
    setRoleId(initialSession.roleId);
    setRoleLabel(initialSession.roleLabel);
  }, [initialSession.roleId, initialSession.roleLabel]);

  const setBranding = useCallback((newBranding: PlatformBranding) => {
    setBrandingState(newBranding);
  }, []);

  // Ne pas écraser une mise à jour locale par un objet SSR stale à chaque refresh.

  const t = useCallback((key: string) => translate(key, language), [language]);

  const refreshPermissions = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!res.ok) return;
      const j = (await res.json()) as {
        permissions?: Record<string, boolean>;
        roleId?: RoleId;
        roleLabel?: string;
        dgRole?: DgRole;
        branding?: PlatformBranding;
      };
      if (j.permissions) setPermissions(j.permissions);
      if (j.roleId) setRoleId(j.roleId);
      if (typeof j.roleLabel === 'string') setRoleLabel(j.roleLabel);
      if (j.dgRole) setDgRole(j.dgRole);
      if (j.branding) setBrandingState(j.branding);
    } catch {
      // ignore — la sidebar conserve la dernière carte connue
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const newValue = !prev;
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(newValue ? 'dark' : 'light');
      }
      return newValue;
    });
  }, []);

  const currentUser = initialSession.user;

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        currentUser,
        currentRole,
        setCurrentRole,
        isDarkMode,
        toggleDarkMode,
        employeeId: initialSession.employeeId,
        appRole: initialSession.appRole,
        roleId,
        roleLabel,
        permissions,
        setPermissions,
        refreshPermissions,
        dgRole,
        sessionBacked: true,
        branding: brandingState,
        setBranding,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

/** Contexte app optionnel — utile pendant le SSR ou hors AppProvider. */
export function useAppOptional(): AppContextType | undefined {
  return useContext(AppContext);
}
