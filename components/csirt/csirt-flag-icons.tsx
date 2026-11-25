type FlagProps = {
  className?: string
}

export function GuineaFlag({ className }: FlagProps) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden>
      <rect width="8" height="16" fill="#CE1126" />
      <rect x="8" width="8" height="16" fill="#FCD116" />
      <rect x="16" width="8" height="16" fill="#009460" />
      <rect width="24" height="16" rx="2" fill="none" stroke="rgba(0,0,0,0.1)" />
    </svg>
  )
}

export function FranceFlag({ className }: FlagProps) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden>
      <rect width="24" height="16" rx="2" fill="#fff" />
      <rect width="8" height="16" fill="#002395" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#ED2939" />
      <rect width="24" height="16" rx="2" fill="none" stroke="rgba(0,0,0,0.1)" />
    </svg>
  )
}

export function UkFlag({ className }: FlagProps) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden>
      <rect width="24" height="16" rx="2" fill="#012169" />
      <path d="M0 0 24 16M24 0 0 16" stroke="#fff" strokeWidth="3.2" />
      <path d="M0 0 24 16M24 0 0 16" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5.2" />
      <path d="M12 0v16M0 8h24" stroke="#C8102E" strokeWidth="3" />
      <rect width="24" height="16" rx="2" fill="none" stroke="rgba(0,0,0,0.08)" />
    </svg>
  )
}
