import NoteCard from './NoteCard.jsx';

// Pinned notes first (under a "Pinned" header when any exist), then the rest.
// Layout is CSS columns — lightweight and offline; true drag-reorder (a real
// grid) is Slice 7.

export default function Masonry({ notes, onOpen }) {
  const pinned = notes.filter((n) => n.pinned);
  const others = notes.filter((n) => !n.pinned);

  if (notes.length === 0) {
    return <p className="empty-state">Notes you add appear here.</p>;
  }

  const grid = (list) => (
    <div className="masonry">
      {list.map((n) => (
        <NoteCard key={n.id} note={n} onOpen={onOpen} />
      ))}
    </div>
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
