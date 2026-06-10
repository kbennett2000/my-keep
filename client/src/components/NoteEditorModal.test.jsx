import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';

const notes = {
  updateNote: vi.fn().mockResolvedValue({}),
  deleteNote: vi.fn().mockResolvedValue({}),
  addItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
};
vi.mock('../notes/NotesContext.jsx', () => ({ useNotes: () => notes }));

import NoteEditorModal from './NoteEditorModal.jsx';

const note = {
  id: 5,
  type: 'text',
  title: 'Old title',
  body: 'body',
  color: 'default',
  pinned: 0,
  labels: [],
  items: [],
  attachments: [],
};

beforeEach(() => Object.values(notes).forEach((fn) => fn.mockClear?.()));

describe('NoteEditorModal', () => {
  test('editing the title and closing PATCHes the changed field', () => {
    const onClose = vi.fn();
    render(<NoteEditorModal note={note} onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'New title' } });
    fireEvent.click(screen.getByText('Close'));
    expect(notes.updateNote).toHaveBeenCalledWith(5, { title: 'New title' });
    expect(onClose).toHaveBeenCalled();
  });

  test('closing without edits does not PATCH', () => {
    const onClose = vi.fn();
    render(<NoteEditorModal note={note} onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(notes.updateNote).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test('Escape closes the modal', () => {
    const onClose = vi.fn();
    render(<NoteEditorModal note={note} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  test('color change persists immediately', () => {
    render(<NoteEditorModal note={note} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change color' }));
    fireEvent.click(screen.getByRole('button', { name: 'green' }));
    expect(notes.updateNote).toHaveBeenCalledWith(5, { color: 'green' });
  });

  test('shows the note timestamp in the toolbar', () => {
    const stamped = { ...note, updated_at: new Date().toISOString() };
    render(<NoteEditorModal note={stamped} onClose={() => {}} />);
    expect(screen.getByText(/^Edited /)).toBeInTheDocument();
  });

  test('deleting asks for confirmation, then deletes and closes', async () => {
    const onClose = vi.fn();
    render(<NoteEditorModal note={note} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' })); // toolbar trash
    expect(notes.deleteNote).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(notes.deleteNote).toHaveBeenCalledWith(5));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
