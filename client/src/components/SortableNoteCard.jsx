import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import NoteCard from './NoteCard.jsx';

// Drag-sortable wrapper around NoteCard. The whole card is the drag handle; the
// PointerSensor's activation distance (set in Masonry) keeps plain clicks from
// starting a drag, so clicking still opens the editor.

export default function SortableNoteCard({ note, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Keep the dragged card above its neighbours and let the drop target show through.
    zIndex: isDragging ? 2 : undefined,
    opacity: isDragging ? 0.6 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-note${isDragging ? ' dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <NoteCard note={note} onOpen={onOpen} />
    </div>
  );
}
