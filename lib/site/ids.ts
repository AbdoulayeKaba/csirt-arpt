import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function formatSiteNewsDates(isoDate: string): { dateLabel: string; dateShort: string } {
  const raw = isoDate.trim()
  const d = new Date(`${raw}T12:00:00`)
  if (Number.isNaN(d.getTime())) {
    return { dateLabel: raw, dateShort: raw.toUpperCase() }
  }
  return {
    dateLabel: format(d, 'EEEE d MMMM yyyy', { locale: fr }),
    dateShort: format(d, 'dd MMM yyyy', { locale: fr }).toUpperCase(),
  }
}

export function newSiteId(prefix: string) {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${rand}`
}
