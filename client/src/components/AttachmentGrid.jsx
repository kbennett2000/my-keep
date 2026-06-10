import { X } from 'lucide-react';

// Renders a note's image attachments. Same-origin <img> requests send the
// session cookie automatically, so the owner-scoped /api/attachments/:id
// endpoint serves them. Pass onDelete to show a per-image delete overlay (the
// modal does; the card shows read-only thumbnails).

export default function AttachmentGrid({ attachments, onDelete }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="attachment-grid">
      {attachments.map((a) => (
        <div key={a.id} className="attachment">
          <img src={a.url} alt="Note attachment" loading="lazy" />
          {onDelete && (
            <button
              className="attachment-delete"
              aria-label="Delete image"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(a);
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
