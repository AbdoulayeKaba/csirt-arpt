'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { ChevronLeft, ChevronRight, Send, X } from 'lucide-react'
import {
  answerAssistantQuery,
  answerById,
  answerFromConfig,
  buildDefaultAssistantConfig,
  CSIRT_ASSISTANT_SUGGESTIONS,
  type AssistantAnswer,
  type AssistantConfig,
  type AssistantScope,
  type AssistantSuggestion,
  listPublishedSuggestions,
} from '@/lib/csirt/assistant'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
  links?: AssistantAnswer['links']
}

function HelpSuggestionRail({
  pending,
  onAsk,
  suggestions,
}: {
  pending: boolean
  onAsk: (suggestion: AssistantSuggestion) => void
  suggestions: readonly AssistantSuggestion[]
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({
    pointerId: -1,
    originX: 0,
    originScroll: 0,
    moved: false,
  })
  const lastAskAtRef = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [paused, setPaused] = useState(false)
  const looping = suggestions.length > 1
  const railItems = looping ? [...suggestions, ...suggestions] : [...suggestions]

  const fireAsk = useCallback(
    (suggestion: AssistantSuggestion) => {
      if (pending) return
      const now = Date.now()
      if (now - lastAskAtRef.current < 350) return
      lastAskAtRef.current = now
      onAsk(suggestion)
    },
    [onAsk, pending]
  )

  const wrapScroll = useCallback(() => {
    const track = trackRef.current
    if (!track || !looping) return
    const loopAt = track.scrollWidth / 2
    if (loopAt <= 0) return
    if (track.scrollLeft >= loopAt) track.scrollLeft -= loopAt
    if (track.scrollLeft < 0) track.scrollLeft += loopAt
  }, [looping])

  const cardStep = useCallback(() => {
    const track = trackRef.current
    const card = track?.querySelector<HTMLElement>('.csirt-help-suggest-card')
    if (!track || !card) return 180
    const styles = window.getComputedStyle(track)
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 8
    return card.getBoundingClientRect().width + gap
  }, [])

  const scrollByCards = useCallback(
    (direction: -1 | 1) => {
      const track = trackRef.current
      if (!track) return
      track.scrollLeft += direction * cardStep()
      wrapScroll()
    },
    [cardStep, wrapScroll],
  )

  const snapToCard = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const step = cardStep()
    const index = Math.round(track.scrollLeft / step)
    track.scrollLeft = Math.max(0, index * step)
    wrapScroll()
  }, [cardStep, wrapScroll])

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || dragging || paused) return

    const speedPxPerSec = 110
    let frame = 0
    let last = performance.now()

    const tick = (now: number) => {
      const track = trackRef.current
      const delta = Math.min(now - last, 48)
      last = now
      if (track) {
        track.scrollLeft += (speedPxPerSec * delta) / 1000
        wrapScroll()
      }
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [dragging, paused, wrapScroll])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      event.preventDefault()
      track.scrollLeft += event.deltaY
      wrapScroll()
    }
    track.addEventListener('wheel', onWheel, { passive: false })
    return () => track.removeEventListener('wheel', onWheel)
  }, [wrapScroll])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const track = trackRef.current
    if (!track) return
    dragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originScroll: track.scrollLeft,
      moved: false,
    }
    // Ne pas capturer tout de suite : un clic simple doit atteindre la carte.
    setPaused(true)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const track = trackRef.current
    if (!track || drag.pointerId !== event.pointerId) return
    const delta = event.clientX - drag.originX
    if (!drag.moved && Math.abs(delta) > 8) {
      drag.moved = true
      track.setPointerCapture(event.pointerId)
      setDragging(true)
    }
    if (!drag.moved) return
    event.preventDefault()
    track.scrollLeft = drag.originScroll - delta
    wrapScroll()
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (drag.pointerId !== event.pointerId) return
    const wasDragging = drag.moved
    drag.pointerId = -1
    setDragging(false)
    if (wasDragging) snapToCard()
  }

  const onCardClick = (
    event: MouseEvent<HTMLButtonElement>,
    suggestion: AssistantSuggestion
  ) => {
    // Ignore le faux clic généré après un drag horizontal.
    if (dragRef.current.moved) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    event.preventDefault()
    event.stopPropagation()
    fireAsk(suggestion)
  }

  const onCardPointerUp = (
    event: PointerEvent<HTMLButtonElement>,
    suggestion: AssistantSuggestion
  ) => {
    if (event.button !== 0) return
    if (dragRef.current.moved) return
    // Déclenche immédiatement la question (plus fiable que click après capture).
    event.preventDefault()
    event.stopPropagation()
    fireAsk(suggestion)
  }

  if (suggestions.length === 0) return null

  return (
    <div
      className="csirt-help-suggest"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false)
        }
      }}
    >
      <div className="csirt-help-suggest-bar">
        <span>Suggestions rapides</span>
        <div className="csirt-help-suggest-tools">
          <span>{suggestions.length} actions</span>
          <div className="csirt-help-suggest-nav">
            <button
              type="button"
              className="csirt-help-suggest-arrow"
              aria-label="Suggestions précédentes"
              onClick={() => scrollByCards(-1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              className="csirt-help-suggest-arrow"
              aria-label="Suggestions suivantes"
              onClick={() => scrollByCards(1)}
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
      <div className="csirt-help-suggest-scroller has-prev has-next">
        <div
          ref={trackRef}
          className={
            dragging
              ? 'csirt-help-suggest-track is-dragging is-auto'
              : 'csirt-help-suggest-track is-auto'
          }
          role="list"
          aria-label="Suggestions rapides"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        >
          {railItems.map((suggestion, index) => (
            <button
              key={`${suggestion.id}-${index}`}
              type="button"
              role="listitem"
              className="csirt-help-suggest-card"
              disabled={pending}
              onPointerUp={(event) => onCardPointerUp(event, suggestion)}
              onClick={(event) => onCardClick(event, suggestion)}
            >
              <span className="csirt-help-suggest-n">
                {(index % suggestions.length) + 1}
              </span>
              <span className="csirt-help-suggest-label">{suggestion.label}</span>
              <ChevronRight className="csirt-help-suggest-chevron" aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function resolveSuggestionAnswer(
  suggestion: AssistantSuggestion,
  config: AssistantConfig | null,
  scope: AssistantScope
): AssistantAnswer {
  if (suggestion.answerText?.trim()) {
    return { text: suggestion.answerText, links: suggestion.links }
  }
  if (config) {
    const byId = answerById(config, scope, suggestion.id)
    if (byId) return byId
  }
  return answerAssistantQuery(suggestion.query || suggestion.label, scope)
}

export function CsirtHelpDialog({
  open,
  onClose,
  children,
  scope = 'site',
  welcome: welcomeProp,
  suggestions: suggestionsProp,
}: {
  open: boolean
  onClose: () => void
  children?: ReactNode
  scope?: AssistantScope
  welcome?: string
  suggestions?: readonly AssistantSuggestion[]
}) {
  const titleId = 'csirt-help-dialog-title'
  const statusId = 'csirt-help-dialog-status'
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const nextId = useRef(1)
  const defaults = buildDefaultAssistantConfig()
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState(false)
  const [welcome, setWelcome] = useState(
    welcomeProp ?? (scope === 'signalement' ? defaults.signalement.welcome : defaults.site.welcome)
  )
  const [suggestions, setSuggestions] = useState<AssistantSuggestion[]>(() =>
    suggestionsProp
      ? [...suggestionsProp]
      : listPublishedSuggestions(defaults, scope)
  )
  const [config, setConfig] = useState<AssistantConfig | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text:
        welcomeProp ??
        (scope === 'signalement' ? defaults.signalement.welcome : defaults.site.welcome),
    },
  ])
  const previousScope = useRef(scope)

  const scrollToEnd = useCallback(() => {
    const node = listRef.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/assistant?scope=${scope}`, { cache: 'no-store' })
        if (!res.ok) throw new Error('ASSISTANT_LOAD_FAILED')
        const data = (await res.json()) as {
          welcome?: string
          suggestions?: AssistantSuggestion[]
          fallback?: AssistantAnswer
        }
        if (cancelled) return
        const nextWelcome =
          welcomeProp?.trim() ||
          data.welcome?.trim() ||
          (scope === 'signalement' ? defaults.signalement.welcome : defaults.site.welcome)
        const nextSuggestions =
          suggestionsProp && suggestionsProp.length > 0
            ? [...suggestionsProp]
            : Array.isArray(data.suggestions) && data.suggestions.length > 0
              ? data.suggestions
              : listPublishedSuggestions(defaults, scope)

        setWelcome(nextWelcome)
        setSuggestions(nextSuggestions)
        setConfig({
          ...defaults,
          fallback: data.fallback ?? defaults.fallback,
          [scope]: {
            welcome: nextWelcome,
            items: nextSuggestions.map((entry, index) => ({
              id: entry.id,
              label: entry.label,
              query: entry.query,
              answerText: entry.answerText || '',
              links: entry.links ? [...entry.links] : undefined,
              keywords: [],
              sortOrder: (index + 1) * 10,
              published: true,
            })),
          },
        })

        setMessages((current) => {
          if (current.length === 1 && current[0]?.id === 'welcome') {
            return [{ id: 'welcome', role: 'assistant', text: nextWelcome }]
          }
          return current
        })
      } catch {
        if (cancelled) return
        const fallbackWelcome =
          welcomeProp ??
          (scope === 'signalement' ? defaults.signalement.welcome : defaults.site.welcome)
        setWelcome(fallbackWelcome)
        setSuggestions(
          suggestionsProp
            ? [...suggestionsProp]
            : listPublishedSuggestions(defaults, scope)
        )
        setConfig(defaults)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the dialog opens or its scope changes
  }, [open, scope, welcomeProp, suggestionsProp])

  useEffect(() => {
    if (previousScope.current === scope) return
    previousScope.current = scope
    setMessages([{ id: 'welcome', role: 'assistant', text: welcome }])
    setQuery('')
    setPending(false)
  }, [scope, welcome])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: globalThis.PointerEvent) => {
      const root = rootRef.current
      if (!root || root.contains(event.target as Node)) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    scrollToEnd()
  }, [open, messages, pending, scrollToEnd])

  const pushReply = useCallback(
    (reply: AssistantAnswer) => {
      window.setTimeout(() => {
        setMessages((current) => [
          ...current,
          {
            id: `a-${nextId.current++}`,
            role: 'assistant',
            text: reply.text,
            links: reply.links,
          },
        ])
        setPending(false)
      }, 420)
    },
    [],
  )

  const askSuggestion = useCallback(
    (suggestion: AssistantSuggestion) => {
      if (pending) return
      const userText = (suggestion.query || suggestion.label).trim()
      if (!userText) return
      setQuery('')
      setPending(true)
      setMessages((current) => [
        ...current,
        { id: `u-${nextId.current++}`, role: 'user', text: userText },
      ])
      pushReply(resolveSuggestionAnswer(suggestion, config, scope))
    },
    [config, pending, pushReply, scope],
  )

  const askText = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || pending) return
      setQuery('')
      setPending(true)
      setMessages((current) => [
        ...current,
        { id: `u-${nextId.current++}`, role: 'user', text: trimmed },
      ])

      let reply: AssistantAnswer | null = null
      try {
        const res = await fetch(
          `/api/assistant?scope=${scope}&q=${encodeURIComponent(trimmed)}`,
          { cache: 'no-store' }
        )
        if (res.ok) {
          const data = (await res.json()) as { answer?: AssistantAnswer }
          if (data.answer?.text) reply = data.answer
        }
      } catch {
        // fallback local below
      }

      if (!reply) {
        reply = config
          ? answerFromConfig(config, scope, trimmed)
          : answerAssistantQuery(trimmed, scope)
      }
      pushReply(reply)
    },
    [config, pending, pushReply, scope],
  )

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void askText(query)
  }

  const hasConversation = messages.length > 1

  return (
    <div className="csirt-help-root" ref={rootRef}>
      {children}
      {open ? (
        <div
          className="csirt-help-widget"
          id="csirt-help-dialog"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={statusId}
        >
          <div className="csirt-help-head">
            <div className="csirt-help-head-copy">
              <h2 id={titleId}>Comment pouvons-nous vous aider ?</h2>
              <p id={statusId} className="csirt-help-status">
                <span className="csirt-help-status-dot" aria-hidden />
                Assistant en ligne
              </p>
            </div>
            <button type="button" className="csirt-help-close" onClick={onClose}>
              <X className="h-4 w-4" aria-hidden />
              <span className="sr-only">Fermer l’assistant</span>
            </button>
          </div>

          <div className="csirt-help-thread" ref={listRef} aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`csirt-help-bubble csirt-help-bubble--${message.role}`}
              >
                <p>{message.text}</p>
                {message.links?.length ? (
                  <div className="csirt-help-links">
                    {message.links.map((link) =>
                      link.href.startsWith('mailto:') ? (
                        <a key={link.href} href={link.href} className="csirt-help-reply-link">
                          {link.label}
                        </a>
                      ) : (
                        <Link key={link.href} href={link.href} className="csirt-help-reply-link">
                          {link.label}
                        </Link>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            ))}
            {pending ? (
              <div className="csirt-help-bubble csirt-help-bubble--assistant" aria-hidden>
                <span className="csirt-help-typing">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            ) : null}
          </div>

          <HelpSuggestionRail
            pending={pending}
            onAsk={askSuggestion}
            suggestions={suggestions.length ? suggestions : CSIRT_ASSISTANT_SUGGESTIONS}
          />

          <form className="csirt-help-composer" onSubmit={onSubmit}>
            <label className="sr-only" htmlFor="csirt-help-input">
              Posez une question
            </label>
            <input
              id="csirt-help-input"
              ref={inputRef}
              type="text"
              autoComplete="off"
              value={query}
              disabled={pending}
              placeholder={hasConversation ? 'Posez une autre question...' : 'Posez une question...'}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              type="submit"
              className="csirt-help-send"
              disabled={pending || !query.trim()}
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}

export function useCsirtHelp() {
  const [open, setOpen] = useState(false)
  return {
    open,
    openHelp: () => setOpen(true),
    closeHelp: () => setOpen(false),
    toggleHelp: () => setOpen((value) => !value),
  }
}
