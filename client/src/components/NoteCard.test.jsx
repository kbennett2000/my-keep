import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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

  test('toolbar pin / archive / delete call the right actions (and not onOpen)', () => {
    const onOpen = vi.fn();
    render(<NoteCard note={textNote} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(notes.updateNote).toHaveBeenCalledWith(7, { pinned: true });
    expect(notes.updateNote).toHaveBeenCalledWith(7, { archived: true });
    expect(notes.deleteNote).toHaveBeenCalledWith(7);
    expect(onOpen).not.toHaveBeenCalled();
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
});
