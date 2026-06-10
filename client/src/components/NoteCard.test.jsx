import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const notes = { updateNote: vi.fn(), deleteNote: vi.fn(), updateItem: vi.fn() };
vi.mock('../notes/NotesContext.jsx', () => ({ useNotes: () => notes }));

import NoteCard from './NoteCard.jsx';

const textNote = {
  id: 7,
  type: 'text',
  title: 'Groceries',
  body: 'milk and eggs',
  color: 'default',
  pinned: 0,
  labels: [{ id: 1, name: 'home' }],
  items: [],
  attachments: [],
};

const listNote = {
  id: 8,
  type: 'list',
  title: 'Todo',
  body: '',
  color: 'default',
  pinned: 0,
  labels: [],
  items: [{ id: 11, content: 'wash car', checked: 0 }],
  attachments: [],
};

beforeEach(() => {
  notes.updateNote.mockClear();
  notes.deleteNote.mockClear();
  notes.updateItem.mockClear();
});

describe('NoteCard', () => {
  test('renders title, body, and label chip', () => {
    render(<NoteCard note={textNote} onOpen={() => {}} />);
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('milk and eggs')).toBeInTheDocument();
    expect(screen.getByText('home')).toBeInTheDocument();
  });

  test('clicking the body opens the note', () => {
    const onOpen = vi.fn();
    render(<NoteCard note={textNote} onOpen={onOpen} />);
    fireEvent.click(screen.getByText('Groceries'));
    expect(onOpen).toHaveBeenCalledWith(textNote);
  });

  test('toolbar pin / archive call the right actions (and not onOpen)', () => {
    const onOpen = vi.fn();
    render(<NoteCard note={textNote} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(notes.updateNote).toHaveBeenCalledWith(7, { pinned: true });
    expect(notes.updateNote).toHaveBeenCalledWith(7, { archived: true });
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('delete asks for confirmation before deleting', () => {
    const onOpen = vi.fn();
    render(<NoteCard note={textNote} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' })); // toolbar trash
    // Nothing deleted yet — a confirmation appears instead, and the card didn't open.
    expect(notes.deleteNote).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Delete this note?');
    // Confirming deletes.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(notes.deleteNote).toHaveBeenCalledWith(7);
  });

  test('cancelling the confirmation keeps the note', () => {
    render(<NoteCard note={textNote} onOpen={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));
    expect(notes.deleteNote).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  test('checking a list item calls updateItem', () => {
    render(<NoteCard note={listNote} onOpen={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Check item' }));
    expect(notes.updateItem).toHaveBeenCalledWith(8, 11, { checked: true });
  });

  test('an archived note shows Unarchive and restores it', () => {
    const archived = { ...textNote, archived: 1 };
    render(<NoteCard note={archived} onOpen={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Unarchive' }));
    expect(notes.updateNote).toHaveBeenCalledWith(7, { archived: false });
  });

  test('renders a rich-text body as formatted HTML', () => {
    const rich = { ...textNote, body: '<p>hello <strong>bold</strong></p>' };
    const { container } = render(<NoteCard note={rich} onOpen={() => {}} />);
    expect(container.querySelector('.note-body strong')).toHaveTextContent('bold');
  });

  test('sanitizes a malicious body (strips <script>)', () => {
    const evil = { ...textNote, body: '<p>safe</p><script>alert(1)</script>' };
    const { container } = render(<NoteCard note={evil} onOpen={() => {}} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('.note-body')).toHaveTextContent('safe');
  });

  test('a long checklist is capped to a preview with "+ N more"', () => {
    const items = Array.from({ length: 11 }, (_, i) => ({ id: 100 + i, content: `item ${i}`, checked: 0 }));
    const big = { ...listNote, items };
    render(<NoteCard note={big} onOpen={() => {}} />);
    // 8 shown (the cap), so item 7 is visible but item 8 is collapsed.
    expect(screen.getByText('item 7')).toBeInTheDocument();
    expect(screen.queryByText('item 8')).toBeNull();
    expect(screen.getByText('+ 3 more')).toBeInTheDocument();
    // A shown item's checkbox still works.
    fireEvent.click(screen.getAllByRole('button', { name: 'Check item' })[0]);
    expect(notes.updateItem).toHaveBeenCalledWith(8, 100, { checked: true });
  });
});
