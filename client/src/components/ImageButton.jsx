import { useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';

// Icon button that opens a file picker and hands the chosen image to onSelect.
// The <input> is hidden; the button drives it via a ref. Resets after each pick
// so selecting the same file twice still fires onChange.

export default function ImageButton({ onSelect }) {
  const inputRef = useRef(null);

  function onChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onSelect(file);
  }

  return (
    <>
      <button
        type="button"
        className="icon-btn"
        aria-label="Add image"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
      >
        <ImageIcon size={18} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="Upload image"
        className="visually-hidden"
        onChange={onChange}
      />
    </>
  );
}
