import { useState, useEffect, useRef } from 'react';
import { Pin, PinOff, Palette, Tag, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useNotes } from '../notes/NotesContext.jsx';
import ColorPicker from './ColorPicker.jsx';
import LabelPicker from './LabelPicker.jsx';
import ChecklistEditor from './ChecklistEditor.jsx';

// Full-note editor. Title/body are edited locally and persisted with a single
// PATCH on close; color, pin, archive, and checklist item ops persist
// immediately (so they're reflected on the card behind the modal). Esc or a
// backdrop click closes.

export default function NoteEditorModal({ note, onClose }) {
  const { updateNote, deleteNote, addItem, updateItem, deleteItem } = useNotes();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [showColors, setShowColors] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  // Hold the latest title/body in a ref so the unmount-time save sees them.
  const latest = useRef({ title, body });
  latest.current = { title, body };

  function persistText() {
    const patch = {};
    if (latest.current.title !== note.title) patch.title = latest.current.title;
    if (latest.current.body !== note.body) patch.body = latest.current.body;
    if (Object.keys(patch).length) updateNote(note.id, patch);
  }

  function close() {
    persistText();
    onClose();
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleArchive() {
    await updateNote(note.id, { archived: !note.archived });
    onClose();
  }
  async function remove() {
    await deleteNote(note.id);
    onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div
        className="modal note-card"
        style={{ background: `var(--note-${note.color})` }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className={`note-pin${note.pinned ? ' active' : ''}`}
          aria-label={note.pinned ? 'Unpin' : 'Pin'}
          onClick={() => updateNote(note.id, { pinned: !note.pinned })}
        >
          {note.pinned ? <Pin size={18} /> : <PinOff size={18} />}
        </button>

        <input
          className="modal-title"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {note.type === 'list' ? (
          <ChecklistEditor
            items={note.items}
            onToggle={(it) => updateItem(note.id, it.id, { checked: !it.checked })}
            onCommitText={(it, content) => updateItem(note.id, it.id, { content })}
            onDelete={(it) => deleteItem(note.id, it.id)}
            onAdd={(content) => addItem(note.id, content)}
          />
        ) : (
          <textarea
            className="modal-body"
            placeholder="Take a note…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
          />
        )}

        {note.labels.length > 0 && (
          <div className="note-labels">
            {note.labels.map((l) => (
              <span key={l.id} className="note-label-chip">
                {l.name}
              </span>
            ))}
          </div>
        )}

        <div className="modal-toolbar">
          <button className="icon-btn" aria-label="Change color" onClick={() => setShowColors((s) => !s)}>
            <Palette size={18} />
          </button>
          <button className="icon-btn" aria-label="Labels" onClick={() => setShowLabels((s) => !s)}>
            <Tag size={18} />
          </button>
          <button
            className="icon-btn"
            aria-label={note.archived ? 'Unarchive' : 'Archive'}
            onClick={toggleArchive}
          >
            {note.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
          </button>
          <button className="icon-btn" aria-label="Delete" onClick={remove}>
            <Trash2 size={18} />
          </button>
          <div className="composer-spacer" />
          <button className="composer-save" onClick={close}>
            Close
          </button>
        </div>

        {showColors && (
          <ColorPicker
            value={note.color}
            onSelect={(color) => {
              updateNote(note.id, { color });
              setShowColors(false);
            }}
          />
        )}

        {showLabels && <LabelPicker note={note} />}
      </div>
    </div>
  );
}
