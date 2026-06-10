import { useState } from 'react';
import { Check } from 'lucide-react';
import { useNotes } from '../notes/NotesContext.jsx';

// Per-note label popover: each of the user's labels as a checkbox row (checked =
// already on this note); toggling assigns/unassigns. The bottom input creates a
// new label and assigns it in one step.

export default function LabelPicker({ note }) {
  const { labels, assignLabel, unassignLabel, createLabel } = useNotes();
  const [draft, setDraft] = useState('');
  const assigned = new Set(note.labels.map((l) => l.id));

  function toggle(label) {
    if (assigned.has(label.id)) unassignLabel(note.id, label.id);
    else assignLabel(note.id, label.id);
  }

  async function createAndAssign() {
    const name = draft.trim();
    if (!name) return;
    const label = await createLabel(name);
    setDraft('');
    if (label?.id) assignLabel(note.id, label.id);
  }

  return (
    <div className="label-picker" onClick={(e) => e.stopPropagation()}>
      <div className="label-picker-list">
        {labels.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`label-picker-row${assigned.has(l.id) ? ' on' : ''}`}
            onClick={() => toggle(l)}
          >
            <span className="checkbox">{assigned.has(l.id) ? <Check size={14} /> : null}</span>
            <span className="label-picker-name">{l.name}</span>
          </button>
        ))}
        {labels.length === 0 && <p className="label-picker-empty">No labels yet.</p>}
      </div>
      <div className="label-picker-create">
        <input
          placeholder="Create new label"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              createAndAssign();
            }
          }}
        />
      </div>
    </div>
  );
}
