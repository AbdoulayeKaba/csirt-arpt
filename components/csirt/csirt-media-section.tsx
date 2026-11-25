'use client'

import { useMemo, useState } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink, Play, Youtube } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isDirectVideoFile, isPlayableVideoHref, toVideoEmbedUrl } from '@/lib/site/video-embed'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import { ARPT_YOUTUBE_URL, CSIRT_VIDEOS, publishableVideos, type CsirtVideo } from '@/lib/csirt/home-content'
import { cn } from '@/lib/utils'

function resolvePlayableVideos(videos: readonly CsirtVideo[]): CsirtVideo[] {
  const source = publishableVideos(videos.length ? videos : CSIRT_VIDEOS)
  const pool = source.length ? source : publishableVideos(CSIRT_VIDEOS)
  return pool.map((video, index) => {
    if (isPlayableVideoHref(video.href)) return video
    const byId = CSIRT_VIDEOS.find((item) => item.id === video.id)
    const byIndex = CSIRT_VIDEOS[index]
    const href = byId?.href || byIndex?.href || video.href
    return { ...video, href }
  })
}

function VideoCard({
  video,
  index,
  onOpen,
  videoTag,
  watchLabel,
}: {
  video: CsirtVideo
  index: number
  onOpen: () => void
  videoTag: string
  watchLabel: string
}) {
  return (
    <button type="button" className="csirt-media-rail__card" onClick={onOpen}>
      <span className="csirt-media-rail__visual">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={video.image} alt="" />
        <span className="csirt-media-rail__shade" aria-hidden />
        <span className="csirt-media-rail__num" aria-hidden>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="csirt-media-play" aria-hidden>
          <Play className="h-5 w-5" fill="currentColor" />
        </span>
        <span className="csirt-media-time">{video.duration}</span>
      </span>
      <span className="csirt-media-rail__body">
        <span className="csirt-media-rail__tag">{videoTag}</span>
        <strong>{video.title}</strong>
        <span className="csirt-media-rail__cta">
          {watchLabel}
          <Play className="h-3.5 w-3.5" aria-hidden />
        </span>
      </span>
    </button>
  )
}

export function CsirtMediaSection({
  videos = CSIRT_VIDEOS,
  title = 'Médiathèque',
  lead = 'Retrouvez nos vidéos, reportages et interventions en ligne.',
  youtubeUrl = ARPT_YOUTUBE_URL,
}: {
  videos?: readonly CsirtVideo[]
  title?: string
  lead?: string
  youtubeUrl?: string
}) {
  const { t } = useCsirtLocale()
  const list = useMemo(() => resolvePlayableVideos(videos), [videos])
  const [playing, setPlaying] = useState<CsirtVideo | null>(null)
  const [reverse, setReverse] = useState(false)
  const canMarquee = list.length > 1

  return (
    <section className="csirt-media" aria-labelledby="csirt-media-title">
      <div className="csirt-media__inner">
        <header className="csirt-media__head">
          <div className="csirt-media__head-copy">
            <p className="csirt-media__kicker">{t('mediaKicker')}</p>
            <h2 id="csirt-media-title">{title}</h2>
            <p className="csirt-media__lead">{lead}</p>
          </div>
          <div className="csirt-media__head-actions">
            <a
              href={youtubeUrl}
              className="csirt-media__youtube"
              target="_blank"
              rel="noreferrer"
            >
              <Youtube className="h-4 w-4" aria-hidden />
              {t('mediaYoutube')}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
            <div className="csirt-media-rail__nav">
              <button
                type="button"
                className="csirt-media-rail__arrow"
                aria-label={t('mediaScrollLeft')}
                disabled={!canMarquee}
                onClick={() => setReverse(true)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="csirt-media-rail__arrow"
                aria-label={t('mediaScrollRight')}
                disabled={!canMarquee}
                onClick={() => setReverse(false)}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <div
          className={cn(
            'csirt-media-rail',
            playing && 'is-paused',
            !canMarquee && 'is-static'
          )}
        >
          <div className="csirt-media-rail__viewport">
            <ul
              className={cn(
                'csirt-media-rail__track',
                reverse && 'is-reverse'
              )}
            >
              {list.map((video, index) => (
                <li key={`${video.id}-a`}>
                  <VideoCard
                    video={video}
                    index={index}
                    onOpen={() => setPlaying(video)}
                    videoTag={t('mediaVideoTag')}
                    watchLabel={t('mediaWatchNow')}
                  />
                </li>
              ))}
              {canMarquee
                ? list.map((video, index) => (
                    <li key={`${video.id}-b`} aria-hidden>
                      <VideoCard
                        video={video}
                        index={index}
                        onOpen={() => setPlaying(video)}
                        videoTag={t('mediaVideoTag')}
                        watchLabel={t('mediaWatchNow')}
                      />
                    </li>
                  ))
                : null}
            </ul>
          </div>
        </div>
      </div>

      <CsirtVideoModal
        video={playing}
        open={Boolean(playing)}
        onOpenChange={(open) => {
          if (!open) setPlaying(null)
        }}
        t={t}
      />
    </section>
  )
}

export function CsirtVideoModal({
  video,
  open,
  onOpenChange,
  t,
}: {
  video: CsirtVideo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  t: (key: import('@/lib/csirt/public-i18n').CsirtPublicI18nKey) => string
}) {
  const href = video?.href?.trim() || ''
  const embedUrl = useMemo(() => (href ? toVideoEmbedUrl(href, true) : null), [href])
  const isFile = href ? isDirectVideoFile(href) : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="csirt-media-modal" showCloseButton>
        <DialogHeader className="csirt-media-modal__head">
          <DialogTitle>{video?.title || t('mediaModalTitle')}</DialogTitle>
          <DialogDescription className="csirt-media-modal__meta">
            {video?.duration ? `${t('mediaModalDuration')} ${video.duration}` : t('mediaModalLead')}
          </DialogDescription>
        </DialogHeader>

        <div className="csirt-media-modal__stage">
          {embedUrl ? (
            <iframe
              key={embedUrl}
              src={embedUrl}
              title={video?.title || t('mediaModalTitle')}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : isFile ? (
            <video
              key={href}
              src={href}
              controls
              autoPlay
              playsInline
              poster={video?.image}
            >
              {t('mediaUnsupported')}
            </video>
          ) : (
            <div className="csirt-media-modal__fallback">
              {video?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={video.image} alt="" />
              ) : null}
              <div className="csirt-media-modal__fallback-body">
                <p>{t('mediaEmbedError')}</p>
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer" className="csirt-media-modal__ext">
                    {t('mediaOpenVideo')}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {href && (embedUrl || isFile) ? (
          <div className="csirt-media-modal__footer">
            <a href={href} target="_blank" rel="noreferrer">
              {t('mediaOpenSource')}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
