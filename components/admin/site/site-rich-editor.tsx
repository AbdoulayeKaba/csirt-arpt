'use client'

import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import { ResizableImage } from '@/components/admin/site/site-resizable-image-extension'
import {
  TextStyle,
  FontFamily,
  FontSize,
  LineHeight,
} from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { TableKit } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table2,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type Props = {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  placeholder?: string
  /** Mode document (page type Word). */
  variant?: 'default' | 'document'
  /** Contenu affiché en haut de la page (ex. titre). */
  documentHeader?: ReactNode
}

const FONT_FAMILIES = [
  { label: 'Par défaut', value: '' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Calibri', value: 'Calibri, Candara, Segoe UI, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
] as const

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'] as const

const LINE_HEIGHTS = [
  { label: '1', value: '1' },
  { label: '1,15', value: '1.15' },
  { label: '1,5', value: '1.5' },
  { label: '2', value: '2' },
] as const

const TEXT_COLORS = [
  '#12301e',
  '#000000',
  '#374151',
  '#1f6b42',
  '#0f766e',
  '#1d4ed8',
  '#7c3aed',
  '#be123c',
  '#c2410c',
  '#ffffff',
] as const

const HIGHLIGHT_COLORS = [
  '#fef08a',
  '#bbf7d0',
  '#bae6fd',
  '#e9d5ff',
  '#fecaca',
  '#fed7aa',
  '#e5e7eb',
] as const

function ToolBtn({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={cn('site-rte-btn', active && 'is-active')}
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  )
}

function ToolSelect({
  label,
  value,
  disabled,
  onChange,
  children,
  className,
}: {
  label: string
  value: string
  disabled?: boolean
  onChange: (value: string) => void
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('site-rte-select', className)} title={label}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  )
}

function ColorSwatches({
  label,
  colors,
  disabled,
  onPick,
  onClear,
}: {
  label: string
  colors: readonly string[]
  disabled?: boolean
  onPick: (color: string) => void
  onClear: () => void
}) {
  return (
    <div className="site-rte-swatches" role="group" aria-label={label}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className="site-rte-swatch"
          style={{ background: color }}
          disabled={disabled}
          title={`${label} ${color}`}
          aria-label={`${label} ${color}`}
          onClick={() => onPick(color)}
        />
      ))}
      <button
        type="button"
        className="site-rte-swatch is-clear"
        disabled={disabled}
        title={`Retirer ${label.toLowerCase()}`}
        aria-label={`Retirer ${label.toLowerCase()}`}
        onClick={onClear}
      >
        ×
      </button>
    </div>
  )
}

