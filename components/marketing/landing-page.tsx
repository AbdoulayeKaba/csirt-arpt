import { LandingHome } from '@/components/marketing/landing-home'
import { CsirtPublicShell } from '@/components/csirt/csirt-public-shell'
import { getPublicSiteSnapshot } from '@/lib/site/public-snapshot'

export async function LandingPage() {
  const site = await getPublicSiteSnapshot()

  return (
    <CsirtPublicShell showFloating showNewsletterCta={false}>
      <LandingHome
        home={site.home}
        newsTopics={site.newsTopics}
        videos={site.videos}
        social={site.social}
        newsItems={site.newsCards}
      />
    </CsirtPublicShell>
  )
}
