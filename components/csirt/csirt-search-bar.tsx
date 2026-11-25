'use client'

import { ArrowRight, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FormEvent, useCallback, useMemo, useState } from 'react'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import { CSIRT_SEARCH_TOPICS } from '@/lib/csirt/public-i18n'
import type { SiteSearchSuggestion } from '@/lib/site/types'
import { cn } from '@/lib/utils'

export type CsirtSearchBarConfig = {
  eyebrow?: string
  title?: string
  placeholder?: string
  submitLabel?: string
  suggestionsLabel?: string
  suggestions?: SiteSearchSuggestion[]
}

export function CsirtSearchBar({
  variant = 'standalone',
  className,
  config,
}: {
  variant?: 'hero' | 'standalone'
  className?: string
  config?: CsirtSearchBarConfig | null
}) {
  const router = useRouter()
  const { language, t } = useCsirtLocale()
  const [query, setQuery] = useState('')
  const [activeChip, setActiveChip] = useState<string | null>(null)

  const useCms = Boolean(config) && language === 'fr'

  const eyebrow = (useCms && config?.eyebrow?.trim()) || t('searchEyebrow')
  const title = (useCms && config?.title?.trim()) || t('searchTitle')
  const placeholder = (useCms && config?.placeholder?.trim()) || t('searchPlaceholder')
  const submitLabel = (useCms && config?.submitLabel?.trim()) || t('searchSubmit')
  const suggestionsLabel =
    (useCms && config?.suggestionsLabel?.trim()) || t('searchSuggestions')

  const suggestions = useMemo(() => {
    if (useCms && config?.suggestions?.length) {
      const live = config.suggestions.filter((item) => item.archived !== true)
      if (live.length) {
        return live.map((item) => ({
          id: item.id,
          label: item.label,
          query: item.query,
          href: item.href,
        }))
      }
    }
    return CSIRT_SEARCH_TOPICS.map((topic) => ({
      id: topic.key,
      label: t(topic.key),
      query: topic.query[language],
      href: undefined as string | undefined,
    }))
  }, [config?.suggestions, language, t, useCms])

  const goSearch = useCallback(
    (value: string) => {
      const q = value.trim()
      router.push(q ? `/recherche?q=${encodeURIComponent(q)}` : '/recherche')
    },
    [router]
  )

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    goSearch(query)
  }

  const onChipClick = (item: { label: string; query: string; href?: string }) => {
    setActiveChip(item.label)
    if (item.href?.trim()) {
      setQuery('')
      router.push(item.href.trim())
      return
    }
    setQuery(item.query)
    goSearch(item.query)
  }

  const isHero = variant === 'hero'

  return (
    <section
      className={cn('csirt-search', isHero && 'csirt-search--hero', className)}
      aria-label={t('searchAria')}
    >
      <div className="csirt-search__glow" aria-hidden />
      <div className="csirt-search__inner">
        <header className="csirt-search__head">
          <p className="csirt-search__eyebrow">{eyebrow}</p>
          <span className="csirt-search__tricolor" aria-hidden />
          <h2 className="csirt-search__title">{title}</h2>
        </header>

        <div className="csirt-search__panel">
          <form className="csirt-search__form" onSubmit={onSubmit} role="search">
            <label
              className="sr-only"
              htmlFor={isHero ? 'csirt-hero-search-input' : 'csirt-site-search'}
            >
              {t('searchLabel')}
            </label>
            <div className="csirt-search__combo">
              <Search className="csirt-search__combo-icon h-4 w-4" aria-hidden />
              <input
                id={isHero ? 'csirt-hero-search-input' : 'csirt-site-search'}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActiveChip(null)
                }}
                placeholder={placeholder}
                autoComplete="off"
                enterKeyHint="search"
              />
              <button type="submit" className="csirt-search__submit" aria-label={t('searchSubmitAria')}>
                <span className="csirt-search__submit-label">{submitLabel}</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </form>

          {suggestions.length > 0 ? (
            <div className="csirt-search__topics" role="group" aria-label={t('searchSuggestionsAria')}>
              <span className="csirt-search__topics-label">{suggestionsLabel}</span>
              <ul className="csirt-search__chips">
                {suggestions.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`csirt-search__chip${activeChip === item.label ? ' is-active' : ''}`}
                      onClick={() => onChipClick(item)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
