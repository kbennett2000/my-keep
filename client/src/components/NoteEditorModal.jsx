import { useState, useEffect, useRef } from 'react';
import { Pin, PinOff, Palette, Tag, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useNotes } from '../notes/NotesContext.jsx';
import ColorPicker from './ColorPicker.jsx';
import LabelPicker from './LabelPicker.jsx';
import ChecklistEditor from './ChecklistEditor.jsx';
import AttachmentGrid from './AttachmentGrid.jsx';
import ImageButton from './ImageButton.jsx';
import RichTextEditor from './RichTextEditor.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { bodyToEditorHtml, isBodyEmpty } from '../notes/richText.js';
import { formatNoteTimestamp } from '../notes/datetime.js';

// Full-note editor. Title/body are edited locally and persisted with a single
// PATCH on close; color, pin, archive, and checklist item ops persist
// immediately (so they're reflected on the card behind the modal). Esc or a
// backdrop click closes.

export default function NoteEditorModal({ note, onClose }) {
  const { updateNote, deleteNote, addItem, updateItem, deleteItem, uploadAttachment, deleteAttachment } =
    useNotes();
  const [title, setTitle] = useState(note.title);
  // Seed the rich-text editor once (converting legacy plain text to HTML). We
  // compare against this seed to tell whether the body was actually edited, so
  // merely opening a legacy note doesn't rewrite it as HTML.
  const initialBodyHtml = useRef(bodyToEditorHtml(note.body)).current;
  const [body, setBody] = useState(initialBodyHtml);
  const [showColors, setShowColors] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Hold the latest title/body in a ref so the unmount-time save sees them.
  const latest = useRef({ title, body });
  latest.current = { title, body };
  // So the Esc handler can tell whether the confirm dialog is open (Esc should
  // close the confirm, not the whole editor).
  const confirmingRef = useRef(false);
  confirmingRef.current = confirmingDelete;

  function persistText() {
    const patch = {};
    if (latest.current.title !== note.title) patch.title = latest.current.title;
    if (latest.current.body !== initialBodyHtml) {
      patch.body = isBodyEmpty(latest.current.body) ? '' : latest.current.body;
    }
    if (Object.keys(patch).length) updateNote(note.id, patch);
  }

  function close() {
    persistText();
    onClose();
  }

  useEffect(() => {
    const onKey = (e) => {
      // While the delete confirmation is open, Esc closes that, not the editor.
      if (e.key === 'Escape' && !confirmingRef.current) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleArchive() {
    await updateNote(note.id, { archived: !note.archived });
    onClose();
  }
  async function confirmRemove() {
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

        <AttachmentGrid
          attachments={note.attachments}
          onDelete={(a) => deleteAttachment(note.id, a.id)}
        />

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
          <RichTextEditor value={initialBodyHtml} onChange={setBody} />
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
          <ImageButton onSelect={(file) => uploadAttachment(note.id, file)} />
          <button
            className="icon-btn"
            aria-label={note.archived ? 'Unarchive' : 'Archive'}
            onClick={toggleArchive}
          >
            {note.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
          </button>
          <button className="icon-btn" aria-label="Delete" onClick={() => setConfirmingDelete(true)}>
            <Trash2 size={18} />
          </button>
          {note.updated_at && (
            <span className="modal-timestamp">Edited {formatNoteTimestamp(note.updated_at)}</span>
          )}
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

        {confirmingDelete && (
          <ConfirmDialog
            message="Delete this note?"
            onConfirm={confirmRemove}
            onCancel={() => setConfirmingDelete(false)}
          />
        )}
      </div>
    </div>
  );
}
