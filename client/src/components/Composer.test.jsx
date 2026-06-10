import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const notes = { createNote: vi.fn().mockResolvedValue({}) };
vi.mock('../notes/NotesContext.jsx', () => ({ useNotes: () => notes }));

import Composer from './Composer.jsx';

beforeEach(() => notes.createNote.mockClear());

describe('Composer', () => {
  test('creating a text note calls createNote with title + body', async () => {
    render(<Composer />);
    fireEvent.click(screen.getByText('Take a note…'));
    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'Trip' } });
    fireEvent.change(screen.getByPlaceholderText('Take a note…'), { target: { value: 'pack bags' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() =>
      expect(notes.createNote).toHaveBeenCalledWith({
        type: 'text',
        title: 'Trip',
        body: 'pack bags',
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
