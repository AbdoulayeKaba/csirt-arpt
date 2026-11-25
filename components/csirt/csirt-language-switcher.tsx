'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { GuineaFlag, UkFlag } from '@/components/csirt/csirt-flag-icons'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import type { Language } from '@/lib/types'

type Props = {
  className?: string
  id?: string
}

const LANG_OPTIONS: {
  lang: Language
  Flag: typeof GuineaFlag
  code: string
  key: 'languageFr' | 'languageEn'
}[] = [
  { lang: 'fr', Flag: GuineaFlag, code: 'FR', key: 'languageFr' },
  { lang: 'en', Flag: UkFlag, code: 'EN', key: 'languageEn' },
]

export function CsirtLanguageSwitcher({ className, id }: Props) {
  const { language, setLanguage, t } = useCsirtLocale()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listboxId = id ? `csirt-lang-listbox-${id}` : 'csirt-lang-listbox'
  const selected = LANG_OPTIONS.find((item) => item.lang === language) ?? LANG_OPTIONS[0]

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const pick = (lang: Language) => {
    setLanguage(lang)
    setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={className ? `csirt-lang-combo ${className}` : 'csirt-lang-combo'}
    >
      <button
        type="button"
        className={open ? 'csirt-lang-combo__trigger is-open' : 'csirt-lang-combo__trigger'}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={t('language')}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="csirt-lang-combo__current">
          <span className="csirt-lang-combo__flag">
            <selected.Flag className="csirt-lang-combo__svg" />
          </span>
          <span className="csirt-lang-combo__code">{selected.code}</span>
        </span>
        <ChevronDown className="csirt-lang-combo__chevron h-3.5 w-3.5" aria-hidden />
      </button>

      {open ? (
        <ul id={listboxId} className="csirt-lang-combo__menu" role="listbox" aria-label={t('language')}>
          {LANG_OPTIONS.map(({ lang, Flag, code, key }) => {
            const active = language === lang
            return (
              <li key={lang} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={active ? 'csirt-lang-combo__option is-active' : 'csirt-lang-combo__option'}
                  lang={lang}
                  onClick={() => pick(lang)}
                >
                  <span className="csirt-lang-combo__flag">
                    <Flag className="csirt-lang-combo__svg" />
                  </span>
                  <span className="csirt-lang-combo__label">{t(key)}</span>
                  <span className="csirt-lang-combo__code">{code}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
