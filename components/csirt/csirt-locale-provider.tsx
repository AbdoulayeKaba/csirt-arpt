'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  CSIRT_LOCALE_STORAGE_KEY,
  csirtT,
  type CsirtPublicI18nKey,
} from '@/lib/csirt/public-i18n'
import type { Language } from '@/lib/types'

type CsirtLocaleContextValue = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: CsirtPublicI18nKey) => string
}

const CsirtLocaleContext = createContext<CsirtLocaleContextValue | null>(null)

function readStoredLocale(): Language {
  if (typeof window === 'undefined') return 'fr'
  try {
    const stored = window.localStorage.getItem(CSIRT_LOCALE_STORAGE_KEY)
    return stored === 'en' ? 'en' : 'fr'
  } catch {
    return 'fr'
  }
}

export function CsirtLocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr')

  useEffect(() => {
    setLanguageState(readStoredLocale())
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    try {
      window.localStorage.setItem(CSIRT_LOCALE_STORAGE_KEY, language)
    } catch {
      /* ignore quota / private mode */
    }
  }, [language])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
  }, [])

  const value = useMemo<CsirtLocaleContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => csirtT(key, language),
    }),
    [language, setLanguage]
  )

  return <CsirtLocaleContext.Provider value={value}>{children}</CsirtLocaleContext.Provider>
}

const defaultFallbackContext: CsirtLocaleContextValue = {
  language: 'fr',
  setLanguage: () => {},
  t: (key) => csirtT(key, 'fr'),
}

export function useCsirtLocale(): CsirtLocaleContextValue {
  const ctx = useContext(CsirtLocaleContext)
  return ctx ?? defaultFallbackContext
}
