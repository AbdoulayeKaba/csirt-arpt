/**
 * Réinjecte les sources de veille par défaut dans le site public persisté.
 */
import { DEFAULT_NEWS_SOURCES, DEFAULT_NEWS_TOPICS } from '@/lib/site/news-sources'
import { getSiteContent, saveSiteContent } from '@/lib/site/store'
import { SITE_CONTENT_KEY } from '@/lib/site/types'
import { getPlatformSettingValue } from '@/lib/services/platform-settings-store'

async function main() {
  const raw = await getPlatformSettingValue(SITE_CONTENT_KEY)
  const site = await getSiteContent()
  const persistedEmpty =
    !raw ||
    (() => {
      try {
        const parsed = JSON.parse(raw) as { newsSources?: unknown[] }
        return !Array.isArray(parsed.newsSources) || parsed.newsSources.length === 0
      } catch {
        return true
      }
    })()

  if (!persistedEmpty && (site.newsSources?.length ?? 0) > 0) {
    console.log(`Sources déjà en base : ${site.newsSources.length} — aucune modification.`)
    return
  }

  const next = {
    ...site,
    newsTopics: site.newsTopics?.length ? site.newsTopics : [...DEFAULT_NEWS_TOPICS],
    newsSources: DEFAULT_NEWS_SOURCES.map((s) => ({ ...s })),
  }
  await saveSiteContent(next)
  console.log(`Sources restaurées en base : ${next.newsSources.length}`)
  for (const s of next.newsSources) {
    console.log(`  - ${s.name} (${s.type}) · ${s.url}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
