import { useState, useRef } from 'react';
import { ListChecks, Type, Palette } from 'lucide-react';
import { useNotes } from '../notes/NotesContext.jsx';
import { isBodyEmpty } from '../notes/richText.js';
import ColorPicker from './ColorPicker.jsx';
import ChecklistEditor from './ChecklistEditor.jsx';
import RichTextEditor from './RichTextEditor.jsx';

// "Take a note…" box. Collapsed it's a single line; expanded it edits a title
// plus either a body (text note) or a checklist. Items are held locally with
// temporary ids and sent inline when the note is created.

const emptyDraft = { mode: 'text', title: '', body: '', color: 'default', items: [] };

export default function Composer() {
  const { createNote } = useNotes();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [showColors, setShowColors] = useState(false);
  const tempId = useRef(-1); // negative ids for not-yet-saved items

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  function reset() {
    setDraft(emptyDraft);
    setShowColors(false);
    setOpen(false);
  }

  async function save() {
    const items = draft.items.map((i) => ({ content: i.content, checked: i.checked }));
    const hasContent =
      draft.title.trim() || !isBodyEmpty(draft.body) || items.some((i) => i.content.trim());
    if (hasContent) {
      const payload =
        draft.mode === 'list'
          ? { type: 'list', title: draft.title, color: draft.color, items }
          : {
              type: 'text',
              title: draft.title,
              body: isBodyEmpty(draft.body) ? '' : draft.body,
              color: draft.color,
            };
      await createNote(payload);
    }
    reset();
  }

  // --- local checklist callbacks ---
  const addItem = (content) =>
    set({ items: [...draft.items, { id: tempId.current--, content, checked: false }] });
  const toggleItem = (item) =>
    set({ items: draft.items.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)) });
  const commitText = (item, content) =>
    set({ items: draft.items.map((i) => (i.id === item.id ? { ...i, content } : i)) });
  const deleteItem = (item) => set({ items: draft.items.filter((i) => i.id !== item.id) });

  if (!open) {
    return (
      <div className="composer collapsed">
        <button className="composer-open" onClick={() => setOpen(true)}>
          Take a note…
        </button>
        <button
          className="icon-btn"
          aria-label="New list"
          onClick={() => {
            setDraft({ ...emptyDraft, mode: 'list' });
            setOpen(true);
          }}
        >
          <ListChecks size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="composer open" style={{ background: `var(--note-${draft.color})` }}>
      <input
        className="composer-title"
        placeholder="Title"
        value={draft.title}
        onChange={(e) => set({ title: e.target.value })}
        autoFocus
      />

      {draft.mode === 'list' ? (
        <ChecklistEditor
          items={draft.items}
          onToggle={toggleItem}
          onCommitText={commitText}
          onDelete={deleteItem}
          onAdd={addItem}
        />
      ) : (
        <RichTextEditor value={draft.body} onChange={(html) => set({ body: html })} />
      )}

      <div className="composer-toolbar">
        <button
          className="icon-btn"
          aria-label={draft.mode === 'list' ? 'Switch to text' : 'Switch to checklist'}
          onClick={() => set({ mode: draft.mode === 'list' ? 'text' : 'list' })}
        >
          {draft.mode === 'list' ? <Type size={18} /> : <ListChecks size={18} />}
        </button>
        <button className="icon-btn" aria-label="Change color" onClick={() => setShowColors((s) => !s)}>
          <Palette size={18} />
        </button>
        <div className="composer-spacer" />
        <button className="composer-save" onClick={save}>
          Save
        </button>
      </div>

      {showColors && <ColorPicker value={draft.color} onSelect={(color) => set({ color })} />}
    </div>
  );
}
