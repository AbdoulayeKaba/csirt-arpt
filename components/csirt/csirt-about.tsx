'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CsirtInlineField } from '@/components/csirt/csirt-inline-field'
import { DEFAULT_ABOUT_CONTENT } from '@/lib/site/about-defaults'
import type { SiteAboutContent, SiteAboutPair, SiteAboutText } from '@/lib/site/types'
import { cn } from '@/lib/utils'
import '@/components/csirt/csirt-about.css'

function indexLabel(index: number) {
  return String(index + 1).padStart(2, '0')
}

export type CsirtAboutPageProps = {
  content?: SiteAboutContent | null
  editable?: boolean
  disabled?: boolean
  onContentChange?: (next: SiteAboutContent) => void
}

export function CsirtAboutPage({
  content,
  editable = false,
  disabled = false,
  onContentChange,
}: CsirtAboutPageProps = {}) {
  const data = content ?? DEFAULT_ABOUT_CONTENT
  const canEdit = editable && Boolean(onContentChange) && !disabled

  const patch = (partial: Partial<SiteAboutContent>) => {
    onContentChange?.({ ...data, ...partial })
  }

  const patchPair = (key: 'plateRows' | 'facts', index: number, partial: Partial<SiteAboutPair>) => {
    patch({
      [key]: data[key].map((item, i) => (i === index ? { ...item, ...partial } : item)),
    })
  }

  const patchText = (key: 'missions' | 'steps' | 'engagements', index: number, partial: Partial<SiteAboutText>) => {
    patch({
      [key]: data[key].map((item, i) => (i === index ? { ...item, ...partial } : item)),
    })
  }

  const field = (
    value: string,
    onChange: ((value: string) => void) | undefined,
    options?: { as?: 'span' | 'p' | 'strong' | 'h1' | 'h2'; multiline?: boolean; className?: string; id?: string }
  ) => (
    <CsirtInlineField
      id={options?.id}
      className={options?.className}
      as={options?.as}
      multiline={options?.multiline}
      value={value}
      disabled={disabled}
      onChange={canEdit ? onChange : undefined}
    />
  )

  const leadWords = data.titleLead.split(/\s+/).filter(Boolean)

  return (
    <div className={cn('csirt-about', editable && 'csirt-about--editable')}>
      <header className="csirt-about__hero">
        <div className="csirt-about__hero-inner">
          <div className="csirt-about__hero-copy">
            <nav className="csirt-about__crumb" aria-label="Fil d’Ariane">
              <Link href="/">Accueil</Link>
              <span aria-hidden>/</span>
              <Link href="/csirt-arpt">{data.plateName || 'CSIRT-ARPT'}</Link>
              <span aria-hidden>/</span>
              <strong>{field(data.crumbLabel, (value) => patch({ crumbLabel: value }))}</strong>
            </nav>
            <p className="csirt-about__eyebrow">
              {field(data.eyebrow, (value) => patch({ eyebrow: value }))}
            </p>
            <h1>
              {canEdit ? (
                <>
                  {field(data.titleLead, (value) => patch({ titleLead: value }), { className: 'csirt-about__edit-title' })}
                  {field(data.titleAccent, (value) => patch({ titleAccent: value }), { className: 'csirt-about__edit-accent' })}
                </>
              ) : (
                <>
                  {leadWords.map((word, index) => (
                    <span key={`${word}-${index}`} className="csirt-about__word">
                      {word}
                    </span>
                  ))}
                  <span className="csirt-about__word is-accent">{data.titleAccent}</span>
                </>
              )}
            </h1>
            <div className="csirt-about__actions">
              {canEdit ? (
                <>
                  <span className="is-primary csirt-about__edit-action">
                    {field(data.primaryLabel, (value) => patch({ primaryLabel: value }))}
                    {field(data.primaryHref, (value) => patch({ primaryHref: value }), { className: 'csirt-about__edit-href' })}
                  </span>
                  <span className="is-ghost csirt-about__edit-action">
                    {field(data.secondaryLabel, (value) => patch({ secondaryLabel: value }))}
                    {field(data.secondaryHref, (value) => patch({ secondaryHref: value }), { className: 'csirt-about__edit-href' })}
                  </span>
                </>
              ) : (
                <>
                  <Link href={data.primaryHref || '/signalement'} className="is-primary">
                    {data.primaryLabel}
                  </Link>
                  <a href={data.secondaryHref || '#missions'} className="is-ghost">
                    {data.secondaryLabel}
                  </a>
                </>
              )}
            </div>
          </div>

          <aside className="csirt-about__plate" aria-label="Identité institutionnelle">
            <p>{field(data.plateKicker, (value) => patch({ plateKicker: value }))}</p>
            <strong>{field(data.plateName, (value) => patch({ plateName: value }))}</strong>
            <span>{field(data.plateSubtitle, (value) => patch({ plateSubtitle: value }))}</span>
            <dl>
              {data.plateRows.map((row, index) => (
                <div key={`plate-${index}`}>
                  <dt>{field(row.label, (value) => patchPair('plateRows', index, { label: value }))}</dt>
                  <dd>{field(row.value, (value) => patchPair('plateRows', index, { value: value }))}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>

        <ul className="csirt-about__facts" aria-label="Repères institutionnels">
          {data.facts.map((fact, index) => (
            <li key={`fact-${index}`}>
              <small>
                {indexLabel(index)}
                <span>{field(fact.label, (value) => patchPair('facts', index, { label: value }))}</span>
              </small>
              <strong>{field(fact.value, (value) => patchPair('facts', index, { value: value }))}</strong>
            </li>
          ))}
        </ul>
      </header>

      <section className="csirt-about__mission" aria-labelledby="about-mission">
        <div className="csirt-about__mission-copy">
          <p className="csirt-about__kicker">
            {field(data.missionKicker, (value) => patch({ missionKicker: value }))}
          </p>
          {field(data.missionTitle, (value) => patch({ missionTitle: value }), { as: 'h2', id: 'about-mission' })}
          {field(data.missionBody, (value) => patch({ missionBody: value }), { as: 'p', multiline: true })}
        </div>
        <div className="csirt-about__notes">
          <article>
            <h3>{field(data.visionTitle, (value) => patch({ visionTitle: value }))}</h3>
            {field(data.visionBody, (value) => patch({ visionBody: value }), { as: 'p', multiline: true })}
          </article>
          <article>
            <h3>{field(data.valuesTitle, (value) => patch({ valuesTitle: value }))}</h3>
            {field(data.valuesBody, (value) => patch({ valuesBody: value }), { as: 'p', multiline: true })}
          </article>
        </div>
      </section>

      <section className="csirt-about__missions" id="missions" aria-labelledby="about-missions">
        <header>
          <p className="csirt-about__kicker">
            {field(data.missionsKicker, (value) => patch({ missionsKicker: value }))}
          </p>
          {field(data.missionsTitle, (value) => patch({ missionsTitle: value }), { as: 'h2', id: 'about-missions' })}
        </header>
        <ol>
          {data.missions.map((item, index) => (
            <li key={`mission-${index}`}>
              <em>{indexLabel(index)}</em>
              <div>
                <h3>{field(item.title, (value) => patchText('missions', index, { title: value }))}</h3>
                {field(item.body, (value) => patchText('missions', index, { body: value }), { as: 'p', multiline: true })}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="csirt-about__flow" aria-labelledby="about-flow">
        <header>
          <p className="csirt-about__kicker">
            {field(data.flowKicker, (value) => patch({ flowKicker: value }))}
          </p>
          {field(data.flowTitle, (value) => patch({ flowTitle: value }), { as: 'h2', id: 'about-flow' })}
          {field(data.flowLead, (value) => patch({ flowLead: value }), { as: 'p', multiline: true })}
        </header>
        <ol>
          {data.steps.map((step, index) => (
            <li key={`step-${index}`}>
              <em>{indexLabel(index)}</em>
              <strong>{field(step.title, (value) => patchText('steps', index, { title: value }))}</strong>
              {field(step.body, (value) => patchText('steps', index, { body: value }), { as: 'p', multiline: true })}
            </li>
          ))}
        </ol>
      </section>

      <section className="csirt-about__team" id="gouvernance" aria-labelledby="about-team">
        <div className="csirt-about__team-copy">
          <p className="csirt-about__kicker">
            {field(data.teamKicker, (value) => patch({ teamKicker: value }))}
          </p>
          {field(data.teamTitle, (value) => patch({ teamTitle: value }), { as: 'h2', id: 'about-team' })}
          {field(data.teamBody, (value) => patch({ teamBody: value }), { as: 'p', multiline: true })}
          {canEdit ? (
            <span className="csirt-about__edit-action">
              {field(data.teamLinkLabel, (value) => patch({ teamLinkLabel: value }))}
              {field(data.teamLinkHref, (value) => patch({ teamLinkHref: value }), { className: 'csirt-about__edit-href' })}
            </span>
          ) : (
            <Link href={data.teamLinkHref || '/historique'}>
              {data.teamLinkLabel}
              <ArrowRight aria-hidden />
            </Link>
          )}
        </div>
        <div className="csirt-about__engagements">
          {field(data.engagementsTitle, (value) => patch({ engagementsTitle: value }), { as: 'h2' })}
          <ol>
            {data.engagements.map((item, index) => (
              <li key={`engagement-${index}`}>
                <em>{indexLabel(index)}</em>
                <div>
                  <h3>{field(item.title, (value) => patchText('engagements', index, { title: value }))}</h3>
                  {field(item.body, (value) => patchText('engagements', index, { body: value }), { as: 'p', multiline: true })}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  )
}
