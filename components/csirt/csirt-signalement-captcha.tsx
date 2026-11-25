'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, Loader2, RotateCw, ShieldCheck, X } from 'lucide-react'

type CaptchaProvider = 'google' | 'local'

type ChallengePayload =
  | { provider: 'google'; siteKey: string }
  | {
      provider: 'local'
      challengeId: string
      seal: string
      expiresAt: number
    }

export type CaptchaValue = {
  provider: CaptchaProvider
  token: string
} | null

const REQUIRED_ROUNDS = 3
const SECURITY_ITEMS = [
  { id: 'lock', label: 'Cadenas', emoji: '🔒' },
  { id: 'key', label: 'Clé', emoji: '🔑' },
  { id: 'shield', label: 'Bouclier', emoji: '🛡️' },
  { id: 'computer', label: 'Ordinateur', emoji: '💻' },
  { id: 'satellite', label: 'Satellite', emoji: '📡' },
  { id: 'warning', label: 'Alerte', emoji: '⚠️' },
  { id: 'firewall', label: 'Pare-feu', emoji: '🧱' },
  { id: 'usb', label: 'Clé USB', emoji: '💾' },
  { id: 'phone', label: 'Téléphone', emoji: '📱' },
  { id: 'network', label: 'Réseau', emoji: '🌐' },
  { id: 'detective', label: 'Analyse', emoji: '🕵️' },
  { id: 'server', label: 'Serveur', emoji: '🖥️' },
] as const
const ANGLES = [0, 90, 180, 270] as const

type AnimalTile = {
  id: string
  emoji: string
  label: string
  rotation: number
}

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback': () => void
          'error-callback': () => void
          theme?: 'light' | 'dark'
        }
      ) => number
      reset: (widgetId?: number) => void
    }
  }
}

