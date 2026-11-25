'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type AnalystOption = {
  id: string
  email: string
  fullName: string
  roleLabel?: string
}

type Props = {
  options: AnalystOption[]
  selectedEmails: string[]
  loading?: boolean
  disabled?: boolean
  onChange: (next: AnalystOption[]) => void
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function AnalystEmailMultiSelect({
  options,
  selectedEmails,
  loading,
  disabled,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selectedSet = useMemo(
    () => new Set(selectedEmails.map(normalizeEmail)),
    [selectedEmails]
  )

  const selectedOptions = useMemo(() => {
    const fromCatalog = options.filter((opt) => selectedSet.has(normalizeEmail(opt.email)))
    const known = new Set(fromCatalog.map((opt) => normalizeEmail(opt.email)))
    const orphans = selectedEmails
      .filter((email) => !known.has(normalizeEmail(email)))
      .map((email) => ({
        id: `custom-${normalizeEmail(email)}`,
        email,
        fullName: email,
      }))
    return [...fromCatalog, ...orphans]
  }, [options, selectedEmails, selectedSet])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((opt) =>
      `${opt.fullName} ${opt.email} ${opt.roleLabel ?? ''}`.toLowerCase().includes(needle)
    )
  }, [options, query])

  function emitSelection(nextKeys: Set<string>) {
    const fromCatalog = options.filter((opt) => nextKeys.has(normalizeEmail(opt.email)))
    const known = new Set(fromCatalog.map((opt) => normalizeEmail(opt.email)))
    const orphans = selectedEmails
      .filter((email) => nextKeys.has(normalizeEmail(email)) && !known.has(normalizeEmail(email)))
      .map((email) => ({
        id: `custom-${normalizeEmail(email)}`,
        email,
        fullName: email,
      }))
    onChange([...fromCatalog, ...orphans])
  }

  function toggle(email: string) {
    const key = normalizeEmail(email)
    const nextKeys = new Set(selectedSet)
    if (nextKeys.has(key)) nextKeys.delete(key)
    else nextKeys.add(key)
    emitSelection(nextKeys)
  }

  function remove(email: string) {
    const key = normalizeEmail(email)
    const nextKeys = new Set(selectedSet)
    nextKeys.delete(key)
    emitSelection(nextKeys)
  }

  return (
    <div className="flex flex-col gap-1">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQuery('')
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || loading}
            className="h-8 w-full justify-between px-2.5 text-xs font-normal"
            aria-label="Sélectionner les e-mails des analystes"
          >
            <span className="truncate text-left text-muted-foreground">
              {loading
                ? 'Chargement des analystes…'
                : selectedOptions.length > 0
                  ? `${selectedOptions.length} analyste${selectedOptions.length > 1 ? 's' : ''} sélectionné${selectedOptions.length > 1 ? 's' : ''}`
                  : 'Sélectionner un ou plusieurs e-mails…'}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0" sideOffset={4}>
          <div className="border-b p-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrer nom ou e-mail…"
              className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Filtrer les analystes"
            />
          </div>
          <div className="max-h-56 overflow-auto p-1" role="listbox" aria-multiselectable="true">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">Aucun analyste trouvé.</p>
            ) : (
              filtered.map((opt) => {
                const active = selectedSet.has(normalizeEmail(opt.email))
                return (
                  <div
                    key={opt.id}
                    role="option"
                    aria-selected={active}
                    tabIndex={0}
                    className={cn(
                      'flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/70',
                      active && 'bg-muted/50'
                    )}
                    onClick={() => toggle(opt.email)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggle(opt.email)
                      }
                    }}
                  >
                    <Checkbox
                      checked={active}
                      className="mt-0.5 pointer-events-none"
                      tabIndex={-1}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">{opt.fullName}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{opt.email}</span>
                    </span>
                    {active ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden /> : null}
                  </div>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 ? (
        <ul className="flex flex-wrap gap-1" aria-label="E-mails sélectionnés">
          {selectedOptions.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] hover:bg-destructive/10 hover:text-destructive"
                onClick={() => remove(opt.email)}
                title={`Retirer ${opt.email}`}
              >
                <span className="truncate">{opt.email}</span>
                <X className="h-3 w-3 shrink-0" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
