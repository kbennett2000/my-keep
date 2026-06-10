import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough } from 'lucide-react';

// WYSIWYG body editor matching Keep's basics: bold / italic / underline /
// strikethrough. StarterKit is trimmed to inline formatting only (no headings,
// lists, code blocks, etc.) so typing "# " or "- " doesn't surprise-format.
// Emits HTML via onChange; `value` seeds the content once on mount.

const EXTENSIONS = [
  StarterKit.configure({
    heading: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    blockquote: false,
    codeBlock: false,
    code: false,
    horizontalRule: false,
    link: false,
  }),
];

export default function RichTextEditor({ value, onChange, autoFocus = false }) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value || '',
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor: e }) => onChange?.(e.getHTML()),
    editorProps: { attributes: { class: 'rte-content', 'aria-label': 'Note body' } },
  });

  if (!editor) return null;

  const Btn = ({ label, active, run, icon: Icon }) => (
    <button
      type="button"
      className={`icon-btn${active ? ' active' : ''}`}
      aria-label={label}
      aria-pressed={active ? 'true' : 'false'}
      // Keep the editor's text selection when clicking a format button.
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
    >
      <Icon size={18} />
    </button>
  );

  return (
    <div className="rte">
      <div className="rte-toolbar">
        <Btn
          label="Bold"
          active={editor.isActive('bold')}
          run={() => editor.chain().focus().toggleBold().run()}
          icon={Bold}
        />
        <Btn
          label="Italic"
          active={editor.isActive('italic')}
          run={() => editor.chain().focus().toggleItalic().run()}
          icon={Italic}
        />
        <Btn
          label="Underline"
          active={editor.isActive('underline')}
          run={() => editor.chain().focus().toggleUnderline().run()}
          icon={UnderlineIcon}
        />
        <Btn
          label="Strikethrough"
          active={editor.isActive('strike')}
          run={() => editor.chain().focus().toggleStrike().run()}
          icon={Strikethrough}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
