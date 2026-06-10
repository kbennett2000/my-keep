import { Lightbulb, Archive, Tag } from 'lucide-react';
import { useNotes } from '../notes/NotesContext.jsx';

// Left navigation: Notes (active), Archive, then one entry per label. Selecting
// an entry sets the current view; the active entry is highlighted.

export default function Sidebar({ open }) {
  const { view, setView, labels } = useNotes();

  const isActive = (kind, labelId = null) =>
    view.kind === kind && (kind !== 'label' || view.labelId === labelId);

  const Item = ({ active, onClick, icon: Icon, children }) => (
    <button className={`sidebar-item${active ? ' active' : ''}`} onClick={onClick}>
      <Icon size={20} />
      <span className="sidebar-label">{children}</span>
    </button>
  );

  return (
    <nav className={`sidebar${open ? '' : ' collapsed'}`} aria-label="Views">
      <Item
        active={isActive('active')}
        onClick={() => setView({ kind: 'active', labelId: null })}
        icon={Lightbulb}
      >
        Notes
      </Item>

      {labels.map((l) => (
        <Item
          key={l.id}
          active={isActive('label', l.id)}
          onClick={() => setView({ kind: 'label', labelId: l.id })}
          icon={Tag}
        >
          {l.name}
        </Item>
      ))}

      <Item
        active={isActive('archive')}
        onClick={() => setView({ kind: 'archive', labelId: null })}
        icon={Archive}
      >
        Archive
      </Item>
    </nav>
  );
}
