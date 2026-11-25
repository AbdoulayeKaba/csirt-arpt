'use client'

import Link from 'next/link'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import { CSIRT_ACTION_LINKS, type CsirtActionLink } from '@/lib/csirt/home-content'

export function CsirtActionBar({ links }: { links?: readonly CsirtActionLink[] }) {
  const { t } = useCsirtLocale()
  const items = (links ?? CSIRT_ACTION_LINKS).filter((item) => item.archived !== true)
  if (!items.length) return null

  return (
    <nav className="csirt-actionbar" aria-label={t('actionBarAria')}>
      <ul className="csirt-actionbar-links">
        {items.map((item) => (
          <li key={item.id || `${item.href}-${item.label}`}>
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
