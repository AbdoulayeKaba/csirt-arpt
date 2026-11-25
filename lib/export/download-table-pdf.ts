/** Export PDF tabulaire (Helvetica / WinAnsi) — sans dépendance externe. */

function toWinAnsi(value: string): string {
  let out = ''
  for (const char of value.replace(/\r?\n/g, ' ').trim()) {
    if (char === '\\' || char === '(' || char === ')') {
      out += `\\${char}`
      continue
    }
    const code = char.charCodeAt(0)
    if (code >= 32 && code <= 126) {
      out += char
      continue
    }
    const mapped =
      {
        '\u0152': 140, // Œ
        '\u0153': 156, // œ
        '\u2018': 145,
        '\u2019': 146,
        '\u201c': 147,
        '\u201d': 148,
        '\u2013': 150,
        '\u2014': 151,
        '\u2026': 133,
        '\u00a0': 32,
      }[char] ?? (code <= 255 ? code : 63)
    out += `\\${mapped.toString(8).padStart(3, '0')}`
  }
  return out
}

function pdfString(value: string) {
  return `(${toWinAnsi(value.slice(0, 180))})`
}

type PdfObject = { id: number; body: string }

function buildPdf(objects: PdfObject[]) {
  const header = '%PDF-1.4\n'
  const chunks: string[] = [header]
  const offsets = [0]
  let cursor = header.length
  for (const obj of objects) {
    const block = `${obj.id} 0 obj\n${obj.body}\nendobj\n`
    offsets[obj.id] = cursor
    chunks.push(block)
    cursor += block.length
  }
  const xrefStart = cursor
  const maxId = objects.reduce((max, obj) => Math.max(max, obj.id), 0)
  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= maxId; i += 1) {
    xref += `${String(offsets[i] ?? 0).padStart(10, '0')} 00000 n \n`
  }
  const trailer = `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  chunks.push(xref, trailer)
  return chunks.join('')
}

export type PdfChartSlice = {
  label: string
  value: number
  /** Composantes 0–1. */
  rgb: [number, number, number]
}

export type PdfInsights = {
  eyebrow: string
  title: string
  donutTitle: string
  donutCaption: string
  centerValue: string
  centerLabel: string
  slices: PdfChartSlice[]
  barTitle: string
  barCaption: string
  barBadge: string
  bars: PdfChartSlice[]
}

export type TablePdfInput = {
  filename: string
  title: string
  subtitle?: string
  headers: string[]
  rows: string[][]
  insights?: PdfInsights
}

function pdfNum(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '0'
}

function setFill(ops: string[], rgb: [number, number, number]) {
  ops.push(`${pdfNum(rgb[0])} ${pdfNum(rgb[1])} ${pdfNum(rgb[2])} rg`)
}

function textAt(
  ops: string[],
  font: 'F1' | 'F2',
  size: number,
  x: number,
  y: number,
  value: string,
  rgb: [number, number, number]
) {
  setFill(ops, rgb)
  ops.push('BT')
  ops.push(`/${font} ${size} Tf`)
  ops.push(`1 0 0 1 ${pdfNum(x)} ${pdfNum(y)} Tm`)
  ops.push(`${pdfString(value)} Tj`)
  ops.push('ET')
}

/** 0 en haut, sens horaire. Segments ≤ 90° pour les courbes de Bézier. */
function arcOps(cx: number, cy: number, radius: number, start: number, end: number): string[] {
  const ops: string[] = []
  const dir = end >= start ? 1 : -1
  let cursor = start
  while (Math.abs(end - cursor) > 0.001) {
    const step = Math.min(Math.PI / 2, Math.abs(end - cursor)) * dir
    const next = cursor + step
    const alpha = (4 / 3) * Math.tan((next - cursor) / 4)
    const point = (angle: number): [number, number] => [
      cx + radius * Math.sin(angle),
      cy + radius * Math.cos(angle),
    ]
    const tangent = (angle: number): [number, number] => [
      radius * Math.cos(angle),
      -radius * Math.sin(angle),
    ]
    const from = point(cursor)
    const to = point(next)
    const fromTan = tangent(cursor)
    const toTan = tangent(next)
    ops.push(
      `${pdfNum(from[0] + alpha * fromTan[0])} ${pdfNum(from[1] + alpha * fromTan[1])} ${pdfNum(to[0] - alpha * toTan[0])} ${pdfNum(to[1] - alpha * toTan[1])} ${pdfNum(to[0])} ${pdfNum(to[1])} c`
    )
    cursor = next
  }
  return ops
}

function drawDonut(ops: string[], cx: number, cy: number, slices: PdfChartSlice[]) {
  const outer = 30
  const inner = 18
  const active = slices.filter((slice) => slice.value > 0)
  const total = active.reduce((sum, slice) => sum + slice.value, 0)
  if (total <= 0) {
    setFill(ops, [0.82, 0.86, 0.84])
    ops.push(`${pdfNum(cx)} ${pdfNum(cy + outer)} m`)
    ops.push(...arcOps(cx, cy, outer, 0, Math.PI * 2))
    ops.push('h')
    ops.push(`${pdfNum(cx)} ${pdfNum(cy + inner)} m`)
    ops.push(...arcOps(cx, cy, inner, Math.PI * 2, 0))
    ops.push('h f')
    return
  }
  let angle = 0
  const gap = active.length > 1 ? 0.04 : 0
  active.forEach((slice) => {
    const sweep = (slice.value / total) * Math.PI * 2
    const start = angle + gap / 2
    const end = angle + Math.max(sweep - gap, 0.02)
    const outerStart: [number, number] = [
      cx + outer * Math.sin(start),
      cy + outer * Math.cos(start),
    ]
    setFill(ops, slice.rgb)
    ops.push(`${pdfNum(outerStart[0])} ${pdfNum(outerStart[1])} m`)
    ops.push(...arcOps(cx, cy, outer, start, end))
    const innerEnd: [number, number] = [cx + inner * Math.sin(end), cy + inner * Math.cos(end)]
    ops.push(`${pdfNum(innerEnd[0])} ${pdfNum(innerEnd[1])} l`)
    ops.push(...arcOps(cx, cy, inner, end, start))
    ops.push('h f')
    angle += sweep
  })
}

const INSIGHTS_SHIFT = 168

function drawInsights(ops: string[], insights: PdfInsights, pageW: number, margin: number, top: number) {
  const ink: [number, number, number] = [0.09, 0.23, 0.16]
  const muted: [number, number, number] = [0.35, 0.42, 0.38]
  const gap = 8
  const cardW = (pageW - margin * 2 - gap) / 2
  const left = margin
  const right = margin + cardW + gap
  const cardTop = top - 26
  const cardH = 122
  const cardBottom = cardTop - cardH

  textAt(ops, 'F2', 7, margin, top, insights.eyebrow.toUpperCase(), [0.12, 0.45, 0.28])
  textAt(ops, 'F2', 11, margin, top - 14, insights.title, ink)

  ops.push('0.965 0.984 0.973 rg')
  ops.push(`${pdfNum(left)} ${pdfNum(cardBottom)} ${pdfNum(cardW)} ${pdfNum(cardH)} re f`)
  ops.push(`${pdfNum(right)} ${pdfNum(cardBottom)} ${pdfNum(cardW)} ${pdfNum(cardH)} re f`)
  ops.push('0.78 0.87 0.82 RG')
  ops.push('0.7 w')
  ops.push(`${pdfNum(left)} ${pdfNum(cardBottom)} ${pdfNum(cardW)} ${pdfNum(cardH)} re S`)
  ops.push(`${pdfNum(right)} ${pdfNum(cardBottom)} ${pdfNum(cardW)} ${pdfNum(cardH)} re S`)

  textAt(ops, 'F2', 8, left + 10, cardTop - 14, insights.donutTitle, ink)
  textAt(ops, 'F1', 6.5, left + 10, cardTop - 24, insights.donutCaption, muted)

  const cx = left + 52
  const cy = cardBottom + 42
  drawDonut(ops, cx, cy, insights.slices)
  const valueWidth = insights.centerValue.length * 5.6
  textAt(ops, 'F2', 11, cx - valueWidth / 2, cy - 2, insights.centerValue, ink)
  const labelWidth = insights.centerLabel.length * 2.7
  textAt(ops, 'F1', 5.5, cx - labelWidth / 2, cy - 12, insights.centerLabel, muted)

  const legend = insights.slices.slice(0, 5)
  legend.forEach((slice, index) => {
    const y = cardTop - 42 - index * 14
    setFill(ops, slice.rgb)
    ops.push(`${pdfNum(left + 108)} ${pdfNum(y - 1)} 7 7 re f`)
    textAt(ops, 'F1', 7.5, left + 120, y, slice.label, [0.15, 0.2, 0.17])
    const count = String(slice.value)
    textAt(ops, 'F2', 8, left + cardW - 18 - count.length * 4.5, y, count, ink)
  })

  textAt(ops, 'F2', 8, right + 10, cardTop - 14, insights.barTitle, ink)
  textAt(ops, 'F1', 6.5, right + 10, cardTop - 24, insights.barCaption, muted)
  if (insights.barBadge.trim()) {
    const badge = insights.barBadge.trim()
    textAt(ops, 'F2', 7, right + cardW - 12 - badge.length * 3.6, cardTop - 14, badge, [0.72, 0.11, 0.11])
  }

  const maxBar = Math.max(1, ...insights.bars.map((bar) => bar.value))
  const trackX = right + 108
  const trackW = cardW - 136
  insights.bars.slice(0, 4).forEach((bar, index) => {
    const y = cardTop - 46 - index * 18
    textAt(ops, 'F1', 7, right + 10, y, bar.label, [0.2, 0.25, 0.22])
    ops.push('0.90 0.93 0.91 rg')
    ops.push(`${pdfNum(trackX)} ${pdfNum(y - 2)} ${pdfNum(trackW)} 8 re f`)
    const width = bar.value > 0 ? Math.max(4, (bar.value / maxBar) * trackW) : 0
    if (width > 0) {
      setFill(ops, bar.rgb)
      ops.push(`${pdfNum(trackX)} ${pdfNum(y - 2)} ${pdfNum(width)} 8 re f`)
    }
    const count = String(bar.value)
    textAt(ops, 'F2', 8, right + cardW - 16 - count.length * 4.5, y, count, ink)
  })
}

export function buildTablePdfBlob(input: Omit<TablePdfInput, 'filename'>): Blob {
  const pageW = 842
  const pageH = 595
  const margin = 22
  const bannerH = 18
  const metaGap = 12
  const headerH = bannerH + metaGap + 4
  const colCount = Math.max(input.headers.length, 1)
  const tableW = pageW - margin * 2
  const colW = tableW / colCount
  const rowH = 13
  const fontSize = 6.5
  const headerFontSize = 6.5
  const usableH = pageH - margin - headerH - 16
  const rowsPerPage = Math.max(1, Math.floor(usableH / rowH) - 1)
  const insightsShift = input.insights ? INSIGHTS_SHIFT : 0
  const firstTableTop = pageH - margin - headerH - insightsShift
  const firstRows = input.insights
    ? Math.max(1, Math.floor((firstTableTop - margin) / rowH) - 1)
    : rowsPerPage
  const pages: string[][][] = []
  if (!input.rows.length) pages.push([])
  else {
    pages.push(input.rows.slice(0, firstRows))
    for (let i = firstRows; i < input.rows.length; i += rowsPerPage) {
      pages.push(input.rows.slice(i, i + rowsPerPage))
    }
  }

  const contentStreams: string[] = []
  pages.forEach((pageRows, pageIndex) => {
    const ops: string[] = []
    ops.push('0.09 0.33 0.18 rg')
    ops.push(`${margin} ${pageH - margin - bannerH} ${tableW} ${bannerH} re f`)
    ops.push('1 1 1 rg')
    ops.push('BT')
    ops.push('/F1 10 Tf')
    ops.push(`1 0 0 1 ${margin + 6} ${pageH - margin - bannerH + 5} Tm`)
    ops.push(`${pdfString(input.title)} Tj`)
    ops.push('ET')

    ops.push('0.33 0.41 0.45 rg')
    ops.push('BT')
    ops.push('/F1 6.5 Tf')
    ops.push(`1 0 0 1 ${margin} ${pageH - margin - bannerH - 10} Tm`)
    ops.push(
      `${pdfString(
        `${input.subtitle ?? ''}  ·  ${input.rows.length} ligne(s)  ·  page ${pageIndex + 1}/${pages.length}`
      )} Tj`
    )
    ops.push('ET')

    let tableTop = pageH - margin - headerH
    if (pageIndex === 0 && input.insights) {
      drawInsights(ops, input.insights, pageW, margin, pageH - margin - bannerH - 20)
      tableTop -= INSIGHTS_SHIFT
    }
    ops.push('0.93 0.97 0.94 rg')
    ops.push(`${margin} ${tableTop - rowH} ${tableW} ${rowH} re f`)

    const drawRow = (cells: string[], y: number, header: boolean) => {
      ops.push(header ? '0.08 0.33 0.18 rg' : '0.15 0.23 0.29 rg')
      ops.push('BT')
      ops.push(`/F1 ${header ? headerFontSize : fontSize} Tf`)
      cells.forEach((cell, col) => {
        const x = margin + 3 + col * colW
        const maxChars = Math.max(6, Math.floor(colW / 3.4))
        const text = cell.length > maxChars ? `${cell.slice(0, maxChars - 1)}…` : cell
        ops.push(`1 0 0 1 ${x.toFixed(2)} ${(y + 3.5).toFixed(2)} Tm`)
        ops.push(`${pdfString(text)} Tj`)
      })
      ops.push('ET')
      ops.push('0.82 0.87 0.84 RG')
      ops.push('0.3 w')
      ops.push(`${margin} ${y} ${tableW} ${rowH} re S`)
    }

    drawRow(input.headers, tableTop - rowH, true)
    pageRows.forEach((row, index) => {
      const y = tableTop - rowH * (index + 2)
      if (index % 2 === 1) {
        ops.push('0.97 0.98 0.97 rg')
        ops.push(`${margin} ${y} ${tableW} ${rowH} re f`)
      }
      drawRow(
        input.headers.map((_, col) => row[col] ?? ''),
        y,
        false
      )
    })

    contentStreams.push(ops.join('\n'))
  })

  const objects: PdfObject[] = [
    { id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' },
    {
      id: 2,
      body: `<< /Type /Pages /Kids [${contentStreams.map((_, i) => `${3 + i * 2} 0 R`).join(' ')}] /Count ${contentStreams.length} >>`,
    },
    {
      id: 3 + contentStreams.length * 2,
      body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    },
    {
      id: 4 + contentStreams.length * 2,
      body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    },
  ]

  const fontId = 3 + contentStreams.length * 2
  const boldId = fontId + 1
  contentStreams.forEach((stream, index) => {
    const pageId = 3 + index * 2
    const contentId = pageId + 1
    objects.push({
      id: pageId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> >> >>`,
    })
    objects.push({
      id: contentId,
      body: `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    })
  })

  objects.sort((a, b) => a.id - b.id)
  return new Blob([buildPdf(objects)], { type: 'application/pdf' })
}

/** Ouvre le PDF dans un nouvel onglet (aperçu navigateur, téléchargement natif). */
export function openTablePdfInTab(input: TablePdfInput): boolean {
  const blob = buildTablePdfBlob(input)
  const url = URL.createObjectURL(blob)
  // Ne pas passer noopener : window.open renverrait null et on croirait un blocage pop-up.
  const win = window.open(url, '_blank')
  if (!win) {
    URL.revokeObjectURL(url)
    return false
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return true
}

export function downloadTablePdf(input: TablePdfInput) {
  const blob = buildTablePdfBlob(input)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = input.filename.endsWith('.pdf') ? input.filename : `${input.filename}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
