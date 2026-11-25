'use client'

type InlineFieldProps = {
  value: string
  onChange?: (value: string) => void
  multiline?: boolean
  className?: string
  placeholder?: string
  disabled?: boolean
  as?: 'span' | 'p' | 'strong' | 'h1' | 'h2'
  id?: string
  rows?: number
}

export function CsirtInlineField({
  value,
  onChange,
  multiline,
  className,
  placeholder,
  disabled,
  as = 'span',
  id,
  rows = 2,
}: InlineFieldProps) {
  if (!onChange) {
    if (as === 'h1') return <h1 id={id} className={className}>{value}</h1>
    if (as === 'h2') return <h2 id={id} className={className}>{value}</h2>
    if (as === 'strong') return <strong className={className}>{value}</strong>
    if (as === 'p' || multiline) return <p className={className}>{value}</p>
    return <span className={className}>{value}</span>
  }
  if (multiline || as === 'p') {
    return (
      <textarea
        id={id}
        className={className}
        value={value}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }
  return (
    <input
      id={id}
      className={className}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
