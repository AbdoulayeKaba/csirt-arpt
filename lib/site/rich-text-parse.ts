type Block =
  | { type: 'h2'; text: string; id?: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function parseSiteBody(source: string): Block[] {
  const text = source.replace(/\r\n/g, '\n').trim()
  if (!text) return []

  const blocks: Block[] = []
  const chunks = text.split(/\n{2,}/)

  for (const chunk of chunks) {
    const lines = chunk
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.length === 0) continue

    if (lines.every((line) => line.startsWith('- ') || line.startsWith('• '))) {
      blocks.push({
        type: 'ul',
        items: lines.map((line) => line.replace(/^[-•]\s+/, '')),
      })
      continue
    }

    if (lines.length === 1 && lines[0].startsWith('## ')) {
      const heading = lines[0].slice(3).trim()
      blocks.push({ type: 'h2', text: heading, id: slugify(heading) })
      continue
    }

    const heading = lines[0].startsWith('## ') ? lines[0].slice(3).trim() : null
    const rest = heading ? lines.slice(1) : lines
    if (heading) {
      blocks.push({ type: 'h2', text: heading, id: slugify(heading) })
    }
    if (rest.length) {
      if (rest.every((line) => line.startsWith('- ') || line.startsWith('• '))) {
        blocks.push({
          type: 'ul',
          items: rest.map((line) => line.replace(/^[-•]\s+/, '')),
        })
      } else {
        blocks.push({ type: 'p', text: rest.join(' ') })
      }
    }
  }

  return blocks
}
