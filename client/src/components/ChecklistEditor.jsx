import { useState, useEffect } from 'react';
import { Check, X, Plus } from 'lucide-react';

// Editable checklist shared by the composer (local, unsaved items) and the
// editor modal (persisted items). Purely presentational: the parent supplies
// callbacks and decides whether they mutate local state or hit the API.
//
// Each row keeps its own text state for responsive typing and commits on blur /
// Enter, so persisted use doesn't fire an API call per keystroke. Checked items
// sink to the bottom, matching Keep.

function ItemRow({ item, onToggle, onCommitText, onDelete }) {
  const [text, setText] = useState(item.content);
  useEffect(() => setText(item.content), [item.content]);

  return (
    <div className={`checklist-item${item.checked ? ' checked' : ''}`}>
      <button
        type="button"
        className="checkbox"
        aria-label={item.checked ? 'Uncheck item' : 'Check item'}
        aria-pressed={item.checked ? 'true' : 'false'}
        onClick={() => onToggle(item)}
      >
        {item.checked ? <Check size={14} /> : null}
      </button>
      <input
        className="checklist-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== item.content && onCommitText(item, text)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      />
      <button type="button" className="icon-btn" aria-label="Delete item" onClick={() => onDelete(item)}>
        <X size={14} />
      </button>
    </div>
  );
}

export default function ChecklistEditor({ items, onToggle, onCommitText, onDelete, onAdd }) {
  const [draft, setDraft] = useState('');
  const sorted = [...items].sort((a, b) => (a.checked ? 1 : 0) - (b.checked ? 1 : 0));

  function add() {
    const t = draft.trim();
    if (!t) return;
    onAdd(t);
    setDraft('');
  }

  return (
    <div className="checklist">
      {sorted.map((it) => (
        <ItemRow
          key={it.id}
          item={it}
          onToggle={onToggle}
          onCommitText={onCommitText}
          onDelete={onDelete}
        />
      ))}
      <div className="checklist-add">
        <Plus size={16} className="checklist-add-icon" />
        <input
          className="checklist-text"
          placeholder="List item"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
        />
      </div>
    </div>
  );
}
