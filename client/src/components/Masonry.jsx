import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { useNotes } from '../notes/NotesContext.jsx';
import NoteCard from './NoteCard.jsx';
import SortableNoteCard from './SortableNoteCard.jsx';

// Pinned notes first (under a "Pinned" header when any exist), then the rest.
// In the active/label views without a search, each group is drag-sortable
// (within itself); otherwise it renders as a plain grid. Layout is CSS columns.

function SortableGroup({ group, onOpen, sensors, onReorder }) {
  function onDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const oldIndex = group.findIndex((n) => n.id === active.id);
    const newIndex = group.findIndex((n) => n.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(group, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={group.map((n) => n.id)} strategy={rectSortingStrategy}>
        <div className="masonry">
          {group.map((n) => (
            <SortableNoteCard key={n.id} note={n} onOpen={onOpen} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default function Masonry({ notes, onOpen }) {
  const { view, query, reorderNotes } = useNotes();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const sortable = (view.kind === 'active' || view.kind === 'label') && !query.trim();

  const pinned = notes.filter((n) => n.pinned);
  const others = notes.filter((n) => !n.pinned);

  if (notes.length === 0) {
    return <p className="empty-state">Notes you add appear here.</p>;
  }

  const plainGrid = (list) => (
    <div className="masonry">
      {list.map((n) => (
        <NoteCard key={n.id} note={n} onOpen={onOpen} />
      ))}
    </div>
  );

  const grid = (list) =>
    sortable ? (
      <SortableGroup group={list} onOpen={onOpen} sensors={sensors} onReorder={reorderNotes} />
    ) : (
      plainGrid(list)
    );

  return (
    <div className="masonry-wrap">
      {pinned.length > 0 && (
        <>
          <h2 className="group-label">Pinned</h2>
          {grid(pinned)}
          {others.length > 0 && <h2 className="group-label">Others</h2>}
        </>
      )}
      {others.length > 0 && grid(others)}
    </div>
  );
}
