// The Keep note palette and how to paint it. Names match the server's COLORS
// allow-list and the --note-* CSS variables in styles/theme.css.

export const COLORS = [
  'default', 'red', 'orange', 'yellow', 'green', 'teal',
  'blue', 'darkblue', 'purple', 'pink', 'brown', 'gray',
];

// Inline style for a surface in a note's color (card, editor, open composer).
// --note-<name> is the fill. Dark mode also defines --note-<name>-edge, the
// bright light-mode color, as the border; light mode leaves it undefined, so
// the border falls back to the usual hairline.
export function noteSurfaceStyle(color) {
  return {
    background: `var(--note-${color})`,
    borderColor: `var(--note-${color}-edge, var(--border))`,
  };
}

// A picker swatch shows the bright color in both themes: the edge in dark mode
// (the dark fills are too close together to tell apart), the fill in light.
export function swatchStyle(color) {
  return { background: `var(--note-${color}-edge, var(--note-${color}))` };
}
