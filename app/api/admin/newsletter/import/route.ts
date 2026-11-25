import { NextResponse } from 'next/server'
import { requireApiPermission } from '@/lib/auth/permission-guard'
import { bulkAddNewsletterSubscribers } from '@/lib/admin/newsletter-subscribers'
import ExcelJS from '@/lib/exceljs'

const MAX_BYTES = 5 * 1024 * 1024
const MAX_ROWS = 2000

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function cellText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return String((value as { text?: unknown }).text ?? '').trim()
  }
  return String(value).trim()
}

function pickColumn(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = headers.findIndex((header) => header === alias || header.includes(alias))
    if (idx >= 0) return idx
  }
  return -1
}

export async function POST(req: Request) {
  const auth = await requireApiPermission('menu.site.newsletter')
  if (auth.error) return auth.error

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File) || !file.size) {
    return NextResponse.json(
      { error: 'MISSING_FILE', message: 'Sélectionnez un fichier Excel (.xlsx).' },
      { status: 400 }
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'FILE_TOO_LARGE', message: 'Le fichier dépasse 5 Mo.' },
      { status: 400 }
    )
  }

  const name = file.name.toLowerCase()
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
    return NextResponse.json(
      {
        error: 'FILE_TYPE',
        message: 'Format non supporté. Utilisez un fichier .xlsx ou .csv.',
      },
      { status: 400 }
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = new ExcelJS.Workbook()
    if (name.endsWith('.csv')) {
      // exceljs CSV via workbook.xlsx.load won't work — use csv parser path
      const text = buffer.toString('utf8').replace(/^\uFEFF/, '')
      const lines = text.split(/\r?\n/).filter((line) => line.trim())
      if (lines.length < 2) {
        return NextResponse.json(
          { error: 'EMPTY_FILE', message: 'Le fichier ne contient aucune ligne de données.' },
          { status: 400 }
        )
      }
      const splitCsv = (line: string) => {
        const sep = line.includes(';') ? ';' : ','
        return line.split(sep).map((part) => part.replace(/^"|"$/g, '').trim())
      }
      const headers = splitCsv(lines[0]).map(normalizeHeader)
      const emailIdx = pickColumn(headers, ['email', 'mail', 'courriel', 'adresseemail'])
      const nameIdx = pickColumn(headers, [
        'nomcomplet',
        'fullname',
        'nom',
        'prenomnom',
        'fullname',
        'name',
      ])
      if (emailIdx < 0) {
        return NextResponse.json(
          {
            error: 'MISSING_EMAIL_COLUMN',
            message: 'Colonne e-mail introuvable (ex. Email, E-mail, Mail).',
          },
          { status: 400 }
        )
      }
      const rows = lines.slice(1, MAX_ROWS + 1).map((line) => {
        const cols = splitCsv(line)
        const email = cols[emailIdx] ?? ''
        const fullName =
          (nameIdx >= 0 ? cols[nameIdx] : '') ||
          email.split('@')[0]?.replace(/[._-]+/g, ' ') ||
          ''
        return { email, fullName }
      })
      const result = await bulkAddNewsletterSubscribers(rows, auth.session.userId)
      return NextResponse.json({ ok: true, ...result })
    }

    // exceljs accepts Node Buffer
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    const sheet = workbook.worksheets[0]
    if (!sheet) {
      return NextResponse.json(
        { error: 'EMPTY_FILE', message: 'Le classeur Excel est vide.' },
        { status: 400 }
      )
    }

    const headerRow = sheet.getRow(1)
    const headers: string[] = []
    headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] = normalizeHeader(cell.value)
    })

    const emailIdx = pickColumn(headers, ['email', 'mail', 'courriel', 'adresseemail'])
    const nameIdx = pickColumn(headers, [
      'nomcomplet',
      'fullname',
      'nom',
      'prenomnom',
      'fullname',
      'name',
    ])
    if (emailIdx < 0) {
      return NextResponse.json(
        {
          error: 'MISSING_EMAIL_COLUMN',
          message: 'Colonne e-mail introuvable (ex. Email, E-mail, Mail).',
        },
        { status: 400 }
      )
    }

    const rows: Array<{ email: string; fullName: string }> = []
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return
      if (rows.length >= MAX_ROWS) return
      const email = cellText(row.getCell(emailIdx + 1).value)
      const fullNameRaw = nameIdx >= 0 ? cellText(row.getCell(nameIdx + 1).value) : ''
      const fullName =
        fullNameRaw || email.split('@')[0]?.replace(/[._-]+/g, ' ') || ''
      if (!email && !fullNameRaw) return
      rows.push({ email, fullName })
    })

    if (!rows.length) {
      return NextResponse.json(
        { error: 'EMPTY_FILE', message: 'Le fichier ne contient aucune ligne de données.' },
        { status: 400 }
      )
    }

    const result = await bulkAddNewsletterSubscribers(rows, auth.session.userId)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'PARSE_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Impossible de lire le fichier Excel.',
      },
      { status: 400 }
    )
  }
}