export function SiteRichEditor({
  value,
  onChange,
  disabled,
  placeholder,
  variant = 'default',
  documentHeader,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const uploading = useRef(false)
  const isDocument = variant === 'document'

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      LineHeight,
      Color,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      ResizableImage.configure({
        allowBase64: false,
        HTMLAttributes: { class: 'site-rte-image' },
      }),
      TableKit.configure({
        table: { resizable: true },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: placeholder || 'Rédigez le contenu de la page…',
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: cn('site-rte-content', isDocument && 'site-rte-content--page'),
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [editor, value])

  const setLink = useCallback(() => {
    if (!editor) return
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL du lien', previous || 'https://')
    if (url === null) return
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }, [editor])

  const insertTable = useCallback(() => {
    if (!editor) return
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run()
  }, [editor])

  const uploadImage = useCallback(
    async (file: File) => {
      if (!editor || uploading.current) return
      uploading.current = true
      try {
        const body = new FormData()
        body.set('file', file)
        const res = await fetch('/api/admin/site/media', { method: 'POST', body })
        const json = (await res.json().catch(() => ({}))) as { url?: string }
        if (!res.ok || !json.url) {
          toast({
            variant: 'destructive',
            title: 'Import impossible',
            description: 'Formats acceptés : PNG, JPG, WebP, GIF, SVG.',
          })
          return
        }
        editor.chain().focus().setImage({ src: json.url, alt: file.name }).run()
        toast({ title: 'Image insérée' })
      } finally {
        uploading.current = false
      }
    },
    [editor]
  )

  if (!editor) {
    return (
      <div className={cn('site-rte', isDocument && 'site-rte--document', 'is-loading')}>
        Chargement de l’éditeur…
      </div>
    )
  }

  const currentFont =
    (editor.getAttributes('textStyle').fontFamily as string | undefined) || ''
  const currentSize =
    (editor.getAttributes('textStyle').fontSize as string | undefined) || '16px'
  const currentLineHeight =
    (editor.getAttributes('textStyle').lineHeight as string | undefined) || '1.5'

  const toolbar = (
    <div className="site-rte-toolbar site-rte-toolbar--ribbon" role="toolbar" aria-label="Mise en forme">
      <div className="site-rte-ribbon-row">
        <div className="site-rte-block">
          <div className="site-rte-group">
            <ToolBtn
              label="Annuler"
              disabled={disabled || !editor.can().undo()}
              onClick={() => editor.chain().focus().undo().run()}
            >
              <Undo2 className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Rétablir"
              disabled={disabled || !editor.can().redo()}
              onClick={() => editor.chain().focus().redo().run()}
            >
              <Redo2 className="h-3.5 w-3.5" />
            </ToolBtn>
          </div>
          <span className="site-rte-block-label">Historique</span>
        </div>

        <span className="site-rte-sep" />

        <div className="site-rte-block">
          <div className="site-rte-group site-rte-group--wrap">
            <ToolSelect
              label="Police"
              className="site-rte-select--font"
              value={currentFont}
              disabled={disabled}
              onChange={(font) => {
                if (!font) editor.chain().focus().unsetFontFamily().run()
                else editor.chain().focus().setFontFamily(font).run()
              }}
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font.label} value={font.value}>
                  {font.label}
                </option>
              ))}
            </ToolSelect>
            <ToolSelect
              label="Taille"
              className="site-rte-select--size"
              value={FONT_SIZES.includes(currentSize as (typeof FONT_SIZES)[number]) ? currentSize : '16px'}
              disabled={disabled}
              onChange={(size) => editor.chain().focus().setFontSize(size).run()}
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size.replace('px', '')}
                </option>
              ))}
            </ToolSelect>
            <ToolBtn
              label="Gras"
              active={editor.isActive('bold')}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Italique"
              active={editor.isActive('italic')}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Souligné"
              active={editor.isActive('underline')}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Barré"
              active={editor.isActive('strike')}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Indice"
              active={editor.isActive('subscript')}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleSubscript().run()}
            >
              <SubscriptIcon className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Exposant"
              active={editor.isActive('superscript')}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
            >
              <SuperscriptIcon className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Effacer la mise en forme"
              disabled={disabled}
              onClick={() =>
                editor.chain().focus().unsetAllMarks().clearNodes().run()
              }
            >
              <Eraser className="h-3.5 w-3.5" />
            </ToolBtn>
          </div>
          <div className="site-rte-group site-rte-group--wrap">
            <ColorSwatches
              label="Couleur du texte"
              colors={TEXT_COLORS}
              disabled={disabled}
              onPick={(color) => editor.chain().focus().setColor(color).run()}
              onClear={() => editor.chain().focus().unsetColor().run()}
            />
            <ColorSwatches
              label="Surlignage"
              colors={HIGHLIGHT_COLORS}
              disabled={disabled}
              onPick={(color) =>
                editor.chain().focus().toggleHighlight({ color }).run()
              }
              onClear={() => editor.chain().focus().unsetHighlight().run()}
            />
            <ToolBtn
              label="Surlignage"
              active={editor.isActive('highlight')}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
            >
              <Highlighter className="h-3.5 w-3.5" />
            </ToolBtn>
          </div>
          <span className="site-rte-block-label">Police</span>
        </div>

        <span className="site-rte-sep" />

        <div className="site-rte-block">
          <div className="site-rte-group site-rte-group--wrap">
            <ToolBtn
              label="Paragraphe"
              active={editor.isActive('paragraph')}
              disabled={disabled}
              onClick={() => editor.chain().focus().setParagraph().run()}
            >
              <Pilcrow className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Titre 1"
              active={editor.isActive('heading', { level: 1 })}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <Heading1 className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Titre 2"
              active={editor.isActive('heading', { level: 2 })}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Titre 3"
              active={editor.isActive('heading', { level: 3 })}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <Heading3 className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Titre 4"
              active={editor.isActive('heading', { level: 4 })}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            >
              <Heading4 className="h-3.5 w-3.5" />
            </ToolBtn>
          </div>
          <span className="site-rte-block-label">Styles</span>
        </div>

        <span className="site-rte-sep" />

        <div className="site-rte-block">
          <div className="site-rte-group site-rte-group--wrap">
            <ToolBtn
              label="Aligner à gauche"
              active={editor.isActive({ textAlign: 'left' })}
              disabled={disabled}
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Centrer"
              active={editor.isActive({ textAlign: 'center' })}
              disabled={disabled}
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Aligner à droite"
              active={editor.isActive({ textAlign: 'right' })}
              disabled={disabled}
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
            >
              <AlignRight className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Justifier"
              active={editor.isActive({ textAlign: 'justify' })}
              disabled={disabled}
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            >
              <AlignJustify className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Liste à puces"
              active={editor.isActive('bulletList')}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Liste numérotée"
              active={editor.isActive('orderedList')}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Liste de tâches"
              active={editor.isActive('taskList')}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
            >
              <ListChecks className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Augmenter le retrait"
              disabled={disabled || !editor.can().sinkListItem('listItem')}
              onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
            >
              <IndentIncrease className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Diminuer le retrait"
              disabled={disabled || !editor.can().liftListItem('listItem')}
              onClick={() => editor.chain().focus().liftListItem('listItem').run()}
            >
              <IndentDecrease className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Citation"
              active={editor.isActive('blockquote')}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Ligne horizontale"
              disabled={disabled}
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <Minus className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolSelect
              label="Interligne"
              className="site-rte-select--size"
              value={
                LINE_HEIGHTS.some((item) => item.value === currentLineHeight)
                  ? currentLineHeight
                  : '1.5'
              }
              disabled={disabled}
              onChange={(height) => editor.chain().focus().setLineHeight(height).run()}
            >
              {LINE_HEIGHTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </ToolSelect>
          </div>
          <span className="site-rte-block-label">Paragraphe</span>
        </div>

        <span className="site-rte-sep" />

        <div className="site-rte-block">
          <div className="site-rte-group site-rte-group--wrap">
            <ToolBtn
              label="Lien"
              active={editor.isActive('link')}
              disabled={disabled}
              onClick={setLink}
            >
              <Link2 className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Retirer le lien"
              disabled={disabled || !editor.isActive('link')}
              onClick={() => editor.chain().focus().unsetLink().run()}
            >
              <Unlink className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Insérer une image"
              disabled={disabled}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn
              label="Insérer un tableau"
              active={editor.isActive('table')}
              disabled={disabled}
              onClick={insertTable}
            >
              <Table2 className="h-3.5 w-3.5" />
            </ToolBtn>
          </div>
          <span className="site-rte-block-label">Insertion</span>
        </div>
      </div>
    </div>
  )

  return (
    <div
      className={cn(
        'site-rte',
        isDocument && 'site-rte--document',
        disabled && 'is-disabled'
      )}
    >
      {toolbar}

      {isDocument ? (
        <div className="site-rte-stage">
          <div className="site-rte-page">
            {documentHeader}
            <EditorContent editor={editor} />
          </div>
        </div>
      ) : (
        <EditorContent editor={editor} />
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void uploadImage(file)
          event.target.value = ''
        }}
      />
    </div>
  )
}
