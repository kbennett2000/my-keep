import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const notes = {
  labels: [
    { id: 1, name: 'work' },
    { id: 2, name: 'home' },
  ],
  assignLabel: vi.fn(),
  unassignLabel: vi.fn(),
  createLabel: vi.fn().mockResolvedValue({ id: 3, name: 'new' }),
};
vi.mock('../notes/NotesContext.jsx', () => ({ useNotes: () => notes }));

import LabelPicker from './LabelPicker.jsx';

// Note already has 'work' (id 1) assigned, not 'home'.
const note = { id: 7, labels: [{ id: 1, name: 'work' }] };

beforeEach(() => {
  notes.assignLabel.mockClear();
  notes.unassignLabel.mockClear();
  notes.createLabel.mockClear();
});

describe('LabelPicker', () => {
  test('toggling an unassigned label assigns it', () => {
    render(<LabelPicker note={note} />);
    fireEvent.click(screen.getByText('home'));
    expect(notes.assignLabel).toHaveBeenCalledWith(7, 2);
  });

  test('toggling an assigned label unassigns it', () => {
    render(<LabelPicker note={note} />);
    fireEvent.click(screen.getByText('work'));
    expect(notes.unassignLabel).toHaveBeenCalledWith(7, 1);
  });

  test('creating a new label creates then assigns it', async () => {
    render(<LabelPicker note={note} />);
    const input = screen.getByPlaceholderText('Create new label');
    fireEvent.change(input, { target: { value: 'urgent' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(notes.createLabel).toHaveBeenCalledWith('urgent'));
    await waitFor(() => expect(notes.assignLabel).toHaveBeenCalledWith(7, 3));
  });
});
