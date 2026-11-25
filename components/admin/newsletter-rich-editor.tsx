'use client'

import { useCallback, useEffect, type ReactNode } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  placeholder?: string
}

const TEXT_COLORS = ['#12301e', '#000000', '#1f6b42', '#1d4ed8', '#be123c', '#c2410c'] as const
const HIGHLIGHT_COLORS = ['#fef08a', '#bbf7d0', '#bae6fd', '#fecaca'] as const

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
      className={cn('nl-rte-btn', active && 'is-active')}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <span className="nl-rte-sep" aria-hidden />
}

export function NewsletterRichEditor({
  value,
  onChange,
  disabled,
  placeholder = 'Rédigez le contenu de l’alerte officielle…',
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'nl-rte-content',
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

  if (!editor) {
    return <div className="nl-rte is-loading">Chargement de l’éditeur…</div>
  }

  return (
    <div className={cn('nl-rte', disabled && 'is-disabled')}>
      <div className="nl-rte-toolbar" role="toolbar" aria-label="Mise en forme du message">
        <ToolBtn label="Annuler" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn label="Rétablir" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <Sep />
        <ToolBtn
          label="Gras"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn
          label="Italique"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn
          label="Souligné"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn
          label="Barré"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolBtn>
        <Sep />
        <ToolBtn
          label="Titre"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn
          label="Sous-titre"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn
          label="Paragraphe"
          active={editor.isActive('paragraph')}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow className="h-3.5 w-3.5" />
        </ToolBtn>
        <Sep />
        <ToolBtn
          label="Liste à puces"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn
          label="Liste numérotée"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn
          label="Citation"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn label="Séparateur" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-3.5 w-3.5" />
        </ToolBtn>
        <Sep />
        <ToolBtn
          label="Aligner à gauche"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn
          label="Centrer"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn
          label="Aligner à droite"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn
          label="Justifier"
          active={editor.isActive({ textAlign: 'justify' })}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustify className="h-3.5 w-3.5" />
        </ToolBtn>
        <Sep />
        <ToolBtn label="Lien" active={editor.isActive('link')} onClick={setLink}>
          <Link2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn
          label="Retirer le lien"
          disabled={!editor.isActive('link')}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <Unlink className="h-3.5 w-3.5" />
        </ToolBtn>
        <Sep />
        <label className="nl-rte-color" title="Couleur du texte">
          <span className="sr-only">Couleur du texte</span>
          <input
            type="color"
            value={(editor.getAttributes('textStyle').color as string) || '#12301e'}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            list="nl-rte-text-colors"
          />
        </label>
        <datalist id="nl-rte-text-colors">
          {TEXT_COLORS.map((color) => (
            <option key={color} value={color} />
          ))}
        </datalist>
        <ToolBtn
          label="Surlignage"
          active={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight({ color: HIGHLIGHT_COLORS[0] }).run()}
        >
          <Highlighter className="h-3.5 w-3.5" />
        </ToolBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

/** Texte brut pour validation (ignore le HTML vide TipTap). */
export function newsletterBodyPlainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}
