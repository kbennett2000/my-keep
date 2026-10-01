import { COLORS, swatchStyle } from '../notes/noteColor.js';

// Row of note-color swatches (see notes/noteColor.js for the palette).
// Selecting one fires onSelect(name).

export default function ColorPicker({ value, onSelect }) {
  return (
    <div className="color-picker" role="group" aria-label="Note color">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className={`color-swatch${value === c ? ' selected' : ''}`}
          style={swatchStyle(c)}
          aria-label={c}
          title={c}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(c);
          }}
        />
      ))}
    </div>
  );
}
