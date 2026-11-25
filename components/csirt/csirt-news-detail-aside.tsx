'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, Bell, Mail } from 'lucide-react'
import { CsirtNewsletterModal } from '@/components/csirt/csirt-newsletter-modal'

export type NewsDetailRelated = {
  id: string
  href: string
  title: string
  dateLabel: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function CsirtNewsDetailAside({
  related,
}: {
  related: readonly NewsDetailRelated[]
}) {
  const [email, setEmail] = useState('')
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)

  function subscribe(event: FormEvent) {
    event.preventDefault()
    if (!EMAIL_PATTERN.test(email.trim())) return
    setOpen(true)
  }

  return (
    <aside className="csirt-news-article__aside" aria-label="Suite de lecture">
      <section className="csirt-news-follow" aria-labelledby="csirt-news-follow-title">
        <h2 id="csirt-news-follow-title">S’abonner</h2>
        <p>Recevez les alertes et publications du CSIRT-ARPT dès leur publication.</p>
        {done ? (
          <p className="csirt-news-follow__done" role="status">
            <Bell size={16} aria-hidden />
            Inscription enregistrée.
          </p>
        ) : (
          <form className="csirt-news-follow__form" onSubmit={subscribe}>
            <label className="sr-only" htmlFor="news-detail-email">
              Adresse e-mail
            </label>
            <span>
              <Mail size={15} aria-hidden />
              <input
                id="news-detail-email"
                type="email"
                required
                autoComplete="email"
                placeholder="Votre adresse e-mail"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </span>
            <button type="submit">
              S’abonner
              <ArrowRight size={15} aria-hidden />
            </button>
          </form>
        )}
        <CsirtNewsletterModal
          open={open}
          onOpenChange={setOpen}
          initialEmail={email}
          onSubscribed={() => {
            setDone(true)
            setOpen(false)
          }}
        />
      </section>

      {related.length > 0 ? (
        <section className="csirt-news-follow csirt-news-follow--related" aria-labelledby="csirt-news-related-title">
          <h2 id="csirt-news-related-title">Dans le même sujet</h2>
          <ul>
            {related.map((row) => (
              <li key={row.id}>
                <Link href={row.href}>
                  <strong>{row.title}</strong>
                  {row.dateLabel ? <span>{row.dateLabel}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  )
}
