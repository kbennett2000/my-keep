// Row of note-color swatches. Names match the server's COLORS allow-list and
// the --note-* CSS variables. Selecting one fires onSelect(name).

const COLORS = [
  'default', 'red', 'orange', 'yellow', 'green', 'teal',
  'blue', 'darkblue', 'purple', 'pink', 'brown', 'gray',
];

export default function ColorPicker({ value, onSelect }) {
  return (
    <div className="color-picker" role="group" aria-label="Note color">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className={`color-swatch${value === c ? ' selected' : ''}`}
          style={{ background: `var(--note-${c})` }}
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
