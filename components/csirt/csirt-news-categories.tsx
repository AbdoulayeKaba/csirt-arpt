import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import {
  newsCategoryLabel,
  normalizeSiteNewsCategory,
  resolveNewsTopics,
  type SiteNewsTopic,
} from '@/lib/site/news-sources'
import type { CsirtNewsItem } from '@/lib/csirt/home-content'
import { cn } from '@/lib/utils'

export type NewsCategoryStat = {
  id: string
  label: string
  count: number
}

/** Toutes les rubriques du site + compteurs (0 inclus), puis orphelines éventuelles. */
export function buildNewsCategoryStats(
  items: readonly CsirtNewsItem[],
  topics?: readonly SiteNewsTopic[] | null
): NewsCategoryStat[] {
  const topicList = resolveNewsTopics(topics)
  const counts = new Map<string, number>()

  for (const item of items) {
    const id = normalizeSiteNewsCategory(item.category, topicList)
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  const fromTopics: NewsCategoryStat[] = topicList.map((topic) => ({
    id: topic.id,
    label: topic.label,
    count: counts.get(topic.id) ?? 0,
  }))

  const known = new Set(topicList.map((t) => t.id))
  const orphans: NewsCategoryStat[] = [...counts.entries()]
    .filter(([id]) => !known.has(id))
    .map(([id, count]) => ({
      id,
      label: newsCategoryLabel(id, topicList),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'))

  return [...fromTopics, ...orphans]
}

export function CsirtNewsCategories({
  categories,
  activeId,
  className,
  totalCount,
}: {
  categories: readonly NewsCategoryStat[]
  activeId?: string
  className?: string
  totalCount?: number
}) {
  if (!categories.length) return null
  const allCount =
    typeof totalCount === 'number'
      ? totalCount
      : categories.reduce((sum, c) => sum + c.count, 0)
  const showAll = typeof totalCount === 'number'

  return (
    <aside className={cn('csirt-news-cats', className)} aria-labelledby="csirt-news-cats-title">
      <h2 id="csirt-news-cats-title">Catégories</h2>
      <ul>
        {showAll ? (
          <li>
            <Link
              href="/actualites"
              className={cn(!activeId && 'is-active')}
              aria-current={!activeId ? 'page' : undefined}
            >
              <span className="csirt-news-cats__label">
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                Toutes
              </span>
              <em>{allCount}</em>
            </Link>
          </li>
        ) : null}
        {categories.map((cat) => {
          const active = activeId === cat.id
          return (
            <li key={cat.id} className={cn(cat.count === 0 && 'is-empty')}>
              <Link
                href={`/actualites?categorie=${encodeURIComponent(cat.id)}`}
                className={cn(active && 'is-active')}
                aria-current={active ? 'page' : undefined}
              >
                <span className="csirt-news-cats__label">
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  {cat.label}
                </span>
                <em>{cat.count}</em>
              </Link>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
