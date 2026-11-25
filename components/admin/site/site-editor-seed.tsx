'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { SiteContent } from '@/lib/site/types'

const SiteEditorSeedContext = createContext<SiteContent | null>(null)

export function SiteEditorSeedProvider({
  initialSite,
  children,
}: {
  initialSite: SiteContent
  children: ReactNode
}) {
  return (
    <SiteEditorSeedContext.Provider value={initialSite}>
      {children}
    </SiteEditorSeedContext.Provider>
  )
}

export function useSiteEditorSeed() {
  return useContext(SiteEditorSeedContext)
}
