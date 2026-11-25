import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ResizableImageView } from '@/components/admin/site/site-resizable-image'

function normalizeWidth(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return `${value}px`
  const raw = String(value).trim()
  if (!raw) return null
  return /^\d+$/.test(raw) ? `${raw}px` : raw
}

export const ResizableImage = Image.extend({
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const fromAttr = element.getAttribute('width')
          const fromStyle = element.style.width
          return normalizeWidth(fromAttr || fromStyle || null)
        },
        renderHTML: (attributes) => {
          const width = normalizeWidth(attributes.width)
          if (!width) return {}
          return { style: `width: ${width}; height: auto;` }
        },
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
})
