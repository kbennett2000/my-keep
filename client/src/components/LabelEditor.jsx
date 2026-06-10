import { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useNotes } from '../notes/NotesContext.jsx';

// Modal to manage all labels: create new ones, rename inline (commit on
// blur/Enter), and delete. Esc or backdrop click closes.

function LabelRow({ label, onRename, onDelete }) {
  const [name, setName] = useState(label.name);
  useEffect(() => setName(label.name), [label.name]);
  return (
    <div className="label-editor-row">
      <input
        value={name}
        aria-label={`Rename ${label.name}`}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== label.name && onRename(label.id, name.trim())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      />
      <button className="icon-btn" aria-label={`Delete ${label.name}`} onClick={() => onDelete(label.id)}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function LabelEditor({ onClose }) {
  const { labels, createLabel, renameLabel, deleteLabel } = useNotes();
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function create() {
    const name = draft.trim();
    if (!name) return;
    await createLabel(name);
    setDraft('');
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal label-editor" onMouseDown={(e) => e.stopPropagation()}>
        <div className="label-editor-head">
          <h2>Edit labels</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="label-editor-create">
          <input
            placeholder="Create new label"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                create();
              }
            }}
          />
          <button className="icon-btn" aria-label="Add label" onClick={create}>
            <Plus size={18} />
          </button>
        </div>

        <div className="label-editor-list">
          {labels.map((l) => (
            <LabelRow key={l.id} label={l} onRename={renameLabel} onDelete={deleteLabel} />
          ))}
          {labels.length === 0 && <p className="label-picker-empty">No labels yet — create one above.</p>}
        </div>
      </div>
    </div>
  );
}
