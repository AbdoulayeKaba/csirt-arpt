import type { ReactNode } from 'react'
import { CsirtPublicShell } from '@/components/csirt/csirt-public-shell'

export async function CsirtInnerPage({
  children,
  variant = 'article',
  showNewsletterCta = true,
}: {
  children: ReactNode
  variant?: 'article' | 'full'
  showNewsletterCta?: boolean
}) {
  return (
    <CsirtPublicShell showNewsletterCta={showNewsletterCta}>
      {variant === 'full' ? children : <article className="csirt-page">{children}</article>}
    </CsirtPublicShell>
  )
}
