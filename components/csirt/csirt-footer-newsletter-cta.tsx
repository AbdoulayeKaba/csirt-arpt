'use client'

import { ArrowUpRight, BellRing } from 'lucide-react'
import { CsirtNewsletterModal } from '@/components/csirt/csirt-newsletter-modal'

type Props = {
  title: string
  lead: string
  label: string
}

export function CsirtFooterNewsletterCta({ title, lead, label }: Props) {
  return (
    <div className="csirt-footer-cta">
      <div className="csirt-footer-cta-copy">
        <span className="csirt-footer-cta-icon" aria-hidden>
          <BellRing className="h-4 w-4" />
        </span>
        <div>
          <p>{title}</p>
          <small>{lead}</small>
        </div>
      </div>
      <CsirtNewsletterModal
        trigger={
          <button type="button" className="csirt-footer-report">
            {label}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </button>
        }
      />
    </div>
  )
}
