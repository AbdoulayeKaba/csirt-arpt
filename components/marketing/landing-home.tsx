'use client'

import { useMemo } from 'react'
import { CsirtMediaSection } from '@/components/csirt/csirt-media-section'
import { CsirtMissionsBanner } from '@/components/csirt/csirt-missions-banner'
import { CsirtPublicationsBoard } from '@/components/csirt/csirt-publications-board'
import { CsirtResponseSection } from '@/components/csirt/csirt-response-section'
import { CsirtSocialSection } from '@/components/csirt/csirt-social-section'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import {
  localizeHome,
  localizeNewsItems,
  localizeNewsTopics,
  localizeSocial,
  localizeVideos,
} from '@/lib/csirt/localize-public'
import type { SiteContent } from '@/lib/site/types'
import type { CsirtNewsItem } from '@/lib/csirt/home-content'

export function LandingHome({
  home,
  newsTopics,
  videos,
  social,
  newsItems,
}: {
  home: SiteContent['home']
  newsTopics: SiteContent['newsTopics']
  videos: SiteContent['videos']
  social: SiteContent['social']
  newsItems: readonly CsirtNewsItem[]
}) {
  const { language } = useCsirtLocale()

  const localizedHome = useMemo(() => localizeHome(home, language), [home, language])
  const localizedTopics = useMemo(
    () => localizeNewsTopics(newsTopics, language),
    [newsTopics, language],
  )
  const localizedNews = useMemo(
    () => localizeNewsItems(newsItems, language),
    [newsItems, language],
  )
  const localizedVideos = useMemo(() => localizeVideos(videos, language), [videos, language])
  const localizedSocial = useMemo(() => localizeSocial(social, language), [social, language])

  return (
    <>
      {home.newsEnabled ? (
        <CsirtPublicationsBoard items={localizedNews} topics={localizedTopics} />
      ) : null}
      {home.mediaEnabled ? (
        <CsirtMediaSection
          videos={localizedVideos}
          title={localizedHome.mediaTitle}
          lead={localizedHome.mediaLead}
          youtubeUrl={home.mediaYoutubeUrl}
        />
      ) : null}
      {home.responseEnabled ? <CsirtResponseSection response={localizedHome.response} /> : null}
      {home.socialEnabled ? <CsirtSocialSection items={localizedSocial} /> : null}
      {home.missionsEnabled ? <CsirtMissionsBanner missions={localizedHome.missions} /> : null}
    </>
  )
}
