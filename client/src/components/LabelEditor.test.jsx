import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const notes = {
  labels: [{ id: 1, name: 'work' }],
  createLabel: vi.fn().mockResolvedValue({ id: 2, name: 'home' }),
  renameLabel: vi.fn(),
  deleteLabel: vi.fn(),
};
vi.mock('../notes/NotesContext.jsx', () => ({ useNotes: () => notes }));

import LabelEditor from './LabelEditor.jsx';

beforeEach(() => {
  notes.createLabel.mockClear();
  notes.renameLabel.mockClear();
  notes.deleteLabel.mockClear();
});

describe('LabelEditor', () => {
  test('the create row creates a label', async () => {
    render(<LabelEditor onClose={() => {}} />);
    const input = screen.getByPlaceholderText('Create new label');
    fireEvent.change(input, { target: { value: 'home' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(notes.createLabel).toHaveBeenCalledWith('home'));
  });

  test('renaming a label commits on blur', () => {
    render(<LabelEditor onClose={() => {}} />);
    const input = screen.getByLabelText('Rename work');
    fireEvent.change(input, { target: { value: 'office' } });
    fireEvent.blur(input);
    expect(notes.renameLabel).toHaveBeenCalledWith(1, 'office');
  });

  test('deleting a label calls deleteLabel', () => {
    render(<LabelEditor onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete work' }));
    expect(notes.deleteLabel).toHaveBeenCalledWith(1);
  });

  test('Escape closes the editor', () => {
    const onClose = vi.fn();
    render(<LabelEditor onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
