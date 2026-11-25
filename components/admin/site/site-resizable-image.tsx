'use client'

import { useCallback, useRef } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { cn } from '@/lib/utils'

const MIN_WIDTH = 80

export function ResizableImageView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const { src, alt, title, width } = node.attrs as {
    src: string
    alt?: string
    title?: string
    width?: string | null
  }
  const imgRef = useRef<HTMLImageElement>(null)
  const editable = editor.isEditable

  const selectImage = useCallback(() => {
    if (!editable) return
    const pos = getPos()
    if (typeof pos !== 'number') return
    editor.chain().focus().setNodeSelection(pos).run()
  }, [editable, editor, getPos])

  const startResize = useCallback(
    (event: React.PointerEvent<HTMLSpanElement>) => {
      if (!editable) return
      event.preventDefault()
      event.stopPropagation()

      const img = imgRef.current
      if (!img) return

      const startX = event.clientX
      const startWidth = img.offsetWidth

      const onMove = (moveEvent: PointerEvent) => {
        const container = img.closest('.site-rte-content, .tiptap') as HTMLElement | null
        const maxWidth = container?.clientWidth ?? 960
        const next = Math.min(
          maxWidth,
          Math.max(MIN_WIDTH, Math.round(startWidth + (moveEvent.clientX - startX)))
        )
        updateAttributes({ width: `${next}px` })
      }

      const onUp = () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'nwse-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [editable, updateAttributes]
  )

  const styleWidth = width ? { width: String(width) } : undefined

  return (
    <NodeViewWrapper
      as="div"
      className="site-rte-image-wrap"
      data-drag-handle={editable ? '' : undefined}
    >
      <figure
        className={cn('site-rte-image-resize', selected && editable && 'is-selected')}
        contentEditable={false}
        onClick={selectImage}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          title={title || undefined}
          className="site-rte-image"
          style={styleWidth}
          draggable={false}
        />
        {selected && editable ? (
          <span
            className="site-rte-image-handle site-rte-image-handle--se"
            role="button"
            aria-label="Redimensionner l’image"
            title="Glisser pour redimensionner"
            onPointerDown={startResize}
          />
        ) : null}
      </figure>
    </NodeViewWrapper>
  )
}
