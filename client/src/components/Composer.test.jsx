import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const notes = { createNote: vi.fn().mockResolvedValue({}) };
vi.mock('../notes/NotesContext.jsx', () => ({ useNotes: () => notes }));

import Composer from './Composer.jsx';

beforeEach(() => notes.createNote.mockClear());

describe('Composer', () => {
  // The body is now a TipTap rich-text editor, which can't be meaningfully typed
  // into under jsdom (formatting is covered by richText + the editor smoke test).
  // Here we exercise the create path via the title; an untouched editor yields an
  // empty body.
  test('creating a text note calls createNote with the title and an empty body', async () => {
    render(<Composer />);
    fireEvent.click(screen.getByText('Take a note…'));
    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'Trip' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() =>
      expect(notes.createNote).toHaveBeenCalledWith({
        type: 'text',
        title: 'Trip',
        body: '',
        color: 'default',
      }),
    );
  });

  test('checklist mode builds an items payload', async () => {
    render(<Composer />);
    fireEvent.click(screen.getByRole('button', { name: 'New list' }));
    const itemInput = screen.getByPlaceholderText('List item');
    fireEvent.change(itemInput, { target: { value: 'Milk' } });
    fireEvent.keyDown(itemInput, { key: 'Enter' });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(notes.createNote).toHaveBeenCalledTimes(1));
    const payload = notes.createNote.mock.calls[0][0];
    expect(payload.type).toBe('list');
    expect(payload.items).toEqual([{ content: 'Milk', checked: false }]);
  });

  test('saving with no content does not create a note', async () => {
    render(<Composer />);
    fireEvent.click(screen.getByText('Take a note…'));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(notes.createNote).not.toHaveBeenCalled());
  });
});
