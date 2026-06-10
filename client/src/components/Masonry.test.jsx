import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Masonry (and the NoteCards inside) read useNotes; provide a full-enough stub.
const ctx = {
  view: { kind: 'active', labelId: null },
  query: '',
  reorderNotes: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  updateItem: vi.fn(),
  labels: [],
  assignLabel: vi.fn(),
  unassignLabel: vi.fn(),
  createLabel: vi.fn(),
};
vi.mock('../notes/NotesContext.jsx', () => ({ useNotes: () => ctx }));

import Masonry from './Masonry.jsx';

const note = (over) => ({
  id: 1,
  type: 'text',
  title: 't',
  body: 'b',
  color: 'default',
  pinned: 0,
  archived: 0,
  items: [],
  labels: [],
  attachments: [],
  position: 1,
  ...over,
});

describe('Masonry', () => {
  test('renders cards in the sortable (active) view', () => {
    ctx.view = { kind: 'active', labelId: null };
    ctx.query = '';
    render(<Masonry notes={[note({ id: 1, title: 'one' }), note({ id: 2, title: 'two' })]} onOpen={() => {}} />);
    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
  });

  test('renders cards in the non-sortable (archive) view', () => {
    ctx.view = { kind: 'archive', labelId: null };
    ctx.query = '';
    render(<Masonry notes={[note({ id: 3, title: 'arch', archived: 1 })]} onOpen={() => {}} />);
    expect(screen.getByText('arch')).toBeInTheDocument();
  });

  test('shows the empty state when there are no notes', () => {
    ctx.view = { kind: 'active', labelId: null };
    render(<Masonry notes={[]} onOpen={() => {}} />);
    expect(screen.getByText('Notes you add appear here.')).toBeInTheDocument();
  });
});
