import type { Language } from './types';

/** Textes encore lus par la console. Le site public utilise son propre dictionnaire. */
export const translations = {
  common: {
    loading: { fr: 'Chargement...', en: 'Loading...' },
  },
  auth: {
    logout: { fr: 'Déconnexion', en: 'Logout' },
  },
  header: {
    platform: { fr: 'CSIRT-ARPT', en: 'CSIRT-ARPT' },
  },
} as const;

export function t(key: string, lang: Language): string {
  const keys = key.split('.');
  let value: unknown = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  
  if (value && typeof value === 'object' && lang in value) {
    return (value as Record<string, string>)[lang];
  }
  
  return key;
}
