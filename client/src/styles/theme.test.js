import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLORS } from '../notes/noteColor.js';

// Guards the note palette: every picker color has a CSS variable in both
// themes, dark-mode note text stays readable on every fill, and each dark
// "glow" edge is the note's light-mode color.

// Read from disk: Vitest stubs CSS imports (even ?raw) to an empty string, and
// jsdom's global URL isn't one node:fs accepts, so resolve from the string.
const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'theme.css'), 'utf8');

// The custom properties declared in the first block that opens with `selector {`.
function tokens(selector) {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

// WCAG 2 contrast ratio between two #rrggbb colors.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const light = tokens(':root');
const dark = tokens("[data-theme='dark']");

describe('note palette', () => {
  test.each(COLORS)('%s is defined in light and dark themes', (color) => {
    expect(light[`--note-${color}`]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(dark[`--note-${color}`]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  test.each(COLORS)('dark %s keeps note text readable (>= 4.5:1)', (color) => {
    expect(contrast(dark[`--note-${color}`], dark['--text'])).toBeGreaterThanOrEqual(4.5);
  });

  test.each(COLORS.filter((c) => c !== 'default'))('dark %s glows in its light-mode color', (color) => {
    expect(dark[`--note-${color}-edge`]).toBe(light[`--note-${color}`]);
  });
});
