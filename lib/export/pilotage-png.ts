import type { PdfInsights } from '@/lib/export/download-table-pdf'

function traceRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
    return
  }
  ctx.rect(x, y, w, h)
}

function css(rgb: [number, number, number]): string {
  return `rgb(${Math.round(rgb[0] * 255)} ${Math.round(rgb[1] * 255)} ${Math.round(rgb[2] * 255)})`
}

/** Image du pilotage CSIRT pour l’onglet Excel (mêmes chiffres que l’écran). */
export function renderPilotagePng(insights: PdfInsights): string {
  if (typeof document === 'undefined') return ''
  const width = 1100
  const height = 300
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#1f6b42'
  ctx.font = '700 12px Helvetica, Arial, sans-serif'
  ctx.fillText(insights.eyebrow.toUpperCase(), 8, 22)
  ctx.fillStyle = '#173828'
  ctx.font = '700 20px Helvetica, Arial, sans-serif'
  ctx.fillText(insights.title, 8, 48)

  const cardY = 64
  const cardH = 220
  const gap = 16
  const cardW = (width - 16 - gap) / 2
  const drawCard = (x: number) => {
    ctx.fillStyle = '#f4faf6'
    ctx.strokeStyle = '#c9ddd2'
    ctx.lineWidth = 1
    traceRoundRect(ctx, x, cardY, cardW, cardH, 10)
    ctx.fill()
    ctx.stroke()
  }
  drawCard(8)
  drawCard(8 + cardW + gap)

  const left = 8
  const right = 8 + cardW + gap
  ctx.fillStyle = '#173828'
  ctx.font = '700 14px Helvetica, Arial, sans-serif'
  ctx.fillText(insights.donutTitle, left + 16, cardY + 26)
  ctx.fillStyle = '#5c6b64'
  ctx.font = '12px Helvetica, Arial, sans-serif'
  ctx.fillText(insights.donutCaption, left + 16, cardY + 44)

  const cx = left + 78
  const cy = cardY + 132
  const outer = 52
  const inner = 32
  const active = insights.slices.filter((slice) => slice.value > 0)
  const total = active.reduce((sum, slice) => sum + slice.value, 0)
  if (total <= 0) {
    ctx.beginPath()
    ctx.arc(cx, cy, outer, 0, Math.PI * 2)
    ctx.arc(cx, cy, inner, 0, Math.PI * 2, true)
    ctx.fillStyle = '#d1d8d4'
    ctx.fill('evenodd')
  } else {
    let angle = -Math.PI / 2
    active.forEach((slice) => {
      const sweep = (slice.value / total) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(cx, cy, outer, angle, angle + sweep)
      ctx.arc(cx, cy, inner, angle + sweep, angle, true)
      ctx.closePath()
      ctx.fillStyle = css(slice.rgb)
      ctx.fill()
      angle += sweep
    })
  }
  ctx.fillStyle = '#173828'
  ctx.font = '700 18px Helvetica, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(insights.centerValue, cx, cy + 4)
  ctx.fillStyle = '#5c6b64'
  ctx.font = '11px Helvetica, Arial, sans-serif'
  ctx.fillText(insights.centerLabel, cx, cy + 18)
  ctx.textAlign = 'left'

  insights.slices.slice(0, 5).forEach((slice, index) => {
    const y = cardY + 78 + index * 28
    ctx.fillStyle = css(slice.rgb)
    traceRoundRect(ctx, left + 150, y, 12, 12, 3)
    ctx.fill()
    ctx.fillStyle = '#24312c'
    ctx.font = '13px Helvetica, Arial, sans-serif'
    ctx.fillText(slice.label, left + 170, y + 11)
    ctx.fillStyle = '#173828'
    ctx.font = '700 14px Helvetica, Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(String(slice.value), left + cardW - 18, y + 11)
    ctx.textAlign = 'left'
  })

  ctx.fillStyle = '#173828'
  ctx.font = '700 14px Helvetica, Arial, sans-serif'
  ctx.fillText(insights.barTitle, right + 16, cardY + 26)
  ctx.fillStyle = '#5c6b64'
  ctx.font = '12px Helvetica, Arial, sans-serif'
  ctx.fillText(insights.barCaption, right + 16, cardY + 44)
  if (insights.barBadge.trim()) {
    ctx.fillStyle = '#b91c1c'
    ctx.font = '700 12px Helvetica, Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(insights.barBadge.trim(), right + cardW - 16, cardY + 26)
    ctx.textAlign = 'left'
  }

  const maxBar = Math.max(1, ...insights.bars.map((bar) => bar.value))
  insights.bars.slice(0, 4).forEach((bar, index) => {
    const y = cardY + 72 + index * 36
    ctx.fillStyle = '#24312c'
    ctx.font = '13px Helvetica, Arial, sans-serif'
    ctx.fillText(bar.label, right + 16, y + 12)
    const trackX = right + 150
    const trackW = cardW - 196
    ctx.fillStyle = '#e4ebe7'
    traceRoundRect(ctx, trackX, y, trackW, 12, 6)
    ctx.fill()
    const barW = bar.value > 0 ? Math.max(8, (bar.value / maxBar) * trackW) : 0
    if (barW > 0) {
      ctx.fillStyle = css(bar.rgb)
      traceRoundRect(ctx, trackX, y, barW, 12, 6)
      ctx.fill()
    }
    ctx.fillStyle = '#173828'
    ctx.font = '700 14px Helvetica, Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(String(bar.value), right + cardW - 16, y + 12)
    ctx.textAlign = 'left'
  })

  const dataUrl = canvas.toDataURL('image/png')
  return dataUrl.replace(/^data:image\/png;base64,/, '')
}
