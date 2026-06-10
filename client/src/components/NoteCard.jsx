import { useState } from 'react';
import { Pin, PinOff, Palette, Tag, Archive, ArchiveRestore, Trash2, Check } from 'lucide-react';
import { useNotes } from '../notes/NotesContext.jsx';
import ColorPicker from './ColorPicker.jsx';
import LabelPicker from './LabelPicker.jsx';
import AttachmentGrid from './AttachmentGrid.jsx';
import ImageButton from './ImageButton.jsx';

// A single note in the grid. Clicking the body opens the editor modal; toolbar
// buttons and checklist checkboxes stop propagation so they don't also open it.
// Checklist items can be checked right here; text editing happens in the modal.

// How many checklist items to preview on a card before collapsing the rest into
// a "+ N more" line. The full list is always available in the editor modal.
const CARD_ITEM_LIMIT = 8;

export default function NoteCard({ note, onOpen }) {
  const { updateNote, deleteNote, updateItem, uploadAttachment } = useNotes();
  const [showColors, setShowColors] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const stop = (e) => e.stopPropagation();

  const sortedItems = [...note.items].sort((a, b) => (a.checked ? 1 : 0) - (b.checked ? 1 : 0));
  const shownItems = sortedItems.slice(0, CARD_ITEM_LIMIT);
  const hiddenCount = sortedItems.length - shownItems.length;

  return (
    <div
      className="note-card"
      style={{ background: `var(--note-${note.color})` }}
      onClick={() => onOpen(note)}
    >
      <button
        className={`note-pin${note.pinned ? ' active' : ''}`}
        aria-label={note.pinned ? 'Unpin' : 'Pin'}
        onClick={(e) => {
          stop(e);
          updateNote(note.id, { pinned: !note.pinned });
        }}
      >
        {note.pinned ? <Pin size={18} /> : <PinOff size={18} />}
      </button>

      <AttachmentGrid attachments={note.attachments} />

      {note.title && <div className="note-title">{note.title}</div>}

      {note.type === 'list' ? (
        <ul className="note-checklist">
          {shownItems.map((it) => (
            <li key={it.id} className={`note-checklist-item${it.checked ? ' checked' : ''}`}>
              <button
                className="checkbox"
                aria-label={it.checked ? 'Uncheck item' : 'Check item'}
                aria-pressed={it.checked ? 'true' : 'false'}
                onClick={(e) => {
                  stop(e);
                  updateItem(note.id, it.id, { checked: !it.checked });
                }}
              >
                {it.checked ? <Check size={14} /> : null}
              </button>
              <span>{it.content}</span>
            </li>
          ))}
          {hiddenCount > 0 && <li className="note-checklist-more">+ {hiddenCount} more</li>}
        </ul>
      ) : (
        note.body && <div className="note-body">{note.body}</div>
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

      <div className="note-toolbar" onClick={stop}>
        <button className="icon-btn" aria-label="Change color" onClick={() => setShowColors((s) => !s)}>
          <Palette size={18} />
        </button>
        <button className="icon-btn" aria-label="Labels" onClick={() => setShowLabels((s) => !s)}>
          <Tag size={18} />
        </button>
        <ImageButton onSelect={(file) => uploadAttachment(note.id, file)} />
        {note.archived ? (
          <button
            className="icon-btn"
            aria-label="Unarchive"
            onClick={() => updateNote(note.id, { archived: false })}
          >
            <ArchiveRestore size={18} />
          </button>
        ) : (
          <button
            className="icon-btn"
            aria-label="Archive"
            onClick={() => updateNote(note.id, { archived: true })}
          >
            <Archive size={18} />
          </button>
        )}
        <button className="icon-btn" aria-label="Delete" onClick={() => deleteNote(note.id)}>
          <Trash2 size={18} />
        </button>
      </div>

      {showColors && (
        <div onClick={stop}>
          <ColorPicker
            value={note.color}
            onSelect={(color) => {
              updateNote(note.id, { color });
              setShowColors(false);
            }}
          />
        </div>
      )}

      {showLabels && <LabelPicker note={note} />}
    </div>
  );
}