type Props = {
  value: CaptchaValue
  onChange: (value: CaptchaValue) => void
  disabled?: boolean
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function createRound(seed: number): AnimalTile[] {
  const picks = shuffle([...SECURITY_ITEMS]).slice(0, 3)
  return picks.map((item, index) => {
    // Au moins un élément mal orienté pour forcer une action
    const forcedWrong = index === 0
    const rotation = forcedWrong
      ? ANGLES[1 + Math.floor(Math.random() * 3)]!
      : ANGLES[Math.floor(Math.random() * ANGLES.length)]!
    return {
      id: `${seed}-${index}-${item.id}`,
      emoji: item.emoji,
      label: item.label,
      rotation,
    }
  })
}

export function CsirtSignalementCaptcha({ value, onChange, disabled }: Props) {
  const labelId = useId()
  const googleHostRef = useRef<HTMLDivElement>(null)
  const shownAtRef = useRef(0)
  const onChangeRef = useRef(onChange)
  const roundSeedRef = useRef(0)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [challenge, setChallenge] = useState<ChallengePayload | null>(null)
  const [honeypot, setHoneypot] = useState('')
  const [puzzleOpen, setPuzzleOpen] = useState(false)
  const [round, setRound] = useState(0)
  const [tiles, setTiles] = useState<AnimalTile[]>(() => createRound(0))
  const [roundFeedback, setRoundFeedback] = useState('')

  onChangeRef.current = onChange

  const allAligned = useMemo(() => tiles.every((tile) => tile.rotation % 360 === 0), [tiles])

  useEffect(() => {
    let cancelled = false

    async function loadChallenge() {
      setLoading(true)
      setError('')
      setVerifying(false)
      setHoneypot('')
      setPuzzleOpen(false)
      setRound(0)
      onChangeRef.current(null)
      try {
        const res = await fetch('/api/signalement/captcha', { cache: 'no-store' })
        const data = (await res.json()) as ChallengePayload & { error?: string }
        if (!res.ok) throw new Error(data.error || 'Impossible de charger la vérification.')
        if (cancelled) return
        setChallenge(data)
        shownAtRef.current = Date.now()
      } catch (err) {
        if (cancelled) return
        setChallenge(null)
        setError(err instanceof Error ? err.message : 'Impossible de charger la vérification.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadChallenge()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!challenge || challenge.provider !== 'google') return
    const host = googleHostRef.current
    if (!host) return

    let cancelled = false

    const mount = () => {
      if (cancelled || !window.grecaptcha || !host) return
      host.innerHTML = ''
      window.grecaptcha.ready(() => {
        if (cancelled || !host) return
        window.grecaptcha!.render(host, {
          sitekey: challenge.siteKey,
          callback: (token) => onChangeRef.current({ provider: 'google', token }),
          'expired-callback': () => onChangeRef.current(null),
          'error-callback': () => {
            setError('Le widget reCAPTCHA a échoué. Réessayez.')
            onChangeRef.current(null)
          },
          theme: 'light',
        })
      })
    }

    if (window.grecaptcha) {
      mount()
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-csirt-recaptcha]')
      if (existing) {
        existing.addEventListener('load', mount)
        return () => {
          cancelled = true
          existing.removeEventListener('load', mount)
        }
      }
      const script = document.createElement('script')
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.dataset.csirtRecaptcha = '1'
      script.onload = mount
      script.onerror = () => setError('Impossible de charger Google reCAPTCHA.')
      document.head.appendChild(script)
    }

    return () => {
      cancelled = true
    }
  }, [challenge])

  const startPuzzle = () => {
    if (disabled || verifying || value?.token || challenge?.provider !== 'local') return
    setError('')
    setRoundFeedback('')
    setRound(0)
    roundSeedRef.current += 1
    setTiles(createRound(roundSeedRef.current))
    setPuzzleOpen(true)
  }

  const rotateTile = (id: string) => {
    setRoundFeedback('')
    setTiles((current) =>
      current.map((tile) =>
        tile.id === id ? { ...tile, rotation: (tile.rotation + 90) % 360 } : tile
      )
    )
  }

  const issueToken = async () => {
    if (!challenge || challenge.provider !== 'local') return
    setVerifying(true)
    setError('')
    const dwellMs = Date.now() - shownAtRef.current
    try {
      const res = await fetch('/api/signalement/captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seal: challenge.seal,
          dwellMs,
          website: honeypot,
          rounds: REQUIRED_ROUNDS,
        }),
      })
      const data = (await res.json()) as { ok?: boolean; token?: string; error?: string }
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Vérification échouée.')
      }
      setPuzzleOpen(false)
      onChangeRef.current({ provider: 'local', token: data.token })
    } catch (err) {
      onChangeRef.current(null)
      setError(err instanceof Error ? err.message : 'Vérification échouée.')
      setPuzzleOpen(false)
      setRound(0)
    } finally {
      setVerifying(false)
    }
  }

  const confirmAlignment = async () => {
    if (!allAligned || verifying) return
    const nextRound = round + 1
    if (nextRound < REQUIRED_ROUNDS) {
      setRound(nextRound)
      setRoundFeedback(`Alignement ${nextRound}/${REQUIRED_ROUNDS} validé`)
      roundSeedRef.current += 1
      setTiles(createRound(roundSeedRef.current))
      return
    }
    setRound(REQUIRED_ROUNDS)
    setRoundFeedback('3 alignements réussis — validation…')
    await issueToken()
  }

  const closePuzzle = () => {
    if (verifying) return
    setPuzzleOpen(false)
    setRound(0)
    setRoundFeedback('')
  }

  const verified = Boolean(value?.token)

  return (
    <div className="csirt-sig-captcha" role="group" aria-labelledby={labelId}>
      <div className="csirt-sig-captcha__head">
        <ShieldCheck className="csirt-sig-captcha__badge" aria-hidden />
        <div>
          <p id={labelId} className="csirt-sig-captcha__title">
            Vérification anti-robot
          </p>
          <p className="csirt-sig-captcha__sub">
            Obligatoire pour les signalements anonymes — alignez les symboles de sécurité 3 fois pour confirmer.
          </p>
        </div>
      </div>

      <div
        className={
          verified
            ? 'csirt-sig-captcha__panel is-verified'
            : verifying || puzzleOpen
              ? 'csirt-sig-captcha__panel is-busy'
              : 'csirt-sig-captcha__panel'
        }
      >
        <label className="csirt-sig-captcha__hp" aria-hidden>
          Site web
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </label>

        {loading ? (
          <div className="csirt-sig-captcha__loading">
            <Loader2 className="csirt-sig-captcha__spin" aria-hidden />
            <span>Préparation de la vérification…</span>
          </div>
        ) : challenge?.provider === 'google' ? (
          <div className="csirt-sig-captcha__google">
            <div ref={googleHostRef} />
          </div>
        ) : challenge?.provider === 'local' ? (
          <button
            type="button"
            className="csirt-sig-captcha__check"
            onClick={startPuzzle}
            disabled={disabled || verifying || verified}
            aria-pressed={verified}
            aria-expanded={puzzleOpen}
          >
            <span className="csirt-sig-captcha__box" aria-hidden>
              {verifying ? (
                <Loader2 className="csirt-sig-captcha__spin" />
              ) : verified ? (
                <Check />
              ) : null}
            </span>
            <span className="csirt-sig-captcha__check-copy">
              <strong>Je ne suis pas un robot</strong>
              <em>
                {verifying
                  ? 'Validation en cours…'
                  : verified
                    ? 'Vérifié'
                    : puzzleOpen
                      ? 'Défi en cours…'
                      : 'Cliquez pour aligner les symboles'}
              </em>
            </span>
          </button>
        ) : (
          <p className="csirt-sig-captcha__empty">Vérification indisponible pour le moment.</p>
        )}

        <aside className="csirt-sig-captcha__brand" aria-hidden>
          <span className="csirt-sig-captcha__brand-mark">
            <ShieldCheck />
          </span>
          <span>reCAPTCHA</span>
          <small>CSIRT-ARPT</small>
        </aside>
      </div>

      {puzzleOpen && challenge?.provider === 'local' ? (
        <div className="csirt-sig-animal" role="dialog" aria-modal="true" aria-labelledby={`${labelId}-puzzle`}>
          <header className="csirt-sig-animal__head">
            <div>
              <p id={`${labelId}-puzzle`} className="csirt-sig-animal__title">
                Alignez les symboles de sécurité
              </p>
              <p className="csirt-sig-animal__hint">
                Cliquez sur chaque symbole pour le faire pivoter jusqu’à ce qu’il soit droit, puis
                validez. Répétez l’opération <strong>{REQUIRED_ROUNDS} fois</strong>.
              </p>
            </div>
            <button
              type="button"
              className="csirt-sig-animal__close"
              onClick={closePuzzle}
              disabled={verifying}
              aria-label="Fermer le défi"
            >
              <X aria-hidden />
            </button>
          </header>

          <div className="csirt-sig-animal__progress" aria-live="polite">
            <div className="csirt-sig-animal__progress-track" aria-hidden>
              {Array.from({ length: REQUIRED_ROUNDS }).map((_, index) => (
                <span
                  key={index}
                  className={
                    index < round
                      ? 'csirt-sig-animal__dot is-done'
                      : index === round
                        ? 'csirt-sig-animal__dot is-current'
                        : 'csirt-sig-animal__dot'
                  }
                />
              ))}
            </div>
            <strong>
              Étape {Math.min(round + 1, REQUIRED_ROUNDS)} / {REQUIRED_ROUNDS}
            </strong>
          </div>

          <div className="csirt-sig-animal__board" role="group" aria-label="Symboles de sécurité à aligner">
            {tiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                className={
                  tile.rotation % 360 === 0
                    ? 'csirt-sig-animal__tile is-aligned'
                    : 'csirt-sig-animal__tile'
                }
                onClick={() => rotateTile(tile.id)}
                disabled={verifying}
                aria-label={`${tile.label}, rotation ${tile.rotation} degrés. Cliquez pour pivoter.`}
              >
                <span
                  className="csirt-sig-animal__emoji"
                  style={{ transform: `rotate(${tile.rotation}deg)` }}
                  aria-hidden
                >
                  {tile.emoji}
                </span>
                <span className="csirt-sig-animal__label">{tile.label}</span>
                <span className="csirt-sig-animal__rotate" aria-hidden>
                  <RotateCw />
                </span>
              </button>
            ))}
          </div>

          {roundFeedback ? (
            <p className="csirt-sig-animal__feedback" role="status">
              {roundFeedback}
            </p>
          ) : null}

          <div className="csirt-sig-animal__actions">
            <button
              type="button"
              className="csirt-sig-animal__secondary"
              onClick={() => {
                roundSeedRef.current += 1
                setTiles(createRound(roundSeedRef.current))
                setRoundFeedback('')
              }}
              disabled={verifying}
            >
              Nouveau tirage
            </button>
            <button
              type="button"
              className="csirt-sig-animal__primary"
              onClick={() => void confirmAlignment()}
              disabled={!allAligned || verifying}
            >
              {verifying
                ? 'Validation…'
                : round + 1 >= REQUIRED_ROUNDS && allAligned
                  ? 'Valider et activer le formulaire'
                  : 'Valider cet alignement'}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="csirt-sig-captcha__error" role="alert">
          {error}
        </p>
      ) : verified ? (
        <p className="csirt-sig-captcha__ok">
          Identité humaine confirmée. Les étapes Nature et Détails sont maintenant actives.
        </p>
      ) : null}
    </div>
  )
}
